import { MetricFindValue, SelectableValue } from '@grafana/data';
import { QueryOptions } from './types';

export const MIN_SEARCH_LENGTH = 3;
export const DEBOUNCE_DELAY = 350;

export const buildQuery = (options: QueryOptions): string => {
  const { queryType, label, metric } = options;

  switch (queryType) {
    case 'label_values':
      if (metric && label) {
        return `label_values(${metric}, ${label})`;
      }
      if (label) {
        return `label_values(${label})`;
      }
      return '';
    case 'label_names':
      return metric ? `label_names(${metric})` : 'label_names()';
    case 'metrics':
      return metric ? `metrics(${metric})` : 'metrics(.*)';
    default:
      return '';
  }
};

export const applyRegexTransform = (
  values: MetricFindValue[],
  regex: RegExp | null
): Array<SelectableValue<string>> => {
  const len = values.length;

  if (!regex) {
    const result = new Array<SelectableValue<string>>(len);
    for (let i = 0; i < len; i++) {
      const text = values[i].text ?? '';
      result[i] = { label: text, value: text };
    }
    return result;
  }

  const result = new Array<SelectableValue<string>>(len);
  for (let i = 0; i < len; i++) {
    const text = values[i].text ?? '';
    try {
      const match = text.match(regex);
      if (match && match[1]) {
        result[i] = { label: match[1], value: match[1] };
      } else {
        result[i] = { label: text, value: text };
      }
    } catch {
      result[i] = { label: text, value: text };
    }
  }
  return result;
};
