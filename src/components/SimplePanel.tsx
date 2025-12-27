import React, { useState, useCallback, useMemo } from 'react';
import { PanelProps, SelectableValue, GrafanaTheme2 } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css, cx } from '@emotion/css';
import { useStyles2, AsyncSelect, Icon, useTheme2 } from '@grafana/ui';
import { getDataSourceSrv, locationService } from '@grafana/runtime';

interface Props extends PanelProps<SimpleOptions> { }

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

// Helper function to build the query based on options
const buildQuery = (options: SimpleOptions, searchInput: string): string => {
  const { queryType, label, metric } = options;

  switch (queryType) {
    case 'label_values':
      if (metric && label) {
        return `label_values(${metric}, ${label})`;
      } else if (label) {
        return `label_values(${label})`;
      }
      return '';
    case 'label_names':
      if (metric) {
        return `label_names(${metric})`;
      }
      return 'label_names()';
    case 'metrics':
      if (metric) {
        return `metrics(${metric})`;
      }
      return 'metrics(.*)';
    default:
      return '';
  }
};

// Helper function to apply regex transformation to results (not filtering)
const applyRegexFilter = (
  values: Array<{ text: string; value?: string }>,
  regex: string | undefined
): Array<SelectableValue<string>> => {
  if (!regex) {
    return values.map((v) => ({ label: v.text, value: v.text }));
  }

  try {
    const re = new RegExp(regex);
    return values.map((v) => {
      const match = v.text.match(re);
      if (match && match[1]) {
        return { label: match[1], value: match[1] };
      }
      return { label: v.text, value: v.text };
    });
  } catch (e) {
    console.error('Invalid regex:', e);
    return values.map((v) => ({ label: v.text, value: v.text }));
  }
};

export const SimplePanel: React.FC<Props> = ({ options, width, height }) => {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);
  const [selectedValue, setSelectedValue] = useState<SelectableValue<string> | null>(null);

  // Check if panel is configured
  const isConfigured = useMemo(() => {
    return options.datasourceUid && options.metric;
  }, [options.datasourceUid, options.metric]);

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
    async (inputValue: string): Promise<Array<SelectableValue<string>>> => {
      const { datasourceUid, regex } = options;

      if (!datasourceUid) {
        return [{ label: 'Please select a datasource', value: '', isDisabled: true }];
      }

      if (inputValue.length < 3) {
        return [{ label: 'Type at least 3 characters...', value: '', isDisabled: true }];
      }

      try {
        const ds = await getDataSourceSrv().get(datasourceUid);

        if (!ds.metricFindQuery) {
          return [{ label: 'Datasource does not support queries', value: '', isDisabled: true }];
        }

        const query = buildQuery(options, inputValue);
        if (!query) {
          return [{ label: 'Configure query options', value: '', isDisabled: true }];
        }

        const results = await ds.metricFindQuery(query, {});

        let filteredResults = results;
        if (inputValue) {
          const lowerInput = inputValue.toLowerCase();
          filteredResults = results.filter((r) =>
            r.text.toLowerCase().includes(lowerInput)
          );
        }

        if (filteredResults.length === 0) {
          return [{ label: 'No results found', value: '', isDisabled: true }];
        }

        return applyRegexFilter(filteredResults, regex);
      } catch (err) {
        console.error('Failed to load options:', err);
        return [{ label: 'Failed to load results', value: '', isDisabled: true }];
      }
    },
    [options]
  );

  const handleChange = useCallback(
    (value: SelectableValue<string>) => {
      setSelectedValue(value);

      if (options.variableName && value?.value) {
        locationService.partial({ [`var-${options.variableName}`]: value.value }, true);
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
      >
        <div className={styles.configWarning}>
          <Icon name="sliders-v-alt" size="xxl" className={styles.warningIcon} />
          <div className={styles.warningTitle}>Panel not configured</div>
          <div className={styles.warningText}>
            Open panel options to set datasource and query settings
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cx(
        styles.wrapper,
        css`
          width: ${width}px;
          height: ${height}px;
        `
      )}
    >
      <div className={styles.searchContainer}>
        {/* Search dropdown - clean, no header */}
        <div className={styles.selectContainer}>
          <AsyncSelect
            loadOptions={loadOptions}
            onChange={handleChange}
            value={selectedValue}
            defaultOptions={false}
            placeholder="🔍 Search..."
            menuPosition="fixed"
            isClearable
            cacheOptions={false}
          />
        </div>

        {/* Footer with hint/error and selected value badge */}
        <div className={styles.footer}>
          {compiledRegex.error ? (
            <div className={styles.hint} style={{ color: theme.colors.error.text }}>
              <Icon name="exclamation-triangle" size="sm" />
              <span>Invalid regex: {compiledRegex.error}</span>
            </div>
          ) : (
            <div className={styles.hint}>
              <Icon name="keyboard" size="sm" />
              <span>Min 3 characters</span>
            </div>
          )}

          {selectedValue?.value && (
            <div className={styles.selectedBadge}>
              <Icon name="check" size="sm" />
              <span>{selectedValue.value}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
