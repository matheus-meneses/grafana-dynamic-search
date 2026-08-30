import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DynamicSearchPanel } from './DynamicSearchPanel';
import { PanelProps, LoadingState } from '@grafana/data';
import { SimpleOptions, SEARCH_MODE } from '../types';

const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

const mockGetDataSourceSrv = jest.fn();
const mockLocationService = {
  partial: jest.fn(),
};
const mockGetVariables = jest.fn();
const mockReplace = jest.fn();

jest.mock('@grafana/runtime', () => ({
  getDataSourceSrv: () => ({
    get: mockGetDataSourceSrv,
  }),
  locationService: {
    partial: (...args: unknown[]) => mockLocationService.partial(...args),
  },
  getTemplateSrv: () => ({
    getVariables: () => mockGetVariables(),
    replace: (input: string) => mockReplace(input),
  }),
}));

jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  Combobox: ({ onChange, value, options, placeholder, isClearable }: {
    onChange: (option: { label?: string; value: string; description?: string } | null) => void;
    value: string | null;
    options: ((input: string) => Promise<Array<{ label: string; value: string; description?: string }>>) | Array<{ label: string; value: string }>;
    placeholder?: string;
    isClearable?: boolean;
  }) => {
    const [opts, setOpts] = React.useState<Array<{ label: string; value: string; description?: string }>>([]);

    const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        if (typeof options === 'function') {
            const res = await options(inputValue);
            setOpts(Array.isArray(res) ? res : []);
        }
    };

    const handleClear = () => {
        if (typeof options === 'function') {
            options('');
        }
        onChange(null);
    };

    return (
      <div data-testid="combobox-mock">
        <input 
            data-testid="combobox-input" 
            placeholder={placeholder}
            onChange={handleInput} 
        />
        {isClearable && <button data-testid="combobox-clear" onClick={handleClear}>Clear</button>}
        <div data-testid="combobox-options">
            {opts.map((o: any) => (
                <div 
                    key={o.value} 
                    data-testid={`option-${o.value}`}
                    onClick={() => onChange(o)}
                >
                    {o.label}
                </div>
            ))}
        </div>
        <div data-testid="combobox-value">{value || ''}</div>
      </div>
    );
  },
  Icon: ({ name }: any) => <div data-testid={`icon-${name}`} />,
}));

const defaultOptions: SimpleOptions = {
    datasourceUid: 'ds-123',
    queries: [
        {
            id: 'q-1',
            queryType: 'label_values',
            label: 'job',
            metric: 'up',
        },
    ],
    variableName: 'testVar',
    minChars: 3,
    maxResults: 10,
    regex: '',
};

const defaultProps: PanelProps<SimpleOptions> = {
  id: 1,
  data: {
    state: LoadingState.Done,
    series: [],
    timeRange: {} as any,
  },
  timeRange: {} as any,
  timeZone: 'browser',
  options: defaultOptions,
  onOptionsChange: jest.fn(),
  renderCounter: 0,
  width: 300,
  height: 200,
  title: 'Test Panel',
  transparent: false,
  eventBus: {} as any,
  replaceVariables: (s: string) => s,
  fieldConfig: {} as any,
  onFieldConfigChange: jest.fn(),
  onChangeTimeRange: jest.fn(),
};

