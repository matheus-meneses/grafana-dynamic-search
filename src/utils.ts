import { MetricFindValue, SelectableValue } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { QueryOptions, QueryConfig, QUERY_TYPE } from './types';

export const MIN_SEARCH_LENGTH = 3;
export const DEBOUNCE_DELAY = 350;

let queryIdCounter = 0;

/** Generate a unique ID for a query configuration */
export const generateQueryId = (): string => {
  return `q-${Date.now()}-${++queryIdCounter}`;
};

export const buildQuery = (options: QueryOptions): string => {
  const { queryType, label, metric } = options;

  switch (queryType) {
    case QUERY_TYPE.LABEL_VALUES:
      if (metric && label) {
        return `label_values(${metric}, ${label})`;
      }
      if (label) {
        return `label_values(${label})`;
      }
      return '';
    case QUERY_TYPE.LABEL_NAMES:
      return metric ? `label_names(${metric})` : 'label_names()';
    case QUERY_TYPE.METRICS:
      return metric ? `metrics(${metric})` : 'metrics(.*)';
    default:
      return '';
  }
};

/**
 * Remove duplicate query configurations to avoid redundant API calls.
 * Two queries are considered duplicates if they have the same (queryType, label, metric) tuple.
 */
export const deduplicateQueries = (queries: QueryConfig[]): QueryConfig[] => {
  const seen = new Set<string>();
  const result: QueryConfig[] = [];

  for (const query of queries) {
    const key = `${query.queryType}|${query.label ?? ''}|${query.metric}|${query.queryTimeout ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(query);
    }
  }

  return result;
};

/**
 * Deduplicate MetricFindValue results by their text field.
 * Used after merging results from multiple parallel queries.
 */
export const deduplicateResults = (results: MetricFindValue[]): MetricFindValue[] => {
  const seen = new Set<string>();
  const deduplicated: MetricFindValue[] = [];

  for (const result of results) {
    const text = result.text ?? '';
    if (!seen.has(text)) {
      seen.add(text);
      deduplicated.push(result);
    }
  }

  return deduplicated;
};

export const applyRegexTransform = (
  values: MetricFindValue[],
  regex: RegExp | null
): MetricFindValue[] => {
  const len = values.length;

  if (!regex) {
    return values;
  }

  const result = new Array<MetricFindValue & { __originalText?: string }>(len);
  for (let i = 0; i < len; i++) {
    const item = values[i];
    const text = item.text ?? '';
    try {
      const match = text.match(regex);
      if (match && match[1]) {
        result[i] = { ...item, text: match[1], value: match[1], __originalText: text };
      } else {
        result[i] = item;
      }
    } catch {
      result[i] = item;
    }
  }
  return result;
};

/** Validates that a query config has the minimum required fields */
export const isQueryValid = (q: QueryConfig): boolean => {
  if (!q.metric) {
    return false;
  }
  if (q.queryType === QUERY_TYPE.LABEL_VALUES && !q.label) {
    return false;
  }
  return true;
};

export const getInitialVariableValue = (variableName: string | undefined): SelectableValue<string> | null => {
  if (!variableName) {
    return null;
  }
  try {
    const templateSrv = getTemplateSrv();
    const currentValue = templateSrv.replace(`$${variableName}`);
    if (currentValue && currentValue !== `$${variableName}`) {
      return { label: currentValue, value: currentValue };
    }
  } catch {
    return null;
  }
  return null;
};

export const resolveDatasourceUid = (uid: string | undefined): string | undefined => {
  if (!uid) {
    return undefined;
  }
  if (uid.startsWith('$')) {
    try {
      const templateSrv = getTemplateSrv();
      const resolved = templateSrv.replace(uid);
      if (resolved && resolved !== uid) {
        return resolved;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }
  return uid;
};
