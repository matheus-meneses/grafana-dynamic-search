import React from 'react';
import { StandardEditorProps } from '@grafana/data';
import { DataSourcePicker } from '@grafana/runtime';

interface Props extends StandardEditorProps<string> { }

export const DataSourcePickerEditor: React.FC<Props> = ({ value, onChange }) => {
    return (
        <DataSourcePicker
            onChange={(ds) => onChange(ds.uid)}
            current={value}
            filter={(ds) => ds.type === 'prometheus'}
            noDefault
        />
    );
};
