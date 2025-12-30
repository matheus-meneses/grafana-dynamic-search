import { buildQuery, applyRegexTransform } from './utils';
import { QueryOptions, QueryType } from './types';
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
        { label: 'node-01', value: 'node-01' },
        { label: 'node-02', value: 'node-02' },
        { label: 'other', value: 'other' },
      ]);
    });

    it('should apply regex capture group', () => {
      const regex = /node-(\d+)/;
      const result = applyRegexTransform(values, regex);
      expect(result).toEqual([
        { label: '01', value: '01' },
        { label: '02', value: '02' },
        { label: 'other', value: 'other' },
      ]);
    });

    it('should return original value if regex does not match', () => {
      const regex = /nomatch/;
      const result = applyRegexTransform(values, regex);
      expect(result).toEqual([
        { label: 'node-01', value: 'node-01' },
        { label: 'node-02', value: 'node-02' },
        { label: 'other', value: 'other' },
      ]);
    });

    it('should handle complex regex', () => {
       const regex = /(.*)/;
       const result = applyRegexTransform(values, regex);
       expect(result).toEqual([
         { label: 'node-01', value: 'node-01' },
         { label: 'node-02', value: 'node-02' },
         { label: 'other', value: 'other' },
       ]);
    });

    it('should handle undefined text gracefully', () => {
        const valuesWithUndefined = [{ text: undefined }] as unknown as MetricFindValue[];
        const result = applyRegexTransform(valuesWithUndefined, null);
        expect(result).toEqual([{ label: '', value: '' }]);
    });

    it('should handle undefined text with regex gracefully', () => {
        const valuesWithUndefined = [{ text: undefined }] as unknown as MetricFindValue[];
        const regex = /test/;
        const result = applyRegexTransform(valuesWithUndefined, regex);
        expect(result).toEqual([{ label: '', value: '' }]);
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
