import { PanelPlugin } from '@grafana/data';
import { SimpleOptions, SEARCH_MODE, QUERY_TYPE } from './types';
import { DynamicSearchPanel } from './components/DynamicSearchPanel';
import { MIN_SEARCH_LENGTH } from './utils';

import { DataSourcePickerEditor } from './components/DataSourcePickerEditor';
import { RegexEditor } from './components/RegexEditor';
import { QueryPreview } from './components/QueryPreview';

export const plugin = new PanelPlugin<SimpleOptions>(DynamicSearchPanel).setPanelOptions((builder) => {
  return builder
    .addCustomEditor({
      id: 'datasourceUid',
      path: 'datasourceUid',
      name: 'Datasource *',
      description: 'Select the Prometheus datasource to query',
      editor: DataSourcePickerEditor,
      category: ['Data Source'],
    })
    .addSelect({
      path: 'queryType',
      name: 'Query type',
      description: 'Type of query to execute',
      defaultValue: QUERY_TYPE.LABEL_VALUES,
      settings: {
        options: [
          { value: QUERY_TYPE.LABEL_VALUES, label: 'Label values' },
          { value: QUERY_TYPE.LABEL_NAMES, label: 'Label names' },
          { value: QUERY_TYPE.METRICS, label: 'Metrics' },
        ],
      },
      category: ['Query'],
    })
    .addTextInput({
      path: 'label',
      name: 'Label *',
      description: 'Label name to extract values from. Required for Label values query.',
      defaultValue: '',
      showIf: (config) => config.queryType === QUERY_TYPE.LABEL_VALUES,
      category: ['Query'],
      settings: {
        placeholder: 'e.g., job, instance, handler',
      },
    })
    .addTextInput({
      path: 'metric',
      name: 'Metric *',
      description: 'Metric name to filter',
      defaultValue: '',
      category: ['Query'],
      settings: {
        placeholder: 'e.g., up, http_requests_total',
      },
    })
    .addCustomEditor({
      id: 'queryPreview',
      path: 'queryPreview',
      name: 'Query Preview',
      description: 'The PromQL query that will be executed',
      editor: QueryPreview,
      category: ['Query'],
    })
    .addTextInput({
      path: 'variableName',
      name: 'Target Variable *',
      description: 'Dashboard variable to update when a value is selected (without $)',
      defaultValue: '',
      category: ['Variable'],
      settings: {
        placeholder: 'e.g., selected_job',
      },
    })
    .addTextInput({
      path: 'placeholder',
      name: 'Placeholder',
      description: 'Custom placeholder text for the search input',
      defaultValue: 'Type to search...',
      category: ['Display'],
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
      category: ['Display'],
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
      category: ['Display'],
    })
    .addSelect({
      path: 'searchMode',
      name: 'Search Mode',
      description: 'How to match search input against results',
      defaultValue: SEARCH_MODE.CONTAINS,
      settings: {
        options: [
          { value: SEARCH_MODE.CONTAINS, label: 'Contains' },
          { value: SEARCH_MODE.STARTS_WITH, label: 'Starts with' },
          { value: SEARCH_MODE.EXACT, label: 'Exact match' },
        ],
      },
      category: ['Display'],
    })
    .addCustomEditor({
      id: 'regex',
      path: 'regex',
      name: 'Regex',
      description: 'Transform results using regex capture groups',
      editor: RegexEditor,
      category: ['Transform'],
    });
});
