import React, { useState, useCallback, useMemo } from 'react';
import { PanelProps, SelectableValue, GrafanaTheme2 } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css, cx } from '@emotion/css';
import { useStyles2, Combobox, Icon, useTheme2 } from '@grafana/ui';
import { getDataSourceSrv, locationService } from '@grafana/runtime';
import { buildQuery, applyRegexFilter, MIN_SEARCH_LENGTH } from '../utils';

interface Props extends PanelProps<SimpleOptions> {}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    wrapper: css`
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 100%;
      padding: ${theme.spacing(2)};
      background: transparent;
    `,
    searchContainer: css`
      display: flex;
      flex-direction: column;
      gap: ${theme.spacing(1)};
    `,
    selectContainer: css`
      position: relative;
      & > div {
        width: 100%;
      }
    `,
    footer: css`
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: ${theme.spacing(1.5)};
      padding-top: ${theme.spacing(1)};
      border-top: 1px solid ${theme.colors.border.weak};
    `,
    hint: css`
      display: flex;
      align-items: center;
      gap: ${theme.spacing(0.5)};
      font-size: ${theme.typography.bodySmall.fontSize};
      color: ${theme.colors.text.disabled};
    `,
    selectedBadge: css`
      display: inline-flex;
      align-items: center;
      gap: ${theme.spacing(0.5)};
      padding: ${theme.spacing(0.25, 1)};
      background: ${theme.colors.primary.transparent};
      border: 1px solid ${theme.colors.primary.border};
      border-radius: ${theme.shape.radius.pill};
      font-size: ${theme.typography.bodySmall.fontSize};
      color: ${theme.colors.primary.text};
    `,
    configWarning: css`
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      gap: ${theme.spacing(1.5)};
      padding: ${theme.spacing(2)};
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
    warningText: css`
      font-size: ${theme.typography.bodySmall.fontSize};
      color: ${theme.colors.text.secondary};
      max-width: 200px;
    `,
  };
};

export const DynamicSearchPanel: React.FC<Props> = ({ options, width, height }) => {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);
  const [selectedValue, setSelectedValue] = useState<SelectableValue<string> | null>(null);

  const minChars = options.minChars ?? MIN_SEARCH_LENGTH;
  const maxResults = options.maxResults ?? 0;

  // Check if panel is configured
  const isConfigured = useMemo(() => {
    // 1. Datasource is required
    if (!options.datasourceUid) {
        return false;
    }

    // 2. Metric is required (existing logic kept it, user didn't mention it but previously it was required. 
    //    User asked "If query type equals label values, label box is required". 
    //    We should keep metric required as per original logic unless specified otherwise, but strict reading of new rules:
    //    "Datasource is required."
    //    "If query type equals label values, label box is required."
    //    "Target variable is required."
    //    Previous metric check: options.metric. 
    //    Let's keep metric check as it seems fundamental for the query.

    if (!options.metric) {
        return false;
    }

    // 3. Target variable is required
    if (!options.variableName) {
        return false;
    }

    // 4. If query type equals label values, label box is required
    if (options.queryType === 'label_values' && !options.label) {
        return false;
    }

    return true;
  }, [options.datasourceUid, options.metric, options.variableName, options.queryType, options.label]);

  // Compile and validate regex when option changes
  const compiledRegex = useMemo(() => {
    if (!options.regex) {
      return { regex: null, error: null };
    }
    try {
      return { regex: new RegExp(options.regex), error: null };
    } catch (e) {
      return { regex: null, error: (e as Error).message };
    }
  }, [options.regex]);

  const loadOptions = useCallback(
    async (inputValue: string) => {
      const { datasourceUid } = options;
      const { regex } = compiledRegex;

      if (!datasourceUid) {
        return [];
      }

      if (inputValue.length < minChars) {
        return [];
      }

      try {
        const ds = await getDataSourceSrv().get(datasourceUid);

        if (!ds.metricFindQuery) {
          return [];
        }

        const query = buildQuery(options, inputValue);
        if (!query) {
             return [];
        }

        const results = await ds.metricFindQuery(query, {});

        let filteredResults = results;
        if (inputValue) {
          const lowerInput = inputValue.toLowerCase();
          filteredResults = results.filter((r) => r.text.toLowerCase().includes(lowerInput));
        }

        if (filteredResults.length === 0) {
           return [];
        }

        let regexFiltered = applyRegexFilter(filteredResults, regex);

        if (maxResults > 0) {
            regexFiltered = regexFiltered.slice(0, maxResults);
        }

        // Map to valid ComboboxOption (value must be string, not undefined)
        return regexFiltered.map(r => ({
            label: r.label || r.value || '',
            value: r.value || '',
            description: r.description
        }));
      } catch (err) {
        console.error('Failed to load options:', err);
        return [];
      }
    },
    [options, compiledRegex, minChars, maxResults]
  );

  const handleChange = useCallback(
    (item: SelectableValue<string> | null) => {
      // Combobox returns ComboboxOption which is compatible enough if we cast or construct
      if (!item) {
        setSelectedValue(null);
        return;
      }
      
      const newValue: SelectableValue<string> = {
          label: item.label,
          value: item.value,
          description: item.description
      };
      
      setSelectedValue(newValue);

      if (options.variableName && newValue.value) {
        locationService.partial({ [`var-${options.variableName}`]: newValue.value }, true);
      }
    },
    [options.variableName]
  );

  // Show configuration warning if not properly set up
  if (!isConfigured) {
    return (
      <div
        className={cx(
          styles.wrapper,
          css`
            width: ${width}px;
            height: ${height}px;
          `
        )}
        data-testid="dynamic-search-panel-config-warning"
      >
        <div className={styles.configWarning}>
          <Icon name="sliders-v-alt" size="xxl" className={styles.warningIcon} />
          <div className={styles.warningTitle}>Panel not configured</div>
          <div className={styles.warningText}>
            Open panel options to set datasource, query settings, and target variable
          </div>
        </div>
      </div>
    );
  }

  // Combobox requires value to be formatted correctly if object
  const comboboxValue = selectedValue ? { label: selectedValue.label || selectedValue.value || '', value: selectedValue.value || '' } : null;

  return (
    <div
      className={cx(
        styles.wrapper,
        css`
          width: ${width}px;
          height: ${height}px;
        `
      )}
      data-testid="dynamic-search-panel-wrapper"
    >
      <div className={styles.searchContainer}>
        {/* Search dropdown - clean, no header */}
        <div className={styles.selectContainer} data-testid="dynamic-search-panel-select-container">
          <Combobox
            options={loadOptions}
            onChange={handleChange}
            value={comboboxValue}
            placeholder="🔍 Search..."
            isClearable
          />
        </div>

        {/* Footer with hint/error and selected value badge */}
        <div className={styles.footer}>
          {compiledRegex.error ? (
            <div
              className={styles.hint}
              style={{ color: theme.colors.error.text }}
              data-testid="dynamic-search-panel-regex-error"
            >
              <Icon name="exclamation-triangle" size="sm" />
              <span>Invalid regex: {compiledRegex.error}</span>
            </div>
          ) : (
            <div className={styles.hint} data-testid="dynamic-search-panel-hint">
              <Icon name="keyboard" size="sm" />
              <span>Min {minChars} characters</span>
              {maxResults > 0 && <span>• Max {maxResults} results</span>}
            </div>
          )}

          {selectedValue?.value && (
            <div className={styles.selectedBadge} data-testid="dynamic-search-panel-selected-badge">
              <Icon name="check" size="sm" />
              <span>{selectedValue.value}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
