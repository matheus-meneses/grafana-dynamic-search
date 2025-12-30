import { buildQuery, applyRegexTransform } from './utils';
import { MetricFindValue } from '@grafana/data';

/**
 * Performance benchmarks for utility functions.
 * Run with: npm run test:perf
 */
describe('Performance Benchmarks', () => {
  describe('buildQuery', () => {
    it('should execute 10k operations under 50ms', () => {
      const options = { queryType: 'label_values' as const, label: 'job', metric: 'up' };
      
      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        buildQuery(options);
      }
      const duration = performance.now() - start;
      
      console.log(`buildQuery: 10k ops in ${duration.toFixed(2)}ms (${(10000 / duration * 1000).toFixed(0)} ops/sec)`);
      expect(duration).toBeLessThan(50);
    });

    it('should handle all query types efficiently', () => {
      const queryTypes = [
        { queryType: 'label_values' as const, label: 'job', metric: 'up' },
        { queryType: 'label_names' as const, metric: 'up' },
        { queryType: 'metrics' as const, metric: 'http_requests' },
      ];

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        queryTypes.forEach(opt => buildQuery(opt));
      }
      const duration = performance.now() - start;
      
      console.log(`buildQuery (mixed types): 30k ops in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('applyRegexTransform', () => {
    it('should transform 1k items under 100ms', () => {
      const values: MetricFindValue[] = Array(1000).fill(null).map((_, i) => ({
        text: `node-${String(i).padStart(3, '0')}-prod`,
      }));
      const regex = /node-(\d+)/;

      const start = performance.now();
      const result = applyRegexTransform(values, regex);
      const duration = performance.now() - start;

      console.log(`applyRegexTransform: 1k items in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(100);
      expect(result).toHaveLength(1000);
    });

    it('should handle 10k items under 500ms', () => {
      const values: MetricFindValue[] = Array(10000).fill(null).map((_, i) => ({
        text: `pod-${String(i).padStart(5, '0')}-namespace-default`,
      }));
      const regex = /pod-(\d+)-namespace/;

      const start = performance.now();
      const result = applyRegexTransform(values, regex);
      const duration = performance.now() - start;

      console.log(`applyRegexTransform: 10k items in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(500);
      expect(result).toHaveLength(10000);
    });

    it('should be fast without regex (null case)', () => {
      const values: MetricFindValue[] = Array(10000).fill(null).map((_, i) => ({
        text: `value-${i}`,
      }));

      const start = performance.now();
      const result = applyRegexTransform(values, null);
      const duration = performance.now() - start;

      console.log(`applyRegexTransform (no regex): 10k items in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(100);
      expect(result).toHaveLength(10000);
    });

    it('should handle complex regex patterns', () => {
      const values: MetricFindValue[] = Array(1000).fill(null).map((_, i) => ({
        text: `/api/v1/users/${i}/orders/${i * 2}/items`,
      }));
      // Complex regex with multiple groups
      const regex = /\/api\/v\d+\/users\/(\d+)\/orders/;

      const start = performance.now();
      const result = applyRegexTransform(values, regex);
      const duration = performance.now() - start;

      console.log(`applyRegexTransform (complex regex): 1k items in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(200);
      expect(result).toHaveLength(1000);
    });
  });
});