describe('DynamicSearchPanel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetVariables.mockReturnValue([{ name: 'testVar', type: 'query' }]);
        mockReplace.mockImplementation((input: string) => input);
    });

    it('renders config warning when datasource is missing', async () => {
        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, datasourceUid: undefined }} />);
        expect(await screen.findByTestId('dynamic-search-panel-config-warning')).toBeInTheDocument();
        expect(screen.getByText('Configuration required')).toBeInTheDocument();
        expect(screen.getByText('Datasource')).toBeInTheDocument();
    });

    it('renders config warning when variable name is missing', async () => {
        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, variableName: undefined }} />);
        expect(await screen.findByTestId('dynamic-search-panel-config-warning')).toBeInTheDocument();
    });

    it('renders config warning when queries array is empty', async () => {
        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, queries: [] }} />);
        expect(await screen.findByTestId('dynamic-search-panel-config-warning')).toBeInTheDocument();
    });

    it('renders config warning when no valid queries exist', async () => {
        render(<DynamicSearchPanel {...defaultProps} options={{
            ...defaultOptions,
            queries: [{ id: 'q-1', queryType: 'label_values', label: '', metric: '' }],
        }} />);
        expect(await screen.findByTestId('dynamic-search-panel-config-warning')).toBeInTheDocument();
    });

    it('renders config warning when label is missing for label_values', async () => {
        render(<DynamicSearchPanel {...defaultProps} options={{
            ...defaultOptions,
            queries: [{ id: 'q-1', queryType: 'label_values', label: '', metric: 'up' }],
        }} />);
        expect(await screen.findByTestId('dynamic-search-panel-config-warning')).toBeInTheDocument();
    });

    it('renders search interface when correctly configured', async () => {
        render(<DynamicSearchPanel {...defaultProps} />);
        expect(await screen.findByTestId('dynamic-search-panel-wrapper')).toBeInTheDocument();
        expect(screen.getByTestId('combobox-mock')).toBeInTheDocument();
        expect(screen.getByTestId('dynamic-search-panel-hint')).toHaveTextContent('Min 3 chars');
    });

    it('displays error when regex is invalid', async () => {
        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, regex: '[' }} />);
        expect(await screen.findByTestId('dynamic-search-panel-regex-error')).toBeInTheDocument();
    });

    it('fetches and displays options when typing', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'node-01', value: 'node-01' },
            { text: 'node-02', value: 'node-02' }
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);
        
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'node' } });

        await waitFor(() => {
            expect(mockMetricFindQuery).toHaveBeenCalledWith('label_values(up, job)', {});
        });

        expect(screen.getByTestId('option-node-01')).toBeInTheDocument();
        expect(screen.getByTestId('option-node-02')).toBeInTheDocument();
    });

    it('clears the loading indicator after a search resolves', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'node-01', value: 'node-01' },
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'node' } });

        await waitFor(() => {
            expect(screen.getByTestId('option-node-01')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.queryByTestId('dynamic-search-panel-loading')).not.toBeInTheDocument();
        });
    });

    it('does not fetch options when input is too short', async () => {
        const mockMetricFindQuery = jest.fn();
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, minChars: 5 }} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'four' } }); // 4 chars < 5
        
        await waitFor(() => {}, { timeout: 100 }); 
        expect(mockMetricFindQuery).not.toHaveBeenCalled();
    });

    it('flags queries that cannot build a query as invalid configuration', async () => {
        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, queries: [{ id: 'q-1', queryType: 'invalid' as any, metric: 'up' }] }} />);

        expect(await screen.findByText('At least one valid query (check metric, label, or raw query fields)')).toBeInTheDocument();
        expect(screen.queryByTestId('combobox-input')).not.toBeInTheDocument();
    });

    it('handles metricFindQuery failure gracefully', async () => {
        const mockMetricFindQuery = jest.fn().mockRejectedValue(new Error('Datasource error'));
        mockGetDataSourceSrv.mockReturnValue({
             metricFindQuery: mockMetricFindQuery,
        });
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'test' } });

        await waitFor(() => {
             expect(consoleSpy).toHaveBeenCalled();
        });
        consoleSpy.mockRestore();
    });

    it('handles empty response from metricFindQuery', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([]);
        mockGetDataSourceSrv.mockReturnValue({
             metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'test' } });
        await waitFor(() => {}); 
        const options = screen.queryAllByTestId(/^option-/);
        expect(options).toHaveLength(0);
    });

    it('handles datasource resolution failure gracefully', async () => {
        mockGetDataSourceSrv.mockRejectedValue(new Error('datasource unavailable'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'test' } });

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Failed to load options:', expect.any(Error));
        });
        expect(screen.queryByTestId('dynamic-search-panel-loading')).not.toBeInTheDocument();
        consoleSpy.mockRestore();
    });

    it('filters results based on input', async () => {
         const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'apple', value: 'apple' },
            { text: 'banana', value: 'banana' }
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'app' } }); 

        await waitFor(() => {
             expect(screen.getByTestId('option-apple')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('option-banana')).not.toBeInTheDocument();
    });

    it('updates variable when option is selected', async () => {
         const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'value1', value: 'value1' }
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'val' } });

        await waitFor(() => {
             expect(screen.getByTestId('option-value1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('option-value1'));
        expect(mockLocationService.partial).toHaveBeenCalledWith({ 'var-testVar': 'value1' }, true);
    });

    it('clears variable when selection is removed via clear button', async () => {
         render(<DynamicSearchPanel {...defaultProps} />);
         const clearBtn = screen.getByTestId('combobox-clear');
         fireEvent.click(clearBtn);
         expect(mockLocationService.partial).toHaveBeenCalledWith({ 'var-testVar': '' }, true);
    });

    it('applies regex transformation to results', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
           { text: 'pod-01-xyz', value: 'pod-01-xyz' }
       ]);
       mockGetDataSourceSrv.mockReturnValue({
           metricFindQuery: mockMetricFindQuery,
       });

       render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, regex: 'pod-(.*)-xyz' }} />);
       const input = screen.getByTestId('combobox-input');
       fireEvent.change(input, { target: { value: 'pod' } });

       await waitFor(() => {
            expect(screen.getByTestId('option-01')).toBeInTheDocument(); 
       });
       expect(screen.queryByTestId('option-pod-01-xyz')).not.toBeInTheDocument();
   });
});

