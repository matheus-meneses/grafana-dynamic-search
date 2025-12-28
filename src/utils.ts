import { MetricFindValue, SelectableValue } from '@grafana/data';
import { SimpleOptions } from './types';

export const MIN_SEARCH_LENGTH = 3;

// Helper function to build the query based on options
export const buildQuery = (options: SimpleOptions, searchInput: string): string => {
  const { queryType, label, metric } = options;

  switch (queryType) {
    case 'label_values':
      if (metric && label) {
        return `label_values(${metric}, ${label})`;
      } else if (label) {
        return `label_values(${label})`;
      }
      return '';
    case 'label_names':
      if (metric) {
        return `label_names(${metric})`;
      }
      return 'label_names()';
    case 'metrics':
      if (metric) {
        return `metrics(${metric})`;
      }
      return 'metrics(.*)';
    default:
      return '';
  }
};

// Helper function to apply regex transformation to results (not filtering)
export const applyRegexFilter = (
  values: MetricFindValue[],
  regex: RegExp | null
): Array<SelectableValue<string>> => {
  if (!regex) {
    return values.map((v) => ({ label: v.text, value: v.text as string }));
  }

  try {
    return values.map((v) => {
      const text = v.text as string;
      const match = text.match(regex);
      if (match && match[1]) {
        return { label: match[1], value: match[1] };
      }
      return { label: text, value: text };
    });
  } catch (e) {
    console.error('Invalid regex execution:', e);
    return values.map((v) => ({ label: v.text, value: v.text as string }));
  }
};

