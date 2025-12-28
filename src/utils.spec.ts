import { buildQuery, applyRegexFilter } from './utils';
import { SimpleOptions, QueryType } from './types';
import { MetricFindValue } from '@grafana/data';

const defaultOptions: SimpleOptions = {
    queryType: 'label_values',
    metric: '',
    minChars: 3,
    maxResults: 0
};

describe('utils', () => {
  describe('buildQuery', () => {
    it('should build label_values query with metric and label', () => {
      const options: SimpleOptions = {
        ...defaultOptions,
        queryType: 'label_values',
        metric: 'up',
        label: 'job',
      };
      expect(buildQuery(options, '')).toBe('label_values(up, job)');
    });

    it('should build label_values query with only label', () => {
      const options: SimpleOptions = {
        ...defaultOptions,
        queryType: 'label_values',
        metric: '',
        label: 'job',
      };
      expect(buildQuery(options, '')).toBe('label_values(job)');
    });

    it('should return empty string for label_values without label', () => {
      const options: SimpleOptions = {
        ...defaultOptions,
        queryType: 'label_values',
        metric: 'up',
        label: '',
      };
      expect(buildQuery(options, '')).toBe('');
    });

    it('should build label_names query with metric', () => {
      const options: SimpleOptions = {
        ...defaultOptions,
        queryType: 'label_names',
        metric: 'up',
      } as SimpleOptions;
      expect(buildQuery(options, '')).toBe('label_names(up)');
    });

    it('should build label_names query without metric', () => {
      const options: SimpleOptions = {
        ...defaultOptions,
        queryType: 'label_names',
        metric: '',
      } as SimpleOptions;
      expect(buildQuery(options, '')).toBe('label_names()');
    });

    it('should build metrics query with metric', () => {
      const options: SimpleOptions = {
        ...defaultOptions,
        queryType: 'metrics',
        metric: 'up',
      } as SimpleOptions;
      expect(buildQuery(options, '')).toBe('metrics(up)');
    });

    it('should build metrics query without metric', () => {
      const options: SimpleOptions = {
        ...defaultOptions,
        queryType: 'metrics',
        metric: '',
      } as SimpleOptions;
      expect(buildQuery(options, '')).toBe('metrics(.*)');
    });

    it('should return empty string for invalid query type', () => {
        const options: SimpleOptions = {
            ...defaultOptions,
            queryType: 'invalid' as QueryType,
        };
        expect(buildQuery(options, '')).toBe('');
    });
  });

  describe('applyRegexFilter', () => {
    const values: MetricFindValue[] = [
      { text: 'node-01' },
      { text: 'node-02' },
      { text: 'other' },
    ];

    it('should return original values if no regex provided', () => {
      const result = applyRegexFilter(values, null);
      expect(result).toEqual([
        { label: 'node-01', value: 'node-01' },
        { label: 'node-02', value: 'node-02' },
        { label: 'other', value: 'other' },
      ]);
    });

    it('should apply regex capture group', () => {
      const regex = /node-(\d+)/;
      const result = applyRegexFilter(values, regex);
      expect(result).toEqual([
        { label: '01', value: '01' },
        { label: '02', value: '02' },
        { label: 'other', value: 'other' },
      ]);
    });

    it('should return original value if regex does not match', () => {
      const regex = /nomatch/;
      const result = applyRegexFilter(values, regex);
      expect(result).toEqual([
        { label: 'node-01', value: 'node-01' },
        { label: 'node-02', value: 'node-02' },
        { label: 'other', value: 'other' },
      ]);
    });

    it('should handle complex regex', () => {
       const regex = /(.*)/;
       const result = applyRegexFilter(values, regex);
       expect(result).toEqual([
         { label: 'node-01', value: 'node-01' },
         { label: 'node-02', value: 'node-02' },
         { label: 'other', value: 'other' },
       ]);
    });

    it('should handle error during regex execution gracefully', () => {
        // Suppress console.error for this test
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const regex = /test/;
        // Force an error by passing an object without text property, casting to trigger the try/catch
        const invalidValues = [{ text: undefined }] as unknown as MetricFindValue[];
        
        const result = applyRegexFilter(invalidValues, regex);
        
        expect(result).toEqual([{ label: undefined, value: undefined }]);
        expect(consoleSpy).toHaveBeenCalledWith('Invalid regex execution:', expect.any(Error));
        
        consoleSpy.mockRestore();
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
