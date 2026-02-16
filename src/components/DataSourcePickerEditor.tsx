import React, { memo, useCallback, useMemo } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Combobox, ComboboxOption } from '@grafana/ui';
import { getDataSourceSrv, getTemplateSrv } from '@grafana/runtime';

interface Props extends StandardEditorProps<string> {}

const DataSourcePickerEditorComponent: React.FC<Props> = ({ value, onChange }) => {
  const options = useMemo(() => {
    const result: Array<ComboboxOption<string>> = [];

    const dsSrv = getDataSourceSrv();
    const promDatasources = dsSrv.getList({ type: 'prometheus' });

    const prometheusVariables = getTemplateSrv()
      .getVariables()
      .filter((v) => {
        if (v.type !== 'datasource') {
          return false;
        }
        const dsVar = v as { query?: string };
        return dsVar.query === 'prometheus';
      })
      .map((v) => ({
        label: `$${v.name}`,
        value: `$${v.name}`,
        description: 'Dashboard variable',
      }));
    result.push(...prometheusVariables);

    const datasources = promDatasources.map((ds) => ({
      label: ds.name,
      value: ds.uid ?? '',
      description: ds.isDefault ? 'Default' : undefined,
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
