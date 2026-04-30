export const QUERY_TYPE = {
    LABEL_VALUES: 'label_values',
    LABEL_NAMES: 'label_names',
    METRICS: 'metrics',
} as const;

export type QueryType = (typeof QUERY_TYPE)[keyof typeof QUERY_TYPE];

export const SEARCH_MODE = {
    CONTAINS: 'contains',
    STARTS_WITH: 'starts_with',
    EXACT: 'exact',
} as const;

export type SearchMode = (typeof SEARCH_MODE)[keyof typeof SEARCH_MODE];

/** A single query configuration within the panel */
export interface QueryConfig {
    id: string;
    name?: string;
    queryType: QueryType;
    label?: string;
    metric: string;
    /** Regex pattern to transform results using capture groups */
    regex?: string;
    /** Maximum time in seconds to wait for this specific query (0 for no timeout) */
    queryTimeout?: number;
}

export interface SimpleOptions {
    datasourceUid?: string;
    /** @deprecated Use queries[] instead. Kept for migration from legacy single-query format. */
    queryType?: QueryType;
    /** @deprecated Use queries[] instead. */
    label?: string;
    /** @deprecated Use queries[] instead. */
    metric?: string;
    /** List of query configurations to execute in parallel */
    queries: QueryConfig[];
    variableName?: string;
    /** @deprecated Use queries[].regex instead. Kept for migration. */
    regex?: string;
    minChars?: number;
    maxResults?: number;
    placeholder?: string;
    searchMode?: SearchMode;
    /** @deprecated Use queries[].queryTimeout instead. Kept for migration. */
    queryTimeout?: number;
}

export const DEFAULT_QUERY_TIMEOUT = 10;

export interface TransformedMetricFindValue {
    text?: string;
    value?: string;
    description?: string;
    __originalText?: string;
}

export interface QueryOptions {
    queryType: QueryType;
    label?: string;
    metric: string;
}
