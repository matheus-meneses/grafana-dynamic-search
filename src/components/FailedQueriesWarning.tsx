import React from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { Alert, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';

interface Props {
  failedQueries: string[];
}

const getStyles = (theme: GrafanaTheme2) => ({
  wrapper: css`
    margin-top: ${theme.spacing(1)};
  `,
});

export const FailedQueriesWarning: React.FC<Props> = ({ failedQueries }) => {
  const styles = useStyles2(getStyles);

  if (failedQueries.length === 0) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <Alert title="Data may be missing" severity="warning">
        The following queries failed to execute: {failedQueries.join(', ')}. Check your data source or query configuration.
      </Alert>
    </div>
  );
};