describe('DynamicSearchPanel - Multi-Query', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetVariables.mockReturnValue([{ name: 'testVar', type: 'query' }]);
        mockReplace.mockImplementation((input: string) => input);
    });

    it('should execute multiple queries in parallel and merge results', async () => {
        const mockMetricFindQuery = jest.fn()
            .mockImplementation((query: string) => {
                if (query === 'label_values(up, job)') {
                    return Promise.resolve([
                        { text: 'job-a', value: 'job-a' },
                        { text: 'job-b', value: 'job-b' },
                    ]);
                }
                if (query === 'label_values(http_requests_total, job)') {
                    return Promise.resolve([
                        { text: 'job-c', value: 'job-c' },
                        { text: 'job-d', value: 'job-d' },
                    ]);
                }
                return Promise.resolve([]);
            });
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        const multiQueryOptions: SimpleOptions = {
            ...defaultOptions,
            queries: [
                { id: 'q-1', queryType: 'label_values', label: 'job', metric: 'up' },
                { id: 'q-2', queryType: 'label_values', label: 'job', metric: 'http_requests_total' },
            ],
            maxResults: 0,
        };

        render(<DynamicSearchPanel {...defaultProps} options={multiQueryOptions} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'job' } });

        await waitFor(() => {
            expect(mockMetricFindQuery).toHaveBeenCalledTimes(2);
        });

        await waitFor(() => {
            expect(screen.getByTestId('option-job-a')).toBeInTheDocument();
            expect(screen.getByTestId('option-job-b')).toBeInTheDocument();
            expect(screen.getByTestId('option-job-c')).toBeInTheDocument();
            expect(screen.getByTestId('option-job-d')).toBeInTheDocument();
        });
    });

    it('should deduplicate results from multiple queries', async () => {
        const mockMetricFindQuery = jest.fn()
            .mockImplementation((query: string) => {
                if (query === 'label_values(up, job)') {
                    return Promise.resolve([
                        { text: 'shared-job', value: 'shared-job' },
                        { text: 'unique-a', value: 'unique-a' },
                    ]);
                }
                if (query === 'label_values(http_requests_total, job)') {
                    return Promise.resolve([
                        { text: 'shared-job', value: 'shared-job' },
                        { text: 'unique-b', value: 'unique-b' },
                    ]);
                }
                return Promise.resolve([]);
            });
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        const multiQueryOptions: SimpleOptions = {
            ...defaultOptions,
            queries: [
                { id: 'q-1', queryType: 'label_values', label: 'job', metric: 'up' },
                { id: 'q-2', queryType: 'label_values', label: 'job', metric: 'http_requests_total' },
            ],
            maxResults: 0,
        };

        render(<DynamicSearchPanel {...defaultProps} options={multiQueryOptions} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'shared' } });

        await waitFor(() => {
            expect(screen.getByTestId('option-shared-job')).toBeInTheDocument();
        });

        // Verify there is only ONE option with shared-job (deduplicated)
        const sharedOptions = screen.queryAllByTestId('option-shared-job');
        expect(sharedOptions).toHaveLength(1);
    });

    it('should skip duplicate query configs and only make unique API calls', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'result1', value: 'result1' },
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        const duplicateQueryOptions: SimpleOptions = {
            ...defaultOptions,
            queries: [
                { id: 'q-1', queryType: 'label_values', label: 'job', metric: 'up' },
                { id: 'q-2', queryType: 'label_values', label: 'job', metric: 'up' }, // duplicate
                { id: 'q-3', queryType: 'label_values', label: 'job', metric: 'up' }, // duplicate
            ],
            maxResults: 0,
        };

        render(<DynamicSearchPanel {...defaultProps} options={duplicateQueryOptions} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'result' } });

        await waitFor(() => {
            expect(mockMetricFindQuery).toHaveBeenCalledTimes(1);
        });
    });

    it('should handle partial query failures gracefully', async () => {
        const mockMetricFindQuery = jest.fn()
            .mockImplementation((query: string) => {
                if (query === 'label_values(up, job)') {
                    return Promise.resolve([
                        { text: 'good-result', value: 'good-result' },
                    ]);
                }
                return Promise.reject(new Error('Query failed'));
            });
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const multiQueryOptions: SimpleOptions = {
            ...defaultOptions,
            queries: [
                { id: 'q-1', queryType: 'label_values', label: 'job', metric: 'up' },
                { id: 'q-2', queryType: 'label_names', metric: 'broken_metric' },
            ],
            maxResults: 0,
        };

        render(<DynamicSearchPanel {...defaultProps} options={multiQueryOptions} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'good' } });

        await waitFor(() => {
            expect(screen.getByTestId('option-good-result')).toBeInTheDocument();
        });

        consoleSpy.mockRestore();
    });

    it('should warn and skip transformation when a per-query regex is invalid', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'pod-01', value: 'pod-01' },
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const invalidRegexOptions: SimpleOptions = {
            ...defaultOptions,
            queries: [
                { id: 'q-1', queryType: 'label_values', label: 'pod', metric: 'up', regex: '(' },
            ],
            maxResults: 0,
        };

        render(<DynamicSearchPanel {...defaultProps} options={invalidRegexOptions} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'pod' } });

        await waitFor(() => {
            expect(screen.getByTestId('option-pod-01')).toBeInTheDocument();
        });
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid regex in query'));

        consoleSpy.mockRestore();
    });
});

