import { PanelPlugin } from '@grafana/data';
import { SimpleOptions, SEARCH_MODE, QUERY_TYPE, QueryType, SearchMode } from './types';
import { DynamicSearchPanel } from './components/DynamicSearchPanel';
import { MIN_SEARCH_LENGTH, generateQueryId } from './utils';

import { DataSourcePickerEditor } from './components/DataSourcePickerEditor';
import { RegexEditor } from './components/RegexEditor';
import { QueriesEditor } from './components/QueriesEditor';

export const plugin = new PanelPlugin<SimpleOptions>(DynamicSearchPanel)
  .setMigrationHandler((panel) => {
    const options = panel.options as SimpleOptions & Record<string, unknown>;

    // Migrate legacy single-query fields to queries array
    if (!options.queries || options.queries.length === 0) {
      const legacyQueryType = options.queryType ?? QUERY_TYPE.LABEL_VALUES;
      const legacyLabel = options.label;
      const legacyMetric = options.metric ?? '';

      if (legacyMetric || legacyLabel) {
        options.queries = [
          {
            id: generateQueryId(),
            queryType: legacyQueryType as QueryType,
            label: legacyLabel as string | undefined,
            metric: legacyMetric as string,
          },
        ];
      } else {
        options.queries = [];
      }

      delete options.queryType;
      delete options.label;
      delete options.metric;
    }

    // Migrate global queryTimeout to per-query timeout if applicable
    if (options.queryTimeout !== undefined) {
      if (options.queries) {
        options.queries.forEach((q) => {
          if (q.queryTimeout === undefined) {
            q.queryTimeout = options.queryTimeout;
          }
        });
      }
      delete options.queryTimeout;
    }

    return options as SimpleOptions;
  })
  .setPanelOptions((builder) => {
    return builder
      .addCustomEditor({
        id: 'datasourceUid',
        path: 'datasourceUid',
        name: 'Datasource *',
        description: 'Select the datasource to query (Prometheus-style types support the built-in query builder; use Raw for any datasource)',
        editor: DataSourcePickerEditor,
        category: ['Data Source'],
      })
      .addCustomEditor({
        id: 'queries',
        path: 'queries',
        name: '',
        description: '',
        editor: QueriesEditor,
        defaultValue: [],
        category: ['Queries'],
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
        defaultValue: SEARCH_MODE.CONTAINS as SearchMode,
        settings: {
          options: [
            { value: SEARCH_MODE.CONTAINS as SearchMode, label: 'Contains' },
            { value: SEARCH_MODE.STARTS_WITH as SearchMode, label: 'Starts with' },
            { value: SEARCH_MODE.EXACT as SearchMode, label: 'Exact match' },
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
