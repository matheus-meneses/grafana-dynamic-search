import React, { memo, useCallback } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { DataSourcePicker } from '@grafana/runtime';

interface Props extends StandardEditorProps<string> {}

const DataSourcePickerEditorComponent: React.FC<Props> = ({ value, onChange }) => {
  const handleChange = useCallback(
    (ds: { uid?: string }) => {
      if (ds.uid) {
        onChange(ds.uid);
      }
    },
    [onChange]
  );

  return (
    <DataSourcePicker
      onChange={handleChange}
      current={value}
      filter={(ds) => ds.type === 'prometheus'}
      noDefault
    />
  );
};

export const DataSourcePickerEditor = memo(DataSourcePickerEditorComponent);
