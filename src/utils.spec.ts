import { buildQuery, applyRegexTransform, deduplicateQueries, deduplicateResults, generateQueryId } from './utils';
import { QueryOptions, QueryType, QueryConfig } from './types';
import { MetricFindValue } from '@grafana/data';

const defaultOptions: QueryOptions = {
    queryType: 'label_values',
    metric: '',
};

describe('utils', () => {
  describe('buildQuery', () => {
    it('should build label_values query with metric and label', () => {
      const options: QueryOptions = {
        ...defaultOptions,
        queryType: 'label_values',
        metric: 'up',
        label: 'job',
      };
      expect(buildQuery(options)).toBe('label_values(up, job)');
    });

    it('should build label_values query with only label', () => {
      const options: QueryOptions = {
        ...defaultOptions,
        queryType: 'label_values',
        metric: '',
        label: 'job',
      };
      expect(buildQuery(options)).toBe('label_values(job)');
    });

    it('should return empty string for label_values without label', () => {
      const options: QueryOptions = {
        ...defaultOptions,
        queryType: 'label_values',
        metric: 'up',
        label: '',
      };
      expect(buildQuery(options)).toBe('');
    });

    it('should build label_names query with metric', () => {
      const options: QueryOptions = {
        ...defaultOptions,
        queryType: 'label_names',
        metric: 'up',
      };
      expect(buildQuery(options)).toBe('label_names(up)');
    });

    it('should build label_names query without metric', () => {
      const options: QueryOptions = {
        ...defaultOptions,
        queryType: 'label_names',
        metric: '',
      };
      expect(buildQuery(options)).toBe('label_names()');
    });

    it('should build metrics query with metric', () => {
      const options: QueryOptions = {
        ...defaultOptions,
        queryType: 'metrics',
        metric: 'up',
      };
      expect(buildQuery(options)).toBe('metrics(up)');
    });

    it('should build metrics query without metric', () => {
      const options: QueryOptions = {
        ...defaultOptions,
        queryType: 'metrics',
        metric: '',
      };
      expect(buildQuery(options)).toBe('metrics(.*)');
    });

    it('should return empty string for invalid query type', () => {
        const options: QueryOptions = {
            ...defaultOptions,
            queryType: 'invalid' as QueryType,
        };
        expect(buildQuery(options)).toBe('');
    });
  });

  describe('applyRegexTransform', () => {
    const values: MetricFindValue[] = [
      { text: 'node-01' },
      { text: 'node-02' },
      { text: 'other' },
    ];

    it('should return original values if no regex provided', () => {
      const result = applyRegexTransform(values, null);
      expect(result).toEqual([
        { label: 'node-01', value: 'node-01', description: undefined },
        { label: 'node-02', value: 'node-02', description: undefined },
        { label: 'other', value: 'other', description: undefined },
      ]);
    });

    it('should apply regex capture group', () => {
      const regex = /node-(\d+)/;
      const result = applyRegexTransform(values, regex);
      expect(result).toEqual([
        { label: '01', value: '01', description: undefined },
        { label: '02', value: '02', description: undefined },
        { label: 'other', value: 'other', description: undefined },
      ]);
    });

    it('should return original value if regex does not match', () => {
      const regex = /nomatch/;
      const result = applyRegexTransform(values, regex);
      expect(result).toEqual([
        { label: 'node-01', value: 'node-01', description: undefined },
        { label: 'node-02', value: 'node-02', description: undefined },
        { label: 'other', value: 'other', description: undefined },
      ]);
    });

    it('should handle complex regex', () => {
       const regex = /(.*)/;
       const result = applyRegexTransform(values, regex);
       expect(result).toEqual([
         { label: 'node-01', value: 'node-01', description: undefined },
         { label: 'node-02', value: 'node-02', description: undefined },
         { label: 'other', value: 'other', description: undefined },
       ]);
    });

    it('should handle undefined text gracefully', () => {
        const valuesWithUndefined = [{ text: undefined }] as unknown as MetricFindValue[];
        const result = applyRegexTransform(valuesWithUndefined, null);
        expect(result).toEqual([{ label: '', value: '', description: undefined }]);
    });

    it('should handle undefined text with regex gracefully', () => {
        const valuesWithUndefined = [{ text: undefined }] as unknown as MetricFindValue[];
        const regex = /test/;
        const result = applyRegexTransform(valuesWithUndefined, regex);
        expect(result).toEqual([{ label: '', value: '', description: undefined }]);
    });

    it('should preserve description field', () => {
        const valuesWithDescription = [
            { text: 'node-01', description: 'First node' },
            { text: 'node-02' },
        ] as unknown as MetricFindValue[];
        const result = applyRegexTransform(valuesWithDescription, null);
        expect(result[0].description).toBe('First node');
        expect(result[1].description).toBeUndefined();
    });

    it('should preserve description field with regex transform', () => {
        const valuesWithDescription = [
            { text: 'node-01', description: 'First node' },
        ] as unknown as MetricFindValue[];
        const regex = /node-(\d+)/;
        const result = applyRegexTransform(valuesWithDescription, regex);
        expect(result[0]).toEqual({ label: '01', value: '01', description: 'First node' });
    });
  });

  describe('deduplicateQueries', () => {
    it('should remove queries with identical (queryType, label, metric)', () => {
      const queries: QueryConfig[] = [
        { id: '1', queryType: 'label_values', label: 'job', metric: 'up' },
        { id: '2', queryType: 'label_values', label: 'job', metric: 'up' },
        { id: '3', queryType: 'label_values', label: 'instance', metric: 'up' },
      ];
      const result = deduplicateQueries(queries);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });

    it('should keep queries with different query types', () => {
      const queries: QueryConfig[] = [
        { id: '1', queryType: 'label_values', label: 'job', metric: 'up' },
        { id: '2', queryType: 'label_names', metric: 'up' },
      ];
      const result = deduplicateQueries(queries);
      expect(result).toHaveLength(2);
    });

    it('should keep queries with different metrics', () => {
      const queries: QueryConfig[] = [
        { id: '1', queryType: 'label_values', label: 'job', metric: 'up' },
        { id: '2', queryType: 'label_values', label: 'job', metric: 'http_requests_total' },
      ];
      const result = deduplicateQueries(queries);
      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty input', () => {
      expect(deduplicateQueries([])).toEqual([]);
    });

    it('should handle single query', () => {
      const queries: QueryConfig[] = [
        { id: '1', queryType: 'label_values', label: 'job', metric: 'up' },
      ];
      const result = deduplicateQueries(queries);
      expect(result).toHaveLength(1);
    });

    it('should treat undefined and empty label differently', () => {
      const queries: QueryConfig[] = [
        { id: '1', queryType: 'label_names', metric: 'up' },
        { id: '2', queryType: 'label_names', label: '', metric: 'up' },
      ];
      const result = deduplicateQueries(queries);
      expect(result).toHaveLength(1);
    });
  });

  describe('deduplicateResults', () => {
    it('should remove duplicate results by text', () => {
      const results: MetricFindValue[] = [
        { text: 'value1' },
        { text: 'value2' },
        { text: 'value1' },
        { text: 'value3' },
      ];
      const deduplicated = deduplicateResults(results);
      expect(deduplicated).toHaveLength(3);
      expect(deduplicated.map(r => r.text)).toEqual(['value1', 'value2', 'value3']);
    });

    it('should handle empty input', () => {
      expect(deduplicateResults([])).toEqual([]);
    });

    it('should handle all unique results', () => {
      const results: MetricFindValue[] = [
        { text: 'a' },
        { text: 'b' },
        { text: 'c' },
      ];
      const deduplicated = deduplicateResults(results);
      expect(deduplicated).toHaveLength(3);
    });

    it('should handle all duplicate results', () => {
      const results: MetricFindValue[] = [
        { text: 'same' },
        { text: 'same' },
        { text: 'same' },
      ];
      const deduplicated = deduplicateResults(results);
      expect(deduplicated).toHaveLength(1);
    });

    it('should handle undefined text', () => {
      const results = [
        { text: undefined },
        { text: undefined },
      ] as unknown as MetricFindValue[];
      const deduplicated = deduplicateResults(results);
      expect(deduplicated).toHaveLength(1);
    });
  });

  describe('generateQueryId', () => {
    it('should return a string', () => {
      expect(typeof generateQueryId()).toBe('string');
    });

    it('should return unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateQueryId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('environment setup', () => {
    it('should have matchMedia mock', () => {
        const mql = window.matchMedia('(min-width: 400px)');
        expect(mql.matches).toBe(false);
        expect(mql.media).toBe('(min-width: 400px)');
    });
  });
});
