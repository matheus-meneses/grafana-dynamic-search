import { buildQuery, applyRegexTransform, compileRegex, safeMatch, MAX_REGEX_PATTERN_LENGTH, MAX_REGEX_INPUT_LENGTH, deduplicateQueries, deduplicateResults, generateQueryId, isQueryValid, queryDedupKey, getInitialVariableValue, resolveDatasourceUid } from './utils';
import { QueryOptions, QueryType, QueryConfig, QUERY_TYPE } from './types';
import { MetricFindValue } from '@grafana/data';

const mockReplace = jest.fn();
jest.mock('@grafana/runtime', () => ({
  getTemplateSrv: () => ({
    replace: (input: string) => mockReplace(input),
  }),
}));

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

    it('should return the raw query verbatim for raw type', () => {
      const options: QueryOptions = {
        ...defaultOptions,
        queryType: 'raw',
        metric: '',
        rawQuery: 'SHOW TAG VALUES FROM "cpu" WITH KEY = "host"',
      };
      expect(buildQuery(options)).toBe('SHOW TAG VALUES FROM "cpu" WITH KEY = "host"');
    });

    it('should return empty string for raw type with blank query', () => {
      const options: QueryOptions = {
        ...defaultOptions,
        queryType: 'raw',
        metric: '',
        rawQuery: '   ',
      };
      expect(buildQuery(options)).toBe('');
    });

    it('should return empty string for raw type with no query', () => {
      const options: QueryOptions = {
        ...defaultOptions,
        queryType: 'raw',
        metric: '',
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
      expect(result).toEqual(values);
    });

    it('should apply regex capture group', () => {
      const regex = /node-(\d+)/;
      const result = applyRegexTransform(values, regex);
      expect(result).toEqual([
        { text: '01', value: '01', __originalText: 'node-01' },
        { text: '02', value: '02', __originalText: 'node-02' },
        { text: 'other' },
      ]);
    });

    it('should return original value if regex does not match', () => {
      const regex = /nomatch/;
      const result = applyRegexTransform(values, regex);
      expect(result).toEqual(values);
    });

    it('should handle complex regex', () => {
       const regex = /(.*)/;
       const result = applyRegexTransform(values, regex);
       expect(result).toEqual([
         { text: 'node-01', value: 'node-01', __originalText: 'node-01' },
         { text: 'node-02', value: 'node-02', __originalText: 'node-02' },
         { text: 'other', value: 'other', __originalText: 'other' },
       ]);
    });

    it('should handle undefined text gracefully', () => {
        const valuesWithUndefined = [{ text: undefined }] as unknown as MetricFindValue[];
        const result = applyRegexTransform(valuesWithUndefined, null);
        expect(result).toEqual(valuesWithUndefined);
    });

    it('should handle undefined text with regex gracefully', () => {
        const valuesWithUndefined = [{ text: undefined }] as unknown as MetricFindValue[];
        const regex = /test/;
        const result = applyRegexTransform(valuesWithUndefined, regex);
        expect(result).toEqual(valuesWithUndefined);
    });

    it('should preserve description field', () => {
        const valuesWithDescription = [
            { text: 'node-01', description: 'First node' },
            { text: 'node-02' },
        ] as unknown as MetricFindValue[];
        const result = applyRegexTransform(valuesWithDescription, null);
        expect(result).toEqual(valuesWithDescription);
    });

    it('should preserve description field with regex transform', () => {
        const valuesWithDescription = [
            { text: 'node-01', description: 'First node' },
        ] as unknown as MetricFindValue[];
        const regex = /node-(\d+)/;
        const result = applyRegexTransform(valuesWithDescription, regex);
        expect(result[0]).toEqual({ text: '01', value: '01', description: 'First node', __originalText: 'node-01' });
    });
  });

  describe('compileRegex', () => {
    it('should return null regex and null error for empty pattern', () => {
      expect(compileRegex('')).toEqual({ regex: null, error: null });
      expect(compileRegex(undefined)).toEqual({ regex: null, error: null });
      expect(compileRegex(null)).toEqual({ regex: null, error: null });
    });

    it('should compile a valid pattern', () => {
      const { regex, error } = compileRegex('^node-(\\d+)$');
      expect(regex).toBeInstanceOf(RegExp);
      expect(error).toBeNull();
    });

    it('should return an error for an invalid pattern', () => {
      const { regex, error } = compileRegex('(unclosed');
      expect(regex).toBeNull();
      expect(error).toEqual(expect.any(String));
    });

    it('should reject patterns longer than the maximum length', () => {
      const longPattern = 'a'.repeat(MAX_REGEX_PATTERN_LENGTH + 1);
      const { regex, error } = compileRegex(longPattern);
      expect(regex).toBeNull();
      expect(error).toContain('maximum length');
    });
  });

  describe('safeMatch', () => {
    it('should return null when regex is null', () => {
      expect(safeMatch('anything', null)).toBeNull();
    });

    it('should return capture groups for a matching pattern', () => {
      const match = safeMatch('node-42', /node-(\d+)/);
      expect(match?.[1]).toBe('42');
    });

    it('should return null when there is no match', () => {
      expect(safeMatch('abc', /\d+/)).toBeNull();
    });

    it('should cap the tested input length', () => {
      const oversized = 'a'.repeat(MAX_REGEX_INPUT_LENGTH + 5000);
      const match = safeMatch(oversized, /^a+/);
      expect(match?.[0].length).toBe(MAX_REGEX_INPUT_LENGTH);
    });

    it('should not throw when matching raises an error', () => {
      const throwing = {
        [Symbol.match]() {
          throw new Error('boom');
        },
      } as unknown as RegExp;
      expect(safeMatch('anything', throwing)).toBeNull();
    });

    it('should neutralize an over-length pattern before it can execute', () => {
      const pathological = 'a'.repeat(MAX_REGEX_PATTERN_LENGTH + 1);
      const { regex, error } = compileRegex(pathological);
      expect(regex).toBeNull();
      expect(error).toContain('maximum length');

      const start = performance.now();
      const result = safeMatch('a'.repeat(50000), regex);
      const elapsed = performance.now() - start;
      expect(result).toBeNull();
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('queryDedupKey', () => {
    it('should return the same key for configs with identical dedup fields', () => {
      const a: QueryConfig = { id: '1', queryType: 'label_values', label: 'job', metric: 'up' };
      const b: QueryConfig = { id: '2', queryType: 'label_values', label: 'job', metric: 'up' };
      expect(queryDedupKey(a)).toBe(queryDedupKey(b));
    });

    it('should treat undefined and empty label as equal', () => {
      const a: QueryConfig = { id: '1', queryType: 'label_names', metric: 'up' };
      const b: QueryConfig = { id: '2', queryType: 'label_names', label: '', metric: 'up' };
      expect(queryDedupKey(a)).toBe(queryDedupKey(b));
    });

    it('should differ when any dedup field differs', () => {
      const base: QueryConfig = { id: '1', queryType: 'label_values', label: 'job', metric: 'up', queryTimeout: 5 };
      expect(queryDedupKey(base)).not.toBe(queryDedupKey({ ...base, queryType: 'label_names' }));
      expect(queryDedupKey(base)).not.toBe(queryDedupKey({ ...base, label: 'instance' }));
      expect(queryDedupKey(base)).not.toBe(queryDedupKey({ ...base, metric: 'down' }));
      expect(queryDedupKey(base)).not.toBe(queryDedupKey({ ...base, queryTimeout: 10 }));
      expect(queryDedupKey(base)).not.toBe(queryDedupKey({ ...base, rawQuery: 'up' }));
    });

    it('should ignore fields not used for deduplication', () => {
      const a: QueryConfig = { id: '1', queryType: 'metrics', metric: 'up', name: 'First', regex: 'a' };
      const b: QueryConfig = { id: '2', queryType: 'metrics', metric: 'up', name: 'Second', regex: 'b' };
      expect(queryDedupKey(a)).toBe(queryDedupKey(b));
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

  describe('isQueryValid', () => {
    it('should return true for metrics query without metric', () => {
      expect(isQueryValid({ id: '1', queryType: QUERY_TYPE.METRICS, metric: '', name: '' })).toBe(true);
    });

    it('should return true for metrics query with metric', () => {
      expect(isQueryValid({ id: '1', queryType: QUERY_TYPE.METRICS, metric: '.*', name: '' })).toBe(true);
    });

    it('should return true for label_names without metric', () => {
      expect(isQueryValid({ id: '1', queryType: QUERY_TYPE.LABEL_NAMES, metric: '', name: '' })).toBe(true);
    });

    it('should return true for label_names with metric', () => {
      expect(isQueryValid({ id: '1', queryType: QUERY_TYPE.LABEL_NAMES, metric: 'up', name: '' })).toBe(true);
    });

    it('should return true for label_values with only label', () => {
      expect(isQueryValid({ id: '1', queryType: QUERY_TYPE.LABEL_VALUES, metric: '', label: 'job', name: '' })).toBe(true);
    });

    it('should return true for label_values with metric and label', () => {
      expect(isQueryValid({ id: '1', queryType: QUERY_TYPE.LABEL_VALUES, metric: 'up', label: 'job', name: '' })).toBe(true);
    });

    it('should return false for label_values without label', () => {
      expect(isQueryValid({ id: '1', queryType: QUERY_TYPE.LABEL_VALUES, metric: 'up', label: '', name: '' })).toBe(false);
    });

    it('should return true for raw query with a non-empty rawQuery', () => {
      expect(isQueryValid({ id: '1', queryType: QUERY_TYPE.RAW, metric: '', rawQuery: 'label_values(up, job)', name: '' })).toBe(true);
    });

    it('should return false for raw query with a blank rawQuery', () => {
      expect(isQueryValid({ id: '1', queryType: QUERY_TYPE.RAW, metric: '', rawQuery: '  ', name: '' })).toBe(false);
    });

    it('should return false for an unknown query type', () => {
      expect(isQueryValid({ id: '1', queryType: 'invalid' as QueryType, metric: 'up', name: '' })).toBe(false);
    });
  });

  describe('getInitialVariableValue', () => {
    beforeEach(() => {
      mockReplace.mockReset();
    });

    it('should return null if variableName is undefined', () => {
      expect(getInitialVariableValue(undefined)).toBeNull();
    });

    it('should return null if variableName is empty string', () => {
      expect(getInitialVariableValue('')).toBeNull();
    });

    it('should return null if template variable is not resolved', () => {
      mockReplace.mockImplementation((input: string) => input);
      expect(getInitialVariableValue('myVar')).toBeNull();
      expect(mockReplace).toHaveBeenCalledWith('$myVar');
    });

    it('should return SelectableValue when variable resolves', () => {
      mockReplace.mockReturnValue('resolved-value');
      const result = getInitialVariableValue('myVar');
      expect(result).toEqual({ label: 'resolved-value', value: 'resolved-value' });
    });

    it('should return null if getTemplateSrv throws', () => {
      mockReplace.mockImplementation(() => { throw new Error('fail'); });
      expect(getInitialVariableValue('myVar')).toBeNull();
    });
  });

  describe('resolveDatasourceUid', () => {
    beforeEach(() => {
      mockReplace.mockReset();
    });

    it('should return undefined for empty uid', () => {
      expect(resolveDatasourceUid(undefined)).toBeUndefined();
      expect(resolveDatasourceUid('')).toBeUndefined();
    });

    it('should return uid as-is if it does not start with $', () => {
      expect(resolveDatasourceUid('abc-123')).toBe('abc-123');
    });

    it('should resolve template variable uid', () => {
      mockReplace.mockReturnValue('resolved-uid');
      expect(resolveDatasourceUid('$ds')).toBe('resolved-uid');
      expect(mockReplace).toHaveBeenCalledWith('$ds');
    });

    it('should return undefined if variable does not resolve', () => {
      mockReplace.mockImplementation((input: string) => input);
      expect(resolveDatasourceUid('$ds')).toBeUndefined();
    });

    it('should return undefined if getTemplateSrv throws', () => {
      mockReplace.mockImplementation(() => { throw new Error('fail'); });
      expect(resolveDatasourceUid('$ds')).toBeUndefined();
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
