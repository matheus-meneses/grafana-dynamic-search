import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { SelectableValue } from '@grafana/data';
import { getDataSourceSrv, locationService } from '@grafana/runtime';
import { SimpleOptions, SEARCH_MODE, QueryConfig, TransformedMetricFindValue, DEFAULT_QUERY_TIMEOUT } from '../types';
import {
  buildQuery,
  applyRegexTransform,
  compileRegex,
  CompiledRegex,
  deduplicateQueries,
  deduplicateResults,
  isQueryValid,
  getInitialVariableValue,
  queryDedupKey,
  MIN_SEARCH_LENGTH,
  DEBOUNCE_DELAY,
} from '../utils';

interface UseDynamicSearchArgs {
  options: SimpleOptions;
  resolvedDatasourceUid: string | undefined;
}

type LoadOptionsResult = Array<{ label: string; value: string; description?: string }>;

interface CacheEntry {
  expires: number;
  value: LoadOptionsResult;
}

const MAX_CACHE_ENTRIES = 100;

export const useDynamicSearch = ({ options, resolvedDatasourceUid }: UseDynamicSearchArgs) => {
  const { variableName, regex } = options;
  const queries: QueryConfig[] = useMemo(() => options.queries ?? [], [options.queries]);
  const minChars = options.minChars ?? MIN_SEARCH_LENGTH;
  const maxResults = options.maxResults ?? 0;
  const searchMode = options.searchMode ?? SEARCH_MODE.CONTAINS;
  const cacheTtl = options.cacheTtl ?? 0;

  const [selectedValue, setSelectedValue] = useState<SelectableValue<string> | null>(() =>
    getInitialVariableValue(variableName)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastResultCount, setLastResultCount] = useState<number | null>(null);
  const [failedQueries, setFailedQueries] = useState<string[]>([]);

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceResolveRef = useRef<((value: boolean) => void) | null>(null);
  const requestIdRef = useRef(0);
  const lastInputValueRef = useRef<string>('');
  const selectedValueRef = useRef(selectedValue);

  useEffect(() => {
    selectedValueRef.current = selectedValue;
  }, [selectedValue]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (debounceResolveRef.current) {
        debounceResolveRef.current(false);
        debounceResolveRef.current = null;
      }
    };
  }, []);

  const compiledRegex = useMemo(() => compileRegex(regex), [regex]);

  const compiledRegexRef = useRef(compiledRegex);

  useEffect(() => {
    compiledRegexRef.current = compiledRegex;
  }, [compiledRegex]);

  const perQueryRegexes = useMemo(() => {
    const map = new Map<string, CompiledRegex>();
    queries.forEach((query) => {
      map.set(query.id, compileRegex(query.regex));
    });
    return map;
  }, [queries]);

  const queryIndexById = useMemo(() => {
    const map = new Map<string, number>();
    queries.forEach((query, index) => {
      map.set(query.id, index);
    });
    return map;
  }, [queries]);

  const queriesSignature = useMemo(
    () => queries.map((q) => `${queryDedupKey(q)}~${q.regex ?? ''}`).join('||'),
    [queries]
  );

  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  useEffect(() => {
    cacheRef.current.clear();
  }, [resolvedDatasourceUid, queriesSignature, searchMode, maxResults, regex]);

  const loadOptions = useCallback(
    async (inputValue: string): Promise<Array<{ label: string; value: string; description?: string }>> => {
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
      
      if (wasTyping && isNowEmpty && selectedValueRef.current) {
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

      return new Promise<boolean>((resolve) => {
        debounceResolveRef.current = resolve;
        debounceTimeoutRef.current = setTimeout(() => {
          debounceTimeoutRef.current = null;
          debounceResolveRef.current = null;
          resolve(true);
        }, DEBOUNCE_DELAY);
      }).then(async (shouldProceed) => {
        if (!shouldProceed || currentRequestId !== requestIdRef.current) {
          return [];
        }

        if (cacheTtl > 0) {
          const cached = cacheRef.current.get(inputValue);
          if (cached && cached.expires > Date.now()) {
            setFailedQueries([]);
            setHasSearched(true);
            setLastResultCount(cached.value.length);
            setIsLoading(false);
            return cached.value;
          }
        }

        setIsLoading(true);
        try {
          const ds = await getDataSourceSrv().get(resolvedDatasourceUid);

          if (currentRequestId !== requestIdRef.current) {
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

            const queryName = queryConfig.name || `Query ${(queryIndexById.get(queryConfig.id) ?? 0) + 1}`;
            const queryPromise = ds.metricFindQuery!(queryStr, {}).then((results) => {
              let activeRegex: RegExp | null = null;
              if (queryConfig.regex) {
                  const compiled = perQueryRegexes.get(queryConfig.id);
                  if (compiled?.error) {
                      console.warn(`Invalid regex in query "${queryName}": ${compiled.error}`);
                  }
                  activeRegex = compiled?.regex ?? null;
              } else {
                  activeRegex = compiledRegexRef.current.regex;
              }
              const transformed = applyRegexTransform(results, activeRegex);
              return { results: transformed, failedName: null };
            });
            const timeout = queryConfig.queryTimeout ?? DEFAULT_QUERY_TIMEOUT;
            
            if (timeout > 0) {
              let timeoutId: ReturnType<typeof setTimeout>;
              const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error(`Query timed out after ${timeout}s`)), timeout * 1000);
              });
              return Promise.race([queryPromise, timeoutPromise])
                .then((result) => { clearTimeout(timeoutId); return result; })
                .catch((err) => {
                  clearTimeout(timeoutId);
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

          if (currentRequestId !== requestIdRef.current) {
            return [];
          }

          const failedNames = allSettled.map(r => r.failedName).filter((name): name is string => name !== null);
          setFailedQueries(failedNames);

          const cacheResult = (value: LoadOptionsResult) => {
            if (cacheTtl > 0 && failedNames.length === 0) {
              if (cacheRef.current.size >= MAX_CACHE_ENTRIES) {
                const oldestKey = cacheRef.current.keys().next().value;
                if (oldestKey !== undefined) {
                  cacheRef.current.delete(oldestKey);
                }
              }
              cacheRef.current.set(inputValue, { expires: Date.now() + cacheTtl * 1000, value });
            }
            return value;
          };

          const mergedResults = deduplicateResults(allSettled.flatMap(r => r.results));

          let filteredResults = mergedResults;
          if (inputValue) {
            const lowerInput = inputValue.toLowerCase();
            filteredResults = mergedResults.filter((r: TransformedMetricFindValue) => {
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
            return cacheResult([]);
          }

          let transformed = filteredResults;

          if (maxResults > 0) {
            transformed = transformed.slice(0, maxResults);
          }

          setLastResultCount(transformed.length);

          const mapped = transformed
            .map((r) => {
              const val = r.value !== undefined ? String(r.value) : r.text;
              return {
                label: r.text || val || '',
                value: val || '',
                description: r.description,
              };
            })
            .filter((r) => typeof r.value === 'string' && r.value !== '');

          return cacheResult(mapped);
        } catch (err) {
          if (currentRequestId !== requestIdRef.current) {
            return [];
          }
          console.error('Failed to load options:', err);
          setIsLoading(false);
          setHasSearched(true);
          setLastResultCount(0);
          return [];
        }
      });
    },
    [resolvedDatasourceUid, queries, minChars, maxResults, searchMode, variableName, perQueryRegexes, queryIndexById, cacheTtl]
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
