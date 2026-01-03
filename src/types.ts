export type QueryType = 'label_values' | 'label_names' | 'metrics';

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
}

/** Options required for building a query */
export interface QueryOptions {
    queryType: QueryType;
    label?: string;
    metric: string;
}
