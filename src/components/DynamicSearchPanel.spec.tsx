import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DynamicSearchPanel } from './DynamicSearchPanel';
import { PanelProps, LoadingState } from '@grafana/data';
import { SimpleOptions } from '../types';

// Mocks
const mockGetDataSourceSrv = jest.fn();
const mockLocationService = {
  partial: jest.fn(),
};

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getDataSourceSrv: () => ({
    get: mockGetDataSourceSrv,
  }),
  locationService: {
    partial: (...args: any[]) => mockLocationService.partial(...args),
  },
}));

// Mock Grafana UI components to simplify testing
jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  Combobox: ({ onChange, value, options, placeholder, isClearable }: any) => {
    const [opts, setOpts] = React.useState<any[]>([]);

    const handleInput = async (e: any) => {
        if (typeof options === 'function') {
            const res = await options(e.target.value);
            setOpts(Array.isArray(res) ? res : []);
        }
    };

    return (
      <div data-testid="combobox-mock">
        <input 
            data-testid="combobox-input" 
            placeholder={placeholder}
            onChange={handleInput} 
        />
        {isClearable && <button data-testid="combobox-clear" onClick={() => onChange(null)}>Clear</button>}
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
        <div data-testid="combobox-value">{value ? value.value : ''}</div>
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
};

describe('DynamicSearchPanel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders config warning when datasource is missing', async () => {
        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, datasourceUid: undefined }} />);
        expect(await screen.findByTestId('dynamic-search-panel-config-warning')).toBeInTheDocument();
        expect(screen.getByText('Panel not configured')).toBeInTheDocument();
    });

    it('renders config warning when variable name is missing', async () => {
        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, variableName: undefined }} />);
        expect(await screen.findByTestId('dynamic-search-panel-config-warning')).toBeInTheDocument();
    });

    it('renders config warning when label is missing for label_values', async () => {
        render(<DynamicSearchPanel {...defaultProps} options={{ ...defaultOptions, queryType: 'label_values', label: '' }} />);
        expect(await screen.findByTestId('dynamic-search-panel-config-warning')).toBeInTheDocument();
    });

    it('renders search interface when correctly configured', async () => {
        render(<DynamicSearchPanel {...defaultProps} />);
        expect(await screen.findByTestId('dynamic-search-panel-wrapper')).toBeInTheDocument();
        expect(screen.getByTestId('combobox-mock')).toBeInTheDocument();
        expect(screen.getByTestId('dynamic-search-panel-hint')).toHaveTextContent('Min 3 characters');
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

    it('handles null item selection (clearing)', async () => {
         render(<DynamicSearchPanel {...defaultProps} />);
         const clearBtn = screen.getByTestId('combobox-clear');
         fireEvent.click(clearBtn);
         expect(mockLocationService.partial).not.toHaveBeenCalled();
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
