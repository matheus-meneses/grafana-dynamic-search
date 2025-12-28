import { PanelPlugin } from '@grafana/data';
import { SimpleOptions } from './types';
import { DynamicSearchPanel } from './components/DynamicSearchPanel';
import { MIN_SEARCH_LENGTH } from './utils';

import { DataSourcePickerEditor } from './components/DataSourcePickerEditor';
import { RegexEditor } from './components/RegexEditor';

export const plugin = new PanelPlugin<SimpleOptions>(DynamicSearchPanel).setPanelOptions((builder) => {
  return builder
    .addCustomEditor({
      id: 'datasourceUid',
      path: 'datasourceUid',
      name: 'Datasource *',
      description: 'Select the Prometheus datasource to query',
      editor: DataSourcePickerEditor,
    })
    .addSelect({
      path: 'queryType',
      name: 'Query type',
      description: 'Type of query to execute',
      defaultValue: 'label_values',
      settings: {
        options: [
          { value: 'label_values', label: 'Label values' },
          { value: 'label_names', label: 'Label names' },
          { value: 'metrics', label: 'Metrics' },
        ],
      },
    })
    .addTextInput({
      path: 'label',
      name: 'Label *',
      description: 'Label name to extract values from (e.g., job, handler). Required for Label values query.',
      defaultValue: '',
      showIf: (config) => config.queryType === 'label_values',
    })
    .addTextInput({
      path: 'metric',
      name: 'Metric *',
      description: 'Metric name to filter (e.g., prometheus_http_requests_total)',
      defaultValue: '',
    })
    .addTextInput({
      path: 'variableName',
      name: 'Target Variable *',
      description: 'Dashboard variable to update when a value is selected (without $)',
      defaultValue: '',
    })
    .addNumberInput({
      path: 'minChars',
      name: 'Min Characters',
      description: 'Minimum characters to trigger search',
      defaultValue: MIN_SEARCH_LENGTH,
      settings: {
        min: 0,
        integer: true,
      },
    })
    .addNumberInput({
      path: 'maxResults',
      name: 'Max Results',
      description: 'Maximum number of results to display (0 for unlimited)',
      defaultValue: 0,
      settings: {
        min: 0,
        integer: true,
      },
    })
    .addCustomEditor({
      id: 'regex',
      path: 'regex',
      name: 'Regex',
      description: 'Transform results using regex capture groups',
      editor: RegexEditor,
    });
});