describe('DynamicSearchPanel - Debounce Effectiveness', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        mockGetVariables.mockReturnValue([{ name: 'testVar', type: 'query' }]);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should only make one API call after rapid typing (debounce test)', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'result', value: 'result' }
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');

        fireEvent.change(input, { target: { value: 'a' } });
        jest.advanceTimersByTime(50);
        fireEvent.change(input, { target: { value: 'ap' } });
        jest.advanceTimersByTime(50);
        fireEvent.change(input, { target: { value: 'app' } });
        jest.advanceTimersByTime(50);
        fireEvent.change(input, { target: { value: 'appl' } });
        jest.advanceTimersByTime(50);
        fireEvent.change(input, { target: { value: 'apple' } });

        expect(mockMetricFindQuery).not.toHaveBeenCalled();

        jest.advanceTimersByTime(400);

        await waitFor(() => {
            expect(mockMetricFindQuery).toHaveBeenCalledTimes(1);
        });

        expect(mockMetricFindQuery).toHaveBeenCalledTimes(1);
    });

    it('should cancel previous requests when new input arrives', async () => {
        const mockMetricFindQuery = jest.fn().mockImplementation(() => 
            new Promise(resolve => setTimeout(() => resolve([{ text: 'result', value: 'result' }]), 100))
        );
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');

        fireEvent.change(input, { target: { value: 'first' } });
        jest.advanceTimersByTime(400);

        fireEvent.change(input, { target: { value: 'second' } });
        jest.advanceTimersByTime(400);

        jest.runAllTimers();

        await waitFor(() => {
            expect(mockMetricFindQuery).toHaveBeenCalled();
        });
    });
});

describe('DynamicSearchPanel - maxResults', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetVariables.mockReturnValue([{ name: 'testVar', type: 'query' }]);
        mockReplace.mockImplementation((input: string) => input);
    });

    it('should limit results when maxResults is set', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'result1', value: 'result1' },
            { text: 'result2', value: 'result2' },
            { text: 'result3', value: 'result3' },
            { text: 'result4', value: 'result4' },
            { text: 'result5', value: 'result5' },
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, maxResults: 2 }} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'result' } });

        await waitFor(() => {
            expect(screen.getByTestId('option-result1')).toBeInTheDocument();
            expect(screen.getByTestId('option-result2')).toBeInTheDocument();
        });

        expect(screen.queryByTestId('option-result3')).not.toBeInTheDocument();
        expect(screen.queryByTestId('option-result4')).not.toBeInTheDocument();
        expect(screen.queryByTestId('option-result5')).not.toBeInTheDocument();
    });

    it('should show all results when maxResults is 0', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'result1', value: 'result1' },
            { text: 'result2', value: 'result2' },
            { text: 'result3', value: 'result3' },
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, maxResults: 0 }} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'result' } });

        await waitFor(() => {
            expect(screen.getByTestId('option-result1')).toBeInTheDocument();
            expect(screen.getByTestId('option-result2')).toBeInTheDocument();
            expect(screen.getByTestId('option-result3')).toBeInTheDocument();
        });
    });
});

