import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { PanelProps, SelectableValue, GrafanaTheme2 } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css, keyframes } from '@emotion/css';
import { useStyles2, Combobox, Icon } from '@grafana/ui';
import { getDataSourceSrv, locationService, getTemplateSrv } from '@grafana/runtime';
import { buildQuery, applyRegexTransform, MIN_SEARCH_LENGTH, DEBOUNCE_DELAY } from '../utils';
import { ErrorBoundary } from './ErrorBoundary';

interface Props extends PanelProps<SimpleOptions> {}

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
`;

const getStyles = (theme: GrafanaTheme2) => ({
  wrapper: css`
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: ${theme.spacing(2)};
    background: transparent;
    overflow: hidden;
  `,
  searchContainer: css`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(1)};
    animation: ${fadeIn} 0.2s ease-out;
  `,
  selectContainer: css`
    position: relative;
    & > div {
      width: 100%;
    }
  `,
  loadingOverlay: css`
    position: absolute;
    right: ${theme.spacing(4)};
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    gap: ${theme.spacing(0.5)};
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.bodySmall.fontSize};
    animation: ${pulse} 1.5s ease-in-out infinite;
    pointer-events: none;
    z-index: 1;
  `,
  footer: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: ${theme.spacing(1)};
    padding-top: ${theme.spacing(0.5)};
    min-height: 24px;
  `,
  hint: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(0.5)};
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.disabled};
    transition: color 0.2s ease;
  `,
  hintActive: css`
    color: ${theme.colors.text.secondary};
  `,
  hintError: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(0.5)};
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.error.text};
    animation: ${fadeIn} 0.2s ease-out;
  `,
  selectedBadge: css`
    display: inline-flex;
    align-items: center;
    gap: ${theme.spacing(0.5)};
    padding: ${theme.spacing(0.25, 1)};
    background: ${theme.colors.primary.transparent};
    border: 1px solid ${theme.colors.primary.border};
    border-radius: ${theme.shape.radius.default};
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.primary.text};
    animation: ${fadeIn} 0.15s ease-out;
    max-width: 100%;
    word-break: break-all;
    text-align: right;
  `,
  configWarning: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    gap: ${theme.spacing(1)};
    padding: ${theme.spacing(2)};
    animation: ${fadeIn} 0.3s ease-out;
  `,
  warningIcon: css`
    color: ${theme.colors.warning.main};
    opacity: 0.8;
  `,
  warningTitle: css`
    font-size: ${theme.typography.body.fontSize};
    font-weight: ${theme.typography.fontWeightMedium};
    color: ${theme.colors.text.primary};
  `,
  warningList: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.secondary};
    text-align: left;
    margin: 0;
    padding-left: ${theme.spacing(2)};
    & li {
      margin-bottom: ${theme.spacing(0.25)};
    }
  `,
  noResults: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(0.5)};
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.disabled};
    font-style: italic;
  `,
  warningBanner: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(0.5)};
    padding: ${theme.spacing(0.5, 1)};
    margin-bottom: ${theme.spacing(1)};
    background: ${theme.colors.warning.transparent};
    border: 1px solid ${theme.colors.warning.border};
    border-radius: ${theme.shape.radius.default};
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.warning.text};
    animation: ${fadeIn} 0.2s ease-out;
  `,
});

interface ConfigStatus {
  configured: boolean;
  missing: string[];
  warnings: string[];
}

