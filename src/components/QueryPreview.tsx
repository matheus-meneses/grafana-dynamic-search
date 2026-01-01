import React, { memo, useMemo } from 'react';
import { StandardEditorProps, GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { SimpleOptions } from '../types';
import { buildQuery } from '../utils';

const getStyles = (theme: GrafanaTheme2) => ({
  container: css`
    width: 100%;
  `,
  preview: css`
    display: block;
    padding: ${theme.spacing(1)};
    background: ${theme.colors.background.secondary};
    border: 1px solid ${theme.colors.border.weak};
    border-radius: ${theme.shape.radius.default};
    font-family: ${theme.typography.fontFamilyMonospace};
    font-size: ${theme.typography.bodySmall.fontSize};
    color: ${theme.colors.text.primary};
    line-height: 1.5;
  `,
  content: css`
    display: flex;
    align-items: flex-start;
    gap: ${theme.spacing(0.5)};
  `,
  code: css`
    word-break: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
  `,
  empty: css`
    color: ${theme.colors.text.disabled};
    font-style: italic;
  `,
});

interface Props extends StandardEditorProps<undefined, unknown, SimpleOptions> {}

const QueryPreviewComponent: React.FC<Props> = ({ context }) => {
  const styles = useStyles2(getStyles);
  const options = context.options;

  const query = useMemo(() => {
    if (!options) {
      return '';
    }
    return buildQuery({
      queryType: options.queryType,
      label: options.label,
      metric: options.metric || '',
    });
  }, [options]);

  return (
    <div className={styles.container}>
      <div className={styles.preview}>
        <div className={styles.content}>
          {query ? (
            <code className={styles.code}>{query}</code>
          ) : (
            <span className={styles.empty}>Configure query options above</span>
          )}
        </div>
      </div>
    </div>
  );
};

export const QueryPreview = memo(QueryPreviewComponent);

