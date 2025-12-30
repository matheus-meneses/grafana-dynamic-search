import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { PanelProps, SelectableValue, GrafanaTheme2 } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css } from '@emotion/css';
import { useStyles2, Combobox, Icon } from '@grafana/ui';
import { getDataSourceSrv, locationService } from '@grafana/runtime';
import { buildQuery, applyRegexTransform, MIN_SEARCH_LENGTH, DEBOUNCE_DELAY } from '../utils';

interface Props extends PanelProps<SimpleOptions> {}

/**
 * Dynamic Search Panel component.
 * Provides a searchable dropdown that queries Prometheus and updates dashboard variables.
 */
const getStyles = (theme: GrafanaTheme2) => {
  return {
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
    `,
    hintError: css`
      display: flex;
      align-items: center;
      gap: ${theme.spacing(0.5)};
      font-size: ${theme.typography.bodySmall.fontSize};
      color: ${theme.colors.error.text};
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
      gap: ${theme.spacing(1)};
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
    warningList: css`
      font-size: ${theme.typography.bodySmall.fontSize};
      color: ${theme.colors.text.secondary};
      text-align: left;
      margin: 0;
      padding-left: ${theme.spacing(2)};
    `,
  };
};

interface ConfigStatus {
  configured: boolean;
  missing: string[];
}

export const DynamicSearchPanel: React.FC<Props> = ({ options, width, height }) => {
  const styles = useStyles2(getStyles);
  const [selectedValue, setSelectedValue] = useState<SelectableValue<string> | null>(null);

  const { datasourceUid, queryType, label, metric, variableName, regex } = options;
  const minChars = options.minChars ?? MIN_SEARCH_LENGTH;
  const maxResults = options.maxResults ?? 0;

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceResolveRef = useRef<(() => void) | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      // Cleanup pending operations on unmount
      abortControllerRef.current?.abort();
      if (debounceResolveRef.current) {
        debounceResolveRef.current();
        debounceResolveRef.current = null;
      }
    };
  }, []);

  const configStatus = useMemo((): ConfigStatus => {
    const missing: string[] = [];

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

    return {
      configured: missing.length === 0,
      missing,
    };
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
    async (inputValue: string) => {
      abortControllerRef.current?.abort();

      if (debounceResolveRef.current) {
        debounceResolveRef.current();
        debounceResolveRef.current = null;
      }

      if (!datasourceUid) {
        return [];
      }

      if (inputValue.length < minChars) {
        return [];
      }

      const currentRequestId = ++requestIdRef.current;

      const shouldProceed = await new Promise<boolean>((resolve) => {
        debounceResolveRef.current = () => resolve(false);
        setTimeout(() => {
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
          return [];
        }

        const query = buildQuery({ queryType, label, metric });
        if (!query) {
          return [];
        }

        const results = await ds.metricFindQuery(query, {});

        if (currentRequestId !== requestIdRef.current || abortControllerRef.current?.signal.aborted) {
          return [];
        }

        let filteredResults = results;
        if (inputValue) {
          const lowerInput = inputValue.toLowerCase();
          filteredResults = results.filter((r) => r.text.toLowerCase().includes(lowerInput));
        }

        if (filteredResults.length === 0) {
          return [];
        }

        let regexFiltered = applyRegexTransform(filteredResults, compiledRegexPattern);

        if (maxResults > 0) {
          regexFiltered = regexFiltered.slice(0, maxResults);
        }

        return regexFiltered.map(r => ({
          label: r.label || r.value || '',
          value: r.value || '',
          description: r.description
        }));
      } catch (err) {
        if (currentRequestId !== requestIdRef.current || abortControllerRef.current?.signal.aborted) {
          return [];
        }
        console.error('Failed to load options:', err);
        return [];
      }
    },
    [datasourceUid, queryType, label, metric, compiledRegex, minChars, maxResults]
  );

  const handleChange = useCallback(
    (item: SelectableValue<string> | null) => {
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

      if (variableName && newValue.value) {
        locationService.partial({ [`var-${variableName}`]: newValue.value }, true);
      }
    },
    [variableName]
  );

  const panelStyle = useMemo(() => ({
    width,
    height,
  }), [width, height]);

  if (!configStatus.configured) {
    return (
      <div
        className={styles.wrapper}
        style={panelStyle}
        data-testid="dynamic-search-panel-config-warning"
      >
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
        <div className={styles.selectContainer} data-testid="dynamic-search-panel-select-container">
          <Combobox
            options={loadOptions}
            onChange={handleChange}
            value={comboboxValue}
            placeholder="Type to search..."
            isClearable
            id="dynamic-search-input"
          />
        </div>

        <div className={styles.footer}>
          {compiledRegex.error ? (
            <div className={styles.hintError} data-testid="dynamic-search-panel-regex-error">
              <Icon name="exclamation-triangle" size="sm" />
              <span>Invalid regex: {compiledRegex.error}</span>
            </div>
          ) : (
            <div className={styles.hint} data-testid="dynamic-search-panel-hint">
              <Icon name="keyboard" size="sm" />
              <span>Min {minChars} chars</span>
              {maxResults > 0 && <span>• Max {maxResults}</span>}
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
