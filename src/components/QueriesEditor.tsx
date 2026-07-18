import React, { useCallback, useMemo, memo } from 'react';
import { StandardEditorProps, GrafanaTheme2 } from '@grafana/data';
import {
  IconButton,
  Input,
  useStyles2,
  Icon,
  Combobox,
  ComboboxOption,
  Button,
} from '@grafana/ui';
import { css } from '@emotion/css';
import { SimpleOptions, QueryConfig, QUERY_TYPE, QueryType } from '../types';
import { generateQueryId, buildQuery, compileRegex, queryDedupKey } from '../utils';

const queryTypeOptions = [
  { value: QUERY_TYPE.LABEL_VALUES as QueryType, label: 'Label values' },
  { value: QUERY_TYPE.LABEL_NAMES as QueryType, label: 'Label names' },
  { value: QUERY_TYPE.METRICS as QueryType, label: 'Metrics' },
];

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(1.5)};
  `,
  queryCard: css`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(1)};
    padding: ${theme.spacing(1.5)};
    background: ${theme.colors.background.secondary};
    border: 1px solid ${theme.colors.border.weak};
    border-radius: ${theme.shape.radius.default};
    position: relative;
  `,
  queryCardDuplicate: css`
    border-color: ${theme.colors.warning.border};
  `,
  queryHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${theme.spacing(1)};
  `,
  queryIndex: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    font-weight: ${theme.typography.fontWeightMedium};
    color: ${theme.colors.text.secondary};
    min-width: 70px;
  `,
  fieldRow: css`
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(0.5)};
  `,
  fieldLabel: css`
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.secondary};
  `,
  preview: css`
    padding: ${theme.spacing(0.5, 1)};
    background: ${theme.colors.background.canvas};
    border-radius: ${theme.shape.radius.default};
    font-family: ${theme.typography.fontFamilyMonospace};
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.secondary};
    word-break: break-all;
  `,
  previewEmpty: css`
    color: ${theme.colors.text.disabled};
    font-style: italic;
  `,
  addButton: css`
    align-self: flex-start;
  `,
  duplicateWarning: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(0.5)};
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.warning.text};
  `,
  emptyState: css`
    text-align: center;
    padding: ${theme.spacing(2)};
    color: ${theme.colors.text.disabled};
    font-size: ${theme.typography.bodySmall.fontSize};
  `,
  regexError: css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(0.5)};
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.error.text};
    margin-top: ${theme.spacing(0.5)};
  `,
  queryNameWrapper: css`
    flex: 1;
    margin-right: ${theme.spacing(1)};
    max-width: 300px;
  `,
});

interface Props extends StandardEditorProps<QueryConfig[] | undefined, unknown, SimpleOptions> {}

const QueriesEditorComponent: React.FC<Props> = ({ value, onChange }) => {
  const styles = useStyles2(getStyles);
  const queries: QueryConfig[] = useMemo(() => value ?? [], [value]);

  const duplicateSet = useMemo(() => {
    const seen = new Map<string, number>();
    const dupes = new Set<number>();
    queries.forEach((q, idx) => {
      const key = queryDedupKey(q);
      if (seen.has(key)) {
        dupes.add(seen.get(key)!);
        dupes.add(idx);
      } else {
        seen.set(key, idx);
      }
    });
    return dupes;
  }, [queries]);

  const updateQueries = useCallback(
    (newQueries: QueryConfig[]) => {
      onChange(newQueries);
    },
    [onChange]
  );

  const addQuery = useCallback(() => {
    updateQueries([
      ...queries,
      {
        id: generateQueryId(),
        queryType: QUERY_TYPE.LABEL_VALUES,
        label: '',
        metric: '',
        queryTimeout: undefined,
      },
    ]);
  }, [queries, updateQueries]);

  const removeQuery = useCallback(
    (index: number) => {
      updateQueries(queries.filter((_, i) => i !== index));
    },
    [queries, updateQueries]
  );

  const updateQuery = useCallback(
    (index: number, updates: Partial<QueryConfig>) => {
      const newQueries = queries.map((q, i) => (i === index ? { ...q, ...updates } : q));
      updateQueries(newQueries);
    },
    [queries, updateQueries]
  );

  return (
    <div className={styles.container} data-testid="queries-editor">
      {queries.length === 0 && (
        <div className={styles.emptyState}>
          No queries configured. Add a query to get started.
        </div>
      )}

      {queries.map((query, index) => {
        const isDuplicate = duplicateSet.has(index);
        const previewQuery = buildQuery({
          queryType: query.queryType,
          label: query.label,
          metric: query.metric || '',
        });

        return (
          <div
            key={query.id}
            className={`${styles.queryCard} ${isDuplicate ? styles.queryCardDuplicate : ''}`}
            data-testid={`query-card-${index}`}
          >
            <div className={styles.queryHeader}>
              <div className={styles.queryNameWrapper}>
                <Input
                  value={query.name || ''}
                  placeholder={`Query ${index + 1}`}
                  onChange={(e) => updateQuery(index, { name: e.currentTarget.value })}
                  aria-label={`Query ${index + 1} name`}
                />
              </div>
              <IconButton
                name="trash-alt"
                aria-label={`Remove query ${index + 1}`}
                onClick={() => removeQuery(index)}
                tooltip="Remove query"
                size="sm"
              />
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>Query type</label>
              <Combobox
                options={queryTypeOptions}
                value={query.queryType}
                onChange={(v: ComboboxOption<string> | null) =>
                  updateQuery(index, { queryType: v?.value as QueryType })
                }
              />
            </div>

            {query.queryType === QUERY_TYPE.LABEL_VALUES && (
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>Label *</label>
                <Input
                  value={query.label ?? ''}
                  onChange={(e) =>
                    updateQuery(index, { label: e.currentTarget.value })
                  }
                  placeholder="e.g., job, instance, handler"
                />
              </div>
            )}

            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>
                {query.queryType === QUERY_TYPE.LABEL_VALUES ? 'Metric' : 'Metric (optional)'}
              </label>
              <Input
                value={query.metric}
                onChange={(e) =>
                  updateQuery(index, { metric: e.currentTarget.value })
                }
                placeholder={
                  query.queryType === QUERY_TYPE.LABEL_VALUES
                    ? 'e.g., up, http_requests_total'
                    : 'Leave empty to list all'
                }
              />
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>Regex</label>
              <Input
                value={query.regex ?? ''}
                onChange={(e) =>
                  updateQuery(index, { regex: e.currentTarget.value })
                }
                placeholder="e.g., ^/api/(.*)"
              />
              {query.regex && (() => {
                const { error } = compileRegex(query.regex);
                if (!error) {
                  return null;
                }
                return (
                  <div className={styles.regexError} data-testid={`query-regex-error-${index}`}>
                    <Icon name="exclamation-triangle" size="sm" />
                    <span>Invalid regex: {error}</span>
                  </div>
                );
              })()}
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>Query Timeout (s)</label>
              <Input
                type="number"
                value={query.queryTimeout ?? ''}
                onChange={(e) => {
                  const val = e.currentTarget.value ? parseInt(e.currentTarget.value, 10) : undefined;
                  updateQuery(index, { queryTimeout: val });
                }}
                placeholder="Default (10s)"
              />
            </div>
            <div className={previewQuery ? styles.preview : `${styles.preview} ${styles.previewEmpty}`}>
              {previewQuery || 'Configure query options above'}
            </div>

            {isDuplicate && (
              <div className={styles.duplicateWarning} data-testid={`query-duplicate-warning-${index}`}>
                <Icon name="exclamation-triangle" size="sm" />
                <span>Duplicate query — will be deduplicated at runtime</span>
              </div>
            )}
          </div>
        );
      })}

      <Button
        variant="secondary"
        size="sm"
        icon="plus"
        onClick={addQuery}
        className={styles.addButton}
        data-testid="add-query-button"
      >
        Add query
      </Button>
    </div>
  );
};

export const QueriesEditor = memo(QueriesEditorComponent);
