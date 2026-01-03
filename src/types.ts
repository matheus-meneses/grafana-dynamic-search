export type QueryType = 'label_values' | 'label_names' | 'metrics';

export const SEARCH_MODE = {
    CONTAINS: 'contains',
    STARTS_WITH: 'starts_with',
    EXACT: 'exact',
} as const;

export type SearchMode = (typeof SEARCH_MODE)[keyof typeof SEARCH_MODE];

export interface SimpleOptions {
    datasourceUid?: string;
    queryType: QueryType;
    label?: string;
    metric: string;
    variableName?: string;
    regex?: string;
    minChars?: number;
    maxResults?: number;
    placeholder?: string;
    searchMode?: SearchMode;
}

/** Options required for building a query */
export interface QueryOptions {
    queryType: QueryType;
    label?: string;
    metric: string;
}
