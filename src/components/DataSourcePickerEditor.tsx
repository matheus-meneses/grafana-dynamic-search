import React, { memo, useCallback, useMemo } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Combobox, ComboboxOption } from '@grafana/ui';
import { getDataSourceSrv, getTemplateSrv } from '@grafana/runtime';

interface Props extends StandardEditorProps<string> {}

const DataSourcePickerEditorComponent: React.FC<Props> = ({ value, onChange }) => {
  const options = useMemo(() => {
    const result: Array<ComboboxOption<string>> = [];

    const dsSrv = getDataSourceSrv();
    const allDatasources = dsSrv.getList();

    const datasourceVariables = getTemplateSrv()
      .getVariables()
      .filter((v) => v.type === 'datasource')
      .map((v) => ({
        label: `$${v.name}`,
        value: `$${v.name}`,
        description: 'Dashboard variable',
      }));
    result.push(...datasourceVariables);

    const datasources = allDatasources.map((ds) => ({
      label: ds.name,
      value: ds.uid ?? '',
      description: ds.isDefault ? `Default • ${ds.type}` : ds.type,
    }));
    result.push(...datasources);

    return result;
  }, []);

  const handleChange = useCallback(
    (option: ComboboxOption<string> | null) => {
      if (option?.value) {
        onChange(option.value);
      }
    },
    [onChange]
  );

  return (
    <Combobox
      options={options}
      value={value}
      onChange={handleChange}
      placeholder="Select data source"
    />
  );
};

export const DataSourcePickerEditor = memo(DataSourcePickerEditorComponent);
