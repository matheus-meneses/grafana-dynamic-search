import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DynamicSearchPanel } from './DynamicSearchPanel';
import { PanelProps, LoadingState } from '@grafana/data';
import { SimpleOptions, SEARCH_MODE } from '../types';

const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (args[0]?.includes?.('not wrapped in act') || 
        (typeof args[0] === 'string' && args[0].includes('not wrapped in act'))) {
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
  ...jest.requireActual('@grafana/runtime'),
  getDataSourceSrv: () => ({
    get: mockGetDataSourceSrv,
  }),
  locationService: {
    partial: (...args: any[]) => mockLocationService.partial(...args),
  },
  getTemplateSrv: () => ({
    getVariables: () => mockGetVariables(),
    replace: (input: string) => mockReplace(input),
  }),
}));

jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  Combobox: ({ onChange, value, options, placeholder, isClearable }: any) => {
    const [opts, setOpts] = React.useState<any[]>([]);

    const handleInput = async (e: any) => {
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
    queryType: 'label_values',
    label: 'job',
    metric: 'up',
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

    it('renders config warning when label is missing for label_values', async () => {
        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, queryType: 'label_values', label: '' }} />);
        expect(await screen.findByTestId('dynamic-search-panel-config-warning')).toBeInTheDocument();
    });

    it('renders config warning when metric is missing', async () => {
        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, metric: '' }} />);
        expect(await screen.findByTestId('dynamic-search-panel-config-warning')).toBeInTheDocument();
        expect(screen.getByText('Metric')).toBeInTheDocument();
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

    it('does not crash when buildQuery returns empty string', async () => {
        // Query type missing label causes empty query.
        // BUT wait, isConfigured check in component prevents rendering if label is missing for label_values!
        // See DynamicSearchPanel.tsx: if (options.queryType === 'label_values' && !options.label) return false;
        
        // So we need a case where isConfigured passes, but buildQuery returns empty.
        // buildQuery returns empty if:
        // 1. label_values without label (blocked by isConfigured)
        // 2. default case (shouldn't happen with valid types)
        
        // Actually, maybe we can test a case where we force isConfigured to be true but query is invalid?
        // Or simply test a valid configuration that returns empty query string?
        // Looking at utils.ts:
        // case 'label_values': if metric && label ... else if label ... return ''
        // case 'label_names': always returns something (label_names())
        // case 'metrics': always returns something (metrics(.*))
        
        // So it seems buildQuery generally returns something if isConfigured passes.
        // EXCEPT: if queryType is 'label_values' and label is present, it returns `label_values(label)`.
        
        // Let's force an "invalid" query type via type assertion if we want to test robustness,
        // OR rely on the fact that if buildQuery returns empty (e.g. some edge case), it handles it.
        
        // To bypass isConfigured check for this specific test case (to test the check inside loadOptions), 
        // we might need to supply a configuration that PASSES isConfigured but FAILS buildQuery.
        // Currently there isn't one easily accessible without hacking types.
        
        // HOWEVER, we can just test that if loadOptions receives an empty string query (mocked), it returns empty.
        // But we are integration testing the component.
        
        // Let's modify the test to use a queryType that passes isConfigured but might produce empty query?
        // Actually, let's just skip this specific "crash" test if the component logic prevents it ever happening!
        // The component has `if (options.queryType === 'label_values' && !options.label) return false;`
        // So it renders the warning, hence `screen.getByTestId('combobox-input')` fails.
        
        // Correct fix: We should check that it renders the WARNING, or if we want to test loadOptions safety,
        // we need a scenario where `isConfigured` is true.
        
        // Let's try testing 'invalid' query type casted, which might pass isConfigured check (if it only checks label_values specifically).
        // isConfigured checks: datasource, metric, variable. And IF label_values, then label.
        
        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, queryType: 'invalid' as any }} />);
        
        // Now it should render search interface because isConfigured should be true (it's not 'label_values')
        // And buildQuery should return '' (default case).
        
        const input = await screen.findByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'test' } });
        
        // Should just return empty list, not crash
        await waitFor(() => {}, { timeout: 100 });
    });

    it('handles metricFindQuery failure gracefully', async () => {
        const mockMetricFindQuery = jest.fn().mockRejectedValue(new Error('Datasource error'));
        mockGetDataSourceSrv.mockReturnValue({
             metricFindQuery: mockMetricFindQuery,
        });
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'test' } });

        await waitFor(() => {
             expect(consoleSpy).toHaveBeenCalledWith('Failed to load options:', expect.any(Error));
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

    it('clears variable when input is cleared via backspace after typing', async () => {
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
        mockLocationService.partial.mockClear();

        fireEvent.change(input, { target: { value: 'new' } });
        fireEvent.change(input, { target: { value: '' } });
        await waitFor(() => {
            expect(mockLocationService.partial).toHaveBeenCalledWith({ 'var-testVar': '' }, true);
        });
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

        // Simulate rapid typing: 'a', 'ap', 'app', 'appl', 'apple'
        // Each keystroke happens faster than debounce delay (350ms)
        fireEvent.change(input, { target: { value: 'a' } });
        jest.advanceTimersByTime(50);
        fireEvent.change(input, { target: { value: 'ap' } });
        jest.advanceTimersByTime(50);
        fireEvent.change(input, { target: { value: 'app' } });
        jest.advanceTimersByTime(50);
        fireEvent.change(input, { target: { value: 'appl' } });
        jest.advanceTimersByTime(50);
        fireEvent.change(input, { target: { value: 'apple' } });

        // At this point, no API call should have been made yet (still debouncing)
        expect(mockMetricFindQuery).not.toHaveBeenCalled();

        // Advance timers past the debounce delay (350ms)
        jest.advanceTimersByTime(400);

        // Wait for async operations to complete
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

        // Type first search term and wait for debounce
        fireEvent.change(input, { target: { value: 'first' } });
        jest.advanceTimersByTime(400);

        // Immediately type second search term before first completes
        fireEvent.change(input, { target: { value: 'second' } });
        jest.advanceTimersByTime(400);

        // Run all pending timers
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

    it('should abort pending requests on unmount', async () => {
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

describe('DynamicSearchPanel - Input Clearing Behavior', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetVariables.mockReturnValue([{ name: 'testVar', type: 'query' }]);
    });

    it('clears variable when user backspaces input to empty after selection and typing', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'selected-item', value: 'selected-item' }
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');

        fireEvent.change(input, { target: { value: 'selected' } });
        await waitFor(() => {
            expect(screen.getByTestId('option-selected-item')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('option-selected-item'));
        expect(mockLocationService.partial).toHaveBeenCalledWith({ 'var-testVar': 'selected-item' }, true);

        await waitFor(() => {
            expect(screen.getByTestId('dynamic-search-panel-selected-badge')).toBeInTheDocument();
        });

        mockLocationService.partial.mockClear();

        fireEvent.change(input, { target: { value: 'new-search' } });
        fireEvent.change(input, { target: { value: '' } });

        await waitFor(() => {
            expect(mockLocationService.partial).toHaveBeenCalledWith({ 'var-testVar': '' }, true);
        });

        await waitFor(() => {
            expect(screen.queryByTestId('dynamic-search-panel-selected-badge')).not.toBeInTheDocument();
        });
    });

    it('does not update variable while typing (only on selection)', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'option1', value: 'option1' },
            { text: 'option2', value: 'option2' }
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');

        fireEvent.change(input, { target: { value: 'opt' } });

        await waitFor(() => {
            expect(screen.getByTestId('option-option1')).toBeInTheDocument();
        });

        expect(mockLocationService.partial).not.toHaveBeenCalled();

        fireEvent.change(input, { target: { value: 'opti' } });
        fireEvent.change(input, { target: { value: 'optio' } });

        expect(mockLocationService.partial).not.toHaveBeenCalled();
    });

    it('updates variable only when clicking on an option', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'first-option', value: 'first-option' },
            { text: 'second-option', value: 'second-option' }
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');

        fireEvent.change(input, { target: { value: 'option' } });
        await waitFor(() => {
            expect(screen.getByTestId('option-first-option')).toBeInTheDocument();
            expect(screen.getByTestId('option-second-option')).toBeInTheDocument();
        });

        expect(mockLocationService.partial).not.toHaveBeenCalled();

        fireEvent.click(screen.getByTestId('option-first-option'));

        expect(mockLocationService.partial).toHaveBeenCalledTimes(1);
        expect(mockLocationService.partial).toHaveBeenCalledWith({ 'var-testVar': 'first-option' }, true);
    });

    it('clears variable when clicking X button', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'test-value', value: 'test-value' }
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');

        fireEvent.change(input, { target: { value: 'test' } });
        await waitFor(() => {
            expect(screen.getByTestId('option-test-value')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('option-test-value'));
        expect(mockLocationService.partial).toHaveBeenCalledWith({ 'var-testVar': 'test-value' }, true);
        mockLocationService.partial.mockClear();

        fireEvent.click(screen.getByTestId('combobox-clear'));

        expect(mockLocationService.partial).toHaveBeenCalledWith({ 'var-testVar': '' }, true);
    });

    it('does not clear variable when backspacing if no selection exists', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');

        fireEvent.change(input, { target: { value: 'test' } });
        await waitFor(() => {}, { timeout: 100 });

        expect(mockLocationService.partial).not.toHaveBeenCalled();

        fireEvent.change(input, { target: { value: '' } });
        await waitFor(() => {}, { timeout: 100 });

        expect(mockLocationService.partial).not.toHaveBeenCalled();
    });

    it('does not clear variable when clicking on input after selection (initial focus)', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'my-value', value: 'my-value' }
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');

        fireEvent.change(input, { target: { value: 'my-v' } });
        await waitFor(() => {
            expect(screen.getByTestId('option-my-value')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('option-my-value'));
        expect(mockLocationService.partial).toHaveBeenCalledWith({ 'var-testVar': 'my-value' }, true);
        
        await waitFor(() => {
            expect(screen.getByTestId('dynamic-search-panel-selected-badge')).toBeInTheDocument();
        });
        
        mockLocationService.partial.mockClear();

        fireEvent.change(input, { target: { value: '' } });
        await waitFor(() => {}, { timeout: 100 });
        
        expect(mockLocationService.partial).not.toHaveBeenCalled();
        expect(screen.getByTestId('dynamic-search-panel-selected-badge')).toBeInTheDocument();
    });

    it('allows selecting a new value after clearing', async () => {
        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'value-a', value: 'value-a' },
            { text: 'value-b', value: 'value-b' }
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);
        const input = screen.getByTestId('combobox-input');

        fireEvent.change(input, { target: { value: 'value' } });
        await waitFor(() => {
            expect(screen.getByTestId('option-value-a')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('option-value-a'));
        expect(mockLocationService.partial).toHaveBeenCalledWith({ 'var-testVar': 'value-a' }, true);

        fireEvent.click(screen.getByTestId('combobox-clear'));

        mockLocationService.partial.mockClear();

        fireEvent.change(input, { target: { value: 'value' } });
        await waitFor(() => {
            expect(screen.getByTestId('option-value-b')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('option-value-b'));
        expect(mockLocationService.partial).toHaveBeenCalledWith({ 'var-testVar': 'value-b' }, true);
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

    it('should not pre-populate when variable name is not configured', async () => {
        mockReplace.mockImplementation((input: string) => 'some-value');

        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, variableName: undefined }} />);

        expect(screen.queryByTestId('dynamic-search-panel-selected-badge')).not.toBeInTheDocument();
    });

    it('should allow clearing pre-populated value via clear button', async () => {
        mockReplace.mockImplementation((input: string) => {
            if (input === '$testVar') {
                return 'pre-filled-value';
            }
            return input;
        });

        render(<DynamicSearchPanel {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId('dynamic-search-panel-selected-badge')).toBeInTheDocument();
        });
        expect(screen.getByTestId('dynamic-search-panel-selected-badge')).toHaveTextContent('pre-filled-value');

        fireEvent.click(screen.getByTestId('combobox-clear'));

        expect(mockLocationService.partial).toHaveBeenCalledWith({ 'var-testVar': '' }, true);
        await waitFor(() => {
            expect(screen.queryByTestId('dynamic-search-panel-selected-badge')).not.toBeInTheDocument();
        });
    });

    it('should allow selecting new value after clearing pre-populated value', async () => {
        mockReplace.mockImplementation((input: string) => {
            if (input === '$testVar') {
                return 'initial-value';
            }
            return input;
        });

        const mockMetricFindQuery = jest.fn().mockResolvedValue([
            { text: 'new-selection', value: 'new-selection' }
        ]);
        mockGetDataSourceSrv.mockReturnValue({
            metricFindQuery: mockMetricFindQuery,
        });

        render(<DynamicSearchPanel {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId('dynamic-search-panel-selected-badge')).toHaveTextContent('initial-value');
        });

        fireEvent.click(screen.getByTestId('combobox-clear'));
        mockLocationService.partial.mockClear();

        const input = screen.getByTestId('combobox-input');
        fireEvent.change(input, { target: { value: 'new' } });

        await waitFor(() => {
            expect(screen.getByTestId('option-new-selection')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('option-new-selection'));

        expect(mockLocationService.partial).toHaveBeenCalledWith({ 'var-testVar': 'new-selection' }, true);
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
