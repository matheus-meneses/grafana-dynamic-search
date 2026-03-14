import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { SelectableValue } from '@grafana/data';
import { getDataSourceSrv, locationService } from '@grafana/runtime';
import { SimpleOptions, SEARCH_MODE, QueryConfig, DEFAULT_QUERY_TIMEOUT } from '../types';
import {
  buildQuery,
  applyRegexTransform,
  deduplicateQueries,
  deduplicateResults,
  isQueryValid,
  getInitialVariableValue,
  MIN_SEARCH_LENGTH,
  DEBOUNCE_DELAY,
} from '../utils';

interface UseDynamicSearchArgs {
  options: SimpleOptions;
  resolvedDatasourceUid: string | undefined;
}

export const useDynamicSearch = ({ options, resolvedDatasourceUid }: UseDynamicSearchArgs) => {
  const { variableName, regex } = options;
  const queries: QueryConfig[] = useMemo(() => options.queries ?? [], [options.queries]);
  const minChars = options.minChars ?? MIN_SEARCH_LENGTH;
  const maxResults = options.maxResults ?? 0;
  const searchMode = options.searchMode ?? SEARCH_MODE.CONTAINS;

  const [selectedValue, setSelectedValue] = useState<SelectableValue<string> | null>(() =>
    getInitialVariableValue(variableName)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastResultCount, setLastResultCount] = useState<number | null>(null);
  const [failedQueries, setFailedQueries] = useState<string[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceResolveRef = useRef<((value: boolean) => void) | null>(null);
  const requestIdRef = useRef(0);
  const lastInputValueRef = useRef<string>('');

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (debounceResolveRef.current) {
        debounceResolveRef.current(false);
        debounceResolveRef.current = null;
      }
    };
  }, []);

  const compiledRegex = useMemo(() => {
    if (!regex) {
      return { regex: null, error: null };
    }
    try {
      return { regex: new RegExp(regex), error: null };
    } catch (e) {
      return { regex: null, error: (e as Error).message };
    }
  }, [regex]);

  const loadOptions = useCallback(
    async (inputValue: string): Promise<Array<{ label: string; value: string; description?: string }>> => {
      abortControllerRef.current?.abort();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      if (debounceResolveRef.current) {
        debounceResolveRef.current(false);
        debounceResolveRef.current = null;
      }

      const wasTyping = lastInputValueRef.current.length > 0;
      const isNowEmpty = inputValue === '';
      
      if (wasTyping && isNowEmpty && selectedValue) {
        setSelectedValue(null);
        if (variableName) {
          locationService.partial({ [`var-${variableName}`]: '' }, true);
        }
      }
      
      lastInputValueRef.current = inputValue;

      if (!resolvedDatasourceUid || inputValue.length < minChars) {
        setIsLoading(false);
        setHasSearched(false);
        setLastResultCount(null);
        return [];
      }

      const currentRequestId = ++requestIdRef.current;

      const shouldProceed = await new Promise<boolean>((resolve) => {
        debounceResolveRef.current = resolve;
        debounceTimeoutRef.current = setTimeout(() => {
          debounceTimeoutRef.current = null;
          debounceResolveRef.current = null;
          resolve(true);
        }, DEBOUNCE_DELAY);
      });

      if (!shouldProceed || currentRequestId !== requestIdRef.current) {
        return [];
      }

      setIsLoading(true);
      abortControllerRef.current = new AbortController();
      try {
        const ds = await getDataSourceSrv().get(resolvedDatasourceUid);

        if (currentRequestId !== requestIdRef.current || abortControllerRef.current?.signal.aborted) {
          return [];
        }

        if (!ds.metricFindQuery) {
          setIsLoading(false);
          return [];
        }

        const validQueries = queries.filter(isQueryValid);
        const uniqueQueries = deduplicateQueries(validQueries);

        if (uniqueQueries.length === 0) {
          setIsLoading(false);
          return [];
        }

        const queryPromises = uniqueQueries.map((queryConfig) => {
          const queryStr = buildQuery({ queryType: queryConfig.queryType, label: queryConfig.label, metric: queryConfig.metric });
          if (!queryStr) {
            return Promise.resolve({ results: [], failedName: null });
          }

          const queryName = queryConfig.name || `Query ${queries.indexOf(queryConfig) + 1}`;
          const queryPromise = ds.metricFindQuery!(queryStr, {}).then((results) => {
            let compiledQueryRegex: RegExp | null = null;
            if (queryConfig.regex) {
                try {
                    compiledQueryRegex = new RegExp(queryConfig.regex);
                } catch (e) {
                    console.warn(`Invalid regex in query "${queryName}":`, e);
                }
            } else if (regex) {
                try {
                    compiledQueryRegex = new RegExp(regex);
                } catch (e) {}
            }
            const transformed = applyRegexTransform(results, compiledQueryRegex);
            return { results: transformed, failedName: null };
          });
          const timeout = queryConfig.queryTimeout ?? DEFAULT_QUERY_TIMEOUT;
          
          if (timeout > 0) {
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Query timed out after ${timeout}s`)), timeout * 1000)
            );
            return Promise.race([queryPromise, timeoutPromise])
              .catch((err) => {
                console.warn(`Query "${queryName}" (${queryStr}) failed:`, err.message);
                return { results: [], failedName: queryName };
              });
          }
          return queryPromise
            .catch((err) => {
              console.warn(`Query "${queryName}" (${queryStr}) failed:`, err.message);
              return { results: [], failedName: queryName };
            });
        });

        const allSettled = await Promise.all(queryPromises);

        if (currentRequestId !== requestIdRef.current || abortControllerRef.current?.signal.aborted) {
          return [];
        }

        const failedNames = allSettled.map(r => r.failedName).filter((name): name is string => name !== null);
        setFailedQueries(failedNames);

        const mergedResults = deduplicateResults(allSettled.flatMap(r => r.results));

        let filteredResults = mergedResults;
        if (inputValue) {
          const lowerInput = inputValue.toLowerCase();
          filteredResults = mergedResults.filter((r: any) => {
            const textToFilter = (r.__originalText || r.text || '').toLowerCase();
            switch (searchMode) {
              case SEARCH_MODE.STARTS_WITH:
                return textToFilter.startsWith(lowerInput);
              case SEARCH_MODE.EXACT:
                return textToFilter === lowerInput;
              case SEARCH_MODE.CONTAINS:
              default:
                return textToFilter.includes(lowerInput);
            }
          });
        }

        setHasSearched(true);
        setIsLoading(false);

        if (filteredResults.length === 0) {
          setLastResultCount(0);
          return [];
        }

        let transformed = filteredResults;

        if (maxResults > 0) {
          transformed = transformed.slice(0, maxResults);
        }

        setLastResultCount(transformed.length);

        return transformed
          .map((r) => {
            const val = r.value !== undefined ? String(r.value) : r.text;
            return {
              label: r.text || val || '',
              value: val || '',
              description: (r as SelectableValue<string>).description,
            };
          })
          .filter((r) => typeof r.value === 'string' && r.value !== '');
      } catch (err) {
        if (currentRequestId !== requestIdRef.current || abortControllerRef.current?.signal.aborted) {
          return [];
        }
        console.error('Failed to load options:', err);
        setIsLoading(false);
        setHasSearched(true);
        setLastResultCount(0);
        return [];
      }
    },
    [resolvedDatasourceUid, queries, regex, minChars, maxResults, searchMode, selectedValue, variableName]
  );

  const handleChange = useCallback(
    (option: { label?: string; value: string; description?: string } | null) => {
      lastInputValueRef.current = '';
      if (!option) {
        setSelectedValue(null);
        if (variableName) {
          locationService.partial({ [`var-${variableName}`]: '' }, true);
        }
        return;
      }
      const newValue: SelectableValue<string> = {
        label: option.label,
        value: option.value,
        description: option.description,
      };
      setSelectedValue(newValue);
      if (variableName && newValue.value) {
        locationService.partial({ [`var-${variableName}`]: newValue.value }, true);
      }
    },
    [variableName]
  );

  return {
    selectedValue,
    setSelectedValue,
    isLoading,
    hasSearched,
    lastResultCount,
    failedQueries,
    loadOptions,
    handleChange,
    compiledRegex,
  };
};
