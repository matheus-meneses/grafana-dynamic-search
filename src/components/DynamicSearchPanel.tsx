import React, { useMemo, memo } from 'react';
import { Icon, useStyles2, Combobox } from '@grafana/ui';
import { SimpleOptions, QueryConfig } from '../types';
import { css, keyframes } from '@emotion/css';
import { GrafanaTheme2, PanelProps } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { useDynamicSearch } from '../hooks/useDynamicSearch';
import { FailedQueriesWarning } from './FailedQueriesWarning';
import { SearchResultsList } from './SearchResultsList';
import { ErrorBoundary } from './ErrorBoundary';
import { resolveDatasourceUid, isQueryValid, MIN_SEARCH_LENGTH } from '../utils';

type Props = PanelProps<SimpleOptions>;

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
  searchDetails: css`
    display: flex;
    justify-content: space-between;
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.secondary};
    margin-top: ${theme.spacing(0.5)};
  `,
});

interface ConfigStatus {
  configured: boolean;
  missing: string[];
  warnings: string[];
}

const DynamicSearchPanelComponent = ({ options, width, height }: Props) => {
  const styles = useStyles2(getStyles);
  const { datasourceUid, variableName } = options;
  const queries: QueryConfig[] = useMemo(() => options.queries ?? [], [options.queries]);
  const minChars = options.minChars ?? MIN_SEARCH_LENGTH;
  const maxResults = options.maxResults ?? 0;
  const placeholder = options.placeholder ?? 'Type to search...';

  const resolvedDatasourceUid = useMemo(() => resolveDatasourceUid(datasourceUid), [datasourceUid]);

  const {
    selectedValue,
    isLoading,
    hasSearched,
    lastResultCount,
    failedQueries,
    loadOptions,
    handleChange,
    compiledRegex,
  } = useDynamicSearch({ options, resolvedDatasourceUid });

  const configStatus = useMemo((): ConfigStatus => {
    const missing: string[] = [];
    const warnings: string[] = [];

    if (!datasourceUid) {
      missing.push('Datasource');
    } else if (datasourceUid.startsWith('$') && !resolvedDatasourceUid) {
      warnings.push(`Datasource variable "${datasourceUid}" could not be resolved`);
    }

    if (queries.length === 0) {
      missing.push('At least one query');
    } else {
      const hasValidQuery = queries.some(isQueryValid);
      if (!hasValidQuery) {
        missing.push('At least one valid query (check metric and label fields)');
      }
    }

    if (!variableName) {
      missing.push('Target Variable');
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
  }, [datasourceUid, resolvedDatasourceUid, queries, variableName]);

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
            value={selectedValue?.value ?? null}
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

        <SearchResultsList
          isLoading={isLoading}
          hasSearched={hasSearched}
          lastResultCount={lastResultCount}
          maxResults={maxResults}
          className={styles.searchDetails}
        />
        
        <FailedQueriesWarning failedQueries={failedQueries} />
      </div>
    </div>
  );
};

const MemoizedPanel = memo(DynamicSearchPanelComponent);

export const DynamicSearchPanel = (props: Props) => (
  <ErrorBoundary>
    <MemoizedPanel {...props} />
  </ErrorBoundary>
);