describe('DynamicSearchPanel - Selected Badge', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetVariables.mockReturnValue([{ name: 'testVar', type: 'query' }]);
        mockReplace.mockImplementation((input: string) => input);
    });

    it('should display selected badge after selection', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'selected-value', value: 'selected-value' }
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'selected' } });

        await waitFor(() => {
            expect(screen.getByTestId('option-selected-value')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('option-selected-value'));

        await waitFor(() => {
            expect(screen.getByTestId('dynamic-search-panel-selected-badge')).toBeInTheDocument();
        });
        expect(screen.getByTestId('dynamic-search-panel-selected-badge')).toHaveTextContent('selected-value');
    });

    it('should hide selected badge and clear variable after clearing', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'value', value: 'value' }
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'val' } });

        await waitFor(() => {
            expect(screen.getByTestId('option-value')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('option-value'));

        await waitFor(() => {
            expect(screen.getByTestId('dynamic-search-panel-selected-badge')).toBeInTheDocument();
        });

        expect(mockLocationService.partial).toHaveBeenCalledWith({ 'var-testVar': 'value' }, true);
        mockLocationService.partial.mockClear();

        fireEvent.click(screen.getByTestId('combobox-clear'));

        await waitFor(() => {
            expect(screen.queryByTestId('dynamic-search-panel-selected-badge')).not.toBeInTheDocument();
        });
        expect(mockLocationService.partial).toHaveBeenCalledWith({ 'var-testVar': '' }, true);
    });
});

describe('DynamicSearchPanel - Cleanup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetVariables.mockReturnValue([{ name: 'testVar', type: 'query' }]);
        mockReplace.mockImplementation((input: string) => input);
    });

    it('should cleanup on unmount without errors', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'result', value: 'result' }
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        const { unmount } = render(<DynamicSearchPanel {...defaultProps} />);

        expect(() => unmount()).not.toThrow();
    });

    it('should discard pending requests on unmount without errors', async () => {
        const mockMetricFindQuery = jest.fn().mockImplementation(() => {
            return new Promise((resolve) => {
                setTimeout(() => resolve([{ text: 'result', value: 'result' }]), 1000);
            });
        });
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        const { unmount } = render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'test' } });

        await waitFor(() => {
            expect(mockMetricFindQuery).toHaveBeenCalled();
        }, { timeout: 500 });

        expect(() => unmount()).not.toThrow();
    });
});

describe('DynamicSearchPanel - Variable Existence Warning', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockReplace.mockImplementation((input: string) => input);
    });

    it('should show warning when variable does not exist in dashboard', async () => {
        mockGetVariables.mockReturnValue([
            { name: 'otherVar', type: 'query' },
            { name: 'anotherVar', type: 'custom' },
        ]);

        render(<DynamicSearchPanel {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId('dynamic-search-panel-variable-warning')).toBeInTheDocument();
        });
        expect(screen.getByTestId('dynamic-search-panel-variable-warning')).toHaveTextContent(
            'Variable "testVar" not found in dashboard'
        );
    });

    it('should not show warning when variable exists in dashboard', async () => {
        mockGetVariables.mockReturnValue([
            { name: 'testVar', type: 'query' },
            { name: 'otherVar', type: 'custom' },
        ]);

        render(<DynamicSearchPanel {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId('dynamic-search-panel-wrapper')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('dynamic-search-panel-variable-warning')).not.toBeInTheDocument();
    });

    it('should not show warning when no variables configured', async () => {
        mockGetVariables.mockReturnValue([]);

        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, variableName: undefined }} />);

        expect(screen.queryByTestId('dynamic-search-panel-variable-warning')).not.toBeInTheDocument();
    });

    it('should handle getTemplateSrv errors gracefully', async () => {
        mockGetVariables.mockImplementation(() => {
            throw new Error('Template service not available');
        });

        expect(() => render(<DynamicSearchPanel {...defaultProps} />)).not.toThrow();
    });
});

describe('DynamicSearchPanel - Placeholder', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetVariables.mockReturnValue([{ name: 'testVar', type: 'query' }]);
        mockReplace.mockImplementation((input: string) => input);
    });

    it('should use default placeholder when not configured', async () => {
        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');
        expect(input).toHaveAttribute('placeholder', 'Type to search...');
    });

    it('should use custom placeholder when configured', async () => {
        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, placeholder: 'Search for a job...' }} />);
        const input = screen.getByTestId('combobox-input');
        expect(input).toHaveAttribute('placeholder', 'Search for a job...');
    });
});

