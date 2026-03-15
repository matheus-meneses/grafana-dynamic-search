import React from 'react';
import { Alert } from '@grafana/ui';

interface Props {
  failedQueries: string[];
}

export const FailedQueriesWarning: React.FC<Props> = ({ failedQueries }) => {
  if (failedQueries.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '8px' }}>
      <Alert title="Data may be missing" severity="warning">
        The following queries failed to execute: {failedQueries.join(', ')}. Check your data source or query configuration.
      </Alert>
    </div>
  );
};
