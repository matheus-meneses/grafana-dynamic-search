import { MetricFindValue, SelectableValue } from '@grafana/data';
import { QueryOptions } from './types';

/** Minimum characters required before triggering a search */
export const MIN_SEARCH_LENGTH = 3;

/** Debounce delay in milliseconds for search input */
export const DEBOUNCE_DELAY = 350;

/**
 * Builds a Prometheus query string based on the query type and options.
 * @param options - Query configuration containing queryType, label, and metric
 * @returns The formatted Prometheus query string, or empty string if invalid
 */
export const buildQuery = (options: QueryOptions): string => {
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

/**
 * Transforms metric values using a regex capture group.
 * If regex has a capture group, extracts the first match as the new value.
 * @param values - Array of metric values from Prometheus
 * @param regex - Optional regex pattern with capture group
 * @returns Transformed values as SelectableValue array
 */
export const applyRegexTransform = (
  values: MetricFindValue[],
  regex: RegExp | null
): Array<SelectableValue<string>> => {
  if (!regex) {
    return values.map((v) => {
      const text = v.text ?? '';
      return { label: text, value: text };
    });
  }

  try {
    return values.map((v) => {
      const text = v.text ?? '';
      const match = text.match(regex);
      if (match && match[1]) {
        return { label: match[1], value: match[1] };
      }
      return { label: text, value: text };
    });
  } catch (e) {
    console.error('Invalid regex execution:', e);
    return values.map((v) => {
      const text = v.text ?? '';
      return { label: text, value: text };
    });
  }
};