describe('DynamicSearchPanel - Search Mode', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetVariables.mockReturnValue([{ name: 'testVar', type: 'query' }]);
        mockReplace.mockImplementation((input: string) => input);
    });

    it('should filter with "contains" mode by default', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: '/api/users', value: '/api/users' },
            { text: 'legacy-api', value: 'legacy-api' },
            { text: 'myapi', value: 'myapi' },
            { text: 'other', value: 'other' },
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'api' } });

        await waitFor(() => {
            expect(screen.getByTestId('option-/api/users')).toBeInTheDocument();
            expect(screen.getByTestId('option-legacy-api')).toBeInTheDocument();
            expect(screen.getByTestId('option-myapi')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('option-other')).not.toBeInTheDocument();
    });

    it('should filter with "starts_with" mode', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: '/api/users', value: '/api/users' },
            { text: '/api/orders', value: '/api/orders' },
            { text: 'legacy-api', value: 'legacy-api' },
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, searchMode: SEARCH_MODE.STARTS_WITH }} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: '/api' } });

        await waitFor(() => {
            expect(screen.getByTestId('option-/api/users')).toBeInTheDocument();
            expect(screen.getByTestId('option-/api/orders')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('option-legacy-api')).not.toBeInTheDocument();
    });

    it('should filter with "exact" mode', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: '/api/users', value: '/api/users' },
            { text: '/api/users/admin', value: '/api/users/admin' },
            { text: '/api', value: '/api' },
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, searchMode: SEARCH_MODE.EXACT }} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: '/api/users' } });

        await waitFor(() => {
            expect(screen.getByTestId('option-/api/users')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('option-/api/users/admin')).not.toBeInTheDocument();
        expect(screen.queryByTestId('option-/api')).not.toBeInTheDocument();
    });
});

describe('DynamicSearchPanel - URL Variable Sync', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetVariables.mockReturnValue([{ name: 'testVar', type: 'query' }]);
    });

    it('should pre-populate selected value from URL variable on mount', async () => {
        mockReplace.mockImplementation((input: string) => {
            if (input === '$testVar') {
                return '/api/users';
            }
            return input;
        });

        render(<DynamicSearchPanel {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId('dynamic-search-panel-selected-badge')).toBeInTheDocument();
        });
        expect(screen.getByTestId('dynamic-search-panel-selected-badge')).toHaveTextContent('/api/users');
    });

    it('should not pre-populate when variable has no value', async () => {
        mockReplace.mockImplementation((input: string) => input);

        render(<DynamicSearchPanel {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId('dynamic-search-panel-wrapper')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('dynamic-search-panel-selected-badge')).not.toBeInTheDocument();
    });

    it('should handle getTemplateSrv.replace throwing error gracefully', async () => {
        mockReplace.mockImplementation(() => {
            throw new Error('Template service error');
        });

        expect(() => render(<DynamicSearchPanel {...defaultProps} />)).not.toThrow();
        expect(screen.getByTestId('dynamic-search-panel-wrapper')).toBeInTheDocument();
        expect(screen.queryByTestId('dynamic-search-panel-selected-badge')).not.toBeInTheDocument();
    });
});

describe('DynamicSearchPanel - Datasource Variable Support', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetVariables.mockReturnValue([{ name: 'testVar', type: 'query' }]);
    });

    it('should resolve datasource variable and fetch options', async () => {
        mockReplace.mockImplementation((input: string) => {
            if (input === '$datasource') {
                return 'resolved-prometheus-uid';
            }
            return input;
        });

        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'result1', value: 'result1' }
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, datasourceUid: '$datasource' }} />);
        
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'result' } });

        await waitFor(() => {
            expect(mockMetricFindQuery).toHaveBeenCalled();
        });

        expect(screen.getByTestId('option-result1')).toBeInTheDocument();
    });

    it('should show warning when datasource variable cannot be resolved', async () => {
        mockReplace.mockImplementation((input: string) => input);

        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, datasourceUid: '$unresolved' }} />);

        await waitFor(() => {
            expect(screen.getByTestId('dynamic-search-panel-variable-warning')).toBeInTheDocument();
        });
        expect(screen.getByTestId('dynamic-search-panel-variable-warning')).toHaveTextContent(
            'Datasource variable "$unresolved" could not be resolved'
        );
    });
});