const DynamicSearchPanelComponent: React.FC<Props> = ({ options, width, height }) => {
  const styles = useStyles2(getStyles);
  const [selectedValue, setSelectedValue] = useState<SelectableValue<string> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastResultCount, setLastResultCount] = useState<number | null>(null);

  const { datasourceUid, queryType, label, metric, variableName, regex } = options;
  const minChars = options.minChars ?? MIN_SEARCH_LENGTH;
  const maxResults = options.maxResults ?? 0;
  const placeholder = options.placeholder ?? 'Type to search...';

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceResolveRef = useRef<((value: boolean) => void) | null>(null);
  const requestIdRef = useRef(0);

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

  const configStatus = useMemo((): ConfigStatus => {
    const missing: string[] = [];
    const warnings: string[] = [];

    if (!datasourceUid) {
      missing.push('Datasource');
    }
    if (!metric) {
      missing.push('Metric');
    }
    if (!variableName) {
      missing.push('Target Variable');
    }
    if (queryType === 'label_values' && !label) {
      missing.push('Label (required for Label Values query)');
    }

    if (variableName) {
      try {
        const templateSrv = getTemplateSrv();
        const variables = templateSrv.getVariables();
        const variableExists = variables.some((v) => v.name === variableName);
        if (!variableExists) {
          warnings.push(`Variable "${variableName}" not found in dashboard`);
        }
      } catch {
        // Template service not available, skip check
      }
    }

    return { configured: missing.length === 0, missing, warnings };
  }, [datasourceUid, metric, variableName, queryType, label]);

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

      if (!datasourceUid || inputValue.length < minChars) {
        setIsLoading(false);
        setHasSearched(false);
        setLastResultCount(null);
        return [];
      }

      const currentRequestId = ++requestIdRef.current;
      setIsLoading(true);

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

      abortControllerRef.current = new AbortController();
      const { regex: compiledRegexPattern } = compiledRegex;

      try {
        const ds = await getDataSourceSrv().get(datasourceUid);

        if (currentRequestId !== requestIdRef.current || abortControllerRef.current?.signal.aborted) {
          return [];
        }

        if (!ds.metricFindQuery) {
          setIsLoading(false);
          return [];
        }

        const query = buildQuery({ queryType, label, metric });
        if (!query) {
          setIsLoading(false);
          return [];
        }

        const results = await ds.metricFindQuery(query, {});

        if (currentRequestId !== requestIdRef.current || abortControllerRef.current?.signal.aborted) {
          return [];
        }

        let filteredResults = results;
        if (inputValue) {
          const lowerInput = inputValue.toLowerCase();
          filteredResults = results.filter((r) => r.text?.toLowerCase().includes(lowerInput));
        }

        setHasSearched(true);
        setIsLoading(false);

        if (filteredResults.length === 0) {
          setLastResultCount(0);
          return [];
        }

        let transformed = applyRegexTransform(filteredResults, compiledRegexPattern);

        if (maxResults > 0) {
          transformed = transformed.slice(0, maxResults);
        }

        setLastResultCount(transformed.length);

        return transformed
          .filter((r): r is typeof r & { value: string } => typeof r.value === 'string' && r.value !== '')
          .map((r) => ({
            label: r.label || r.value,
            value: r.value,
            description: r.description,
          }));
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
    [datasourceUid, queryType, label, metric, compiledRegex, minChars, maxResults]
  );

  const handleChange = useCallback(
    (item: SelectableValue<string> | null) => {
      if (!item) {
        setSelectedValue(null);
        if (variableName) {
          locationService.partial({ [`var-${variableName}`]: '' }, true);
        }
        return;
      }
      const newValue: SelectableValue<string> = {
        label: item.label,
        value: item.value,
        description: item.description,
      };
      setSelectedValue(newValue);
      if (variableName && newValue.value) {
        locationService.partial({ [`var-${variableName}`]: newValue.value }, true);
      }
    },
    [variableName]
  );

  const panelStyle = useMemo(
    () => ({
      width,
      height,
    }),
    [width, height]
  );

  if (!configStatus.configured) {
    return (
      <div className={styles.wrapper} style={panelStyle} data-testid="dynamic-search-panel-config-warning">
        <div className={styles.configWarning}>
          <Icon name="sliders-v-alt" size="xl" className={styles.warningIcon} />
          <div className={styles.warningTitle}>Configuration required</div>
          <ul className={styles.warningList}>
            {configStatus.missing.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const comboboxValue = selectedValue
    ? { label: selectedValue.label || selectedValue.value || '', value: selectedValue.value || '' }
    : null;

  return (
    <div
      className={styles.wrapper}
      style={panelStyle}
      data-testid="dynamic-search-panel-wrapper"
      role="search"
      aria-label="Dynamic search panel"
    >
      <div className={styles.searchContainer}>
        {configStatus.warnings.length > 0 && (
          <div className={styles.warningBanner} data-testid="dynamic-search-panel-variable-warning">
            <Icon name="exclamation-triangle" size="sm" />
            <span>{configStatus.warnings[0]}</span>
          </div>
        )}
        <div className={styles.selectContainer} data-testid="dynamic-search-panel-select-container">
          <Combobox
            options={loadOptions}
            onChange={handleChange}
            value={comboboxValue}
            placeholder={placeholder}
            isClearable
            id="dynamic-search-input"
          />
          {isLoading && (
            <div className={styles.loadingOverlay} data-testid="dynamic-search-panel-loading">
              <Icon name="spinner" size="sm" />
              <span>Searching...</span>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          {compiledRegex.error ? (
            <div className={styles.hintError} data-testid="dynamic-search-panel-regex-error">
              <Icon name="exclamation-triangle" size="sm" />
              <span>Invalid regex: {compiledRegex.error}</span>
            </div>
          ) : hasSearched && lastResultCount === 0 ? (
            <div className={styles.noResults} data-testid="dynamic-search-panel-no-results">
              <Icon name="search" size="sm" />
              <span>No results found</span>
            </div>
          ) : (
            <div
              className={`${styles.hint} ${isLoading ? styles.hintActive : ''}`}
              data-testid="dynamic-search-panel-hint"
            >
              <Icon name="keyboard" size="sm" />
              <span>Min {minChars} chars</span>
              {maxResults > 0 && <span>• Max {maxResults}</span>}
            </div>
          )}

          {selectedValue?.value && (
            <div
              className={styles.selectedBadge}
              data-testid="dynamic-search-panel-selected-badge"
              title={selectedValue.value}
            >
              <Icon name="check" size="sm" />
              <span>{selectedValue.value}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MemoizedPanel = memo(DynamicSearchPanelComponent);

export const DynamicSearchPanel: React.FC<Props> = (props) => (
  <ErrorBoundary>
    <MemoizedPanel {...props} />
  </ErrorBoundary>
);
