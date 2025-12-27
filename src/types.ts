export type QueryType = 'label_values' | 'label_names' | 'metrics';

export interface SimpleOptions {
    datasourceUid?: string;
    queryType: QueryType;
    label?: string;
    metric: string;
    variableName?: string;
    regex?: string;
}
