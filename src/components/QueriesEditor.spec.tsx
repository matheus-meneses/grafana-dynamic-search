import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueriesEditor } from './QueriesEditor';
import { QueryConfig, QUERY_TYPE } from '../types';

jest.mock('@grafana/runtime', () => ({
  getTemplateSrv: () => ({
    replace: (input: string) => input,
    getVariables: () => [],
  }),
  locationService: { partial: jest.fn() },
  getDataSourceSrv: () => ({ get: jest.fn() }),
}));

jest.mock('@grafana/ui', () => ({
  IconButton: ({ onClick, 'aria-label': ariaLabel }: { onClick: () => void; 'aria-label': string }) => (
    <button onClick={onClick} aria-label={ariaLabel} />
  ),
  Input: ({ value, onChange, placeholder, 'aria-label': ariaLabel, type }: {
    value: string;
    onChange: (e: { currentTarget: { value: string } }) => void;
    placeholder?: string;
    'aria-label'?: string;
    type?: string;
  }) => (
    <input
      value={value}
      onChange={(e) => onChange({ currentTarget: { value: e.target.value } })}
      placeholder={placeholder}
      aria-label={ariaLabel}
      type={type}
    />
  ),
  TextArea: ({ value, onChange, placeholder }: {
    value: string;
    onChange: (e: { currentTarget: { value: string } }) => void;
    placeholder?: string;
  }) => (
    <textarea
      value={value}
      onChange={(e) => onChange({ currentTarget: { value: e.target.value } })}
      placeholder={placeholder}
    />
  ),
  useStyles2: () => ({
    container: '',
    queryCard: '',
    queryCardDuplicate: '',
    queryHeader: '',
    queryIndex: '',
    fieldRow: '',
    fieldLabel: '',
    preview: '',
    previewEmpty: '',
    addButton: '',
    duplicateWarning: '',
    emptyState: '',
    regexError: '',
    queryNameWrapper: '',
  }),
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
  Combobox: ({ value, onChange, options }: {
    value: string;
    onChange: (v: { value: string } | null) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange({ value: e.target.value })}
      data-testid="query-type-select"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ),
  ComboboxOption: {},
  Button: ({ children, onClick, 'data-testid': testId }: {
    children: React.ReactNode;
    onClick: () => void;
    'data-testid'?: string;
  }) => (
    <button onClick={onClick} data-testid={testId}>{children}</button>
  ),
}));

const makeQuery = (overrides: Partial<QueryConfig> = {}): QueryConfig => ({
  id: 'q-1',
  queryType: QUERY_TYPE.LABEL_VALUES,
  label: 'job',
  metric: 'up',
  name: '',
  ...overrides,
});

const defaultProps = {
  value: undefined as QueryConfig[] | undefined,
  onChange: jest.fn(),
  item: {} as never,
  context: { data: [], options: {} } as never,
  id: 'queries',
};

describe('QueriesEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show empty state when no queries', () => {
    render(<QueriesEditor {...defaultProps} value={undefined} />);
    expect(screen.getByText('No queries configured. Add a query to get started.')).toBeInTheDocument();
  });

  it('should render "Add query" button', () => {
    render(<QueriesEditor {...defaultProps} />);
    expect(screen.getByTestId('add-query-button')).toBeInTheDocument();
  });

  it('should call onChange with new query when add button clicked', () => {
    render(<QueriesEditor {...defaultProps} value={[]} />);
    fireEvent.click(screen.getByTestId('add-query-button'));
    expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
    const newQueries = defaultProps.onChange.mock.calls[0][0];
    expect(newQueries).toHaveLength(1);
    expect(newQueries[0].queryType).toBe(QUERY_TYPE.LABEL_VALUES);
    expect(newQueries[0].metric).toBe('');
  });

  it('should render a query card for each query', () => {
    const queries = [makeQuery({ id: 'q-1' }), makeQuery({ id: 'q-2', metric: 'http_requests_total' })];
    render(<QueriesEditor {...defaultProps} value={queries} />);
    expect(screen.getByTestId('query-card-0')).toBeInTheDocument();
    expect(screen.getByTestId('query-card-1')).toBeInTheDocument();
  });

  it('should call onChange without the query when remove is clicked', () => {
    const queries = [makeQuery({ id: 'q-1' }), makeQuery({ id: 'q-2', metric: 'other' })];
    render(<QueriesEditor {...defaultProps} value={queries} />);
    fireEvent.click(screen.getByLabelText('Remove query 1'));
    expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
    const result = defaultProps.onChange.mock.calls[0][0];
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('q-2');
  });

  it('should update metric when input changes', () => {
    const queries = [makeQuery()];
    render(<QueriesEditor {...defaultProps} value={queries} />);
    const metricInput = screen.getByPlaceholderText('e.g., up, http_requests_total');
    fireEvent.change(metricInput, { target: { value: 'new_metric' } });
    expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
    expect(defaultProps.onChange.mock.calls[0][0][0].metric).toBe('new_metric');
  });

  it('should show duplicate warning for identical queries', () => {
    const queries = [
      makeQuery({ id: 'q-1', metric: 'up', label: 'job' }),
      makeQuery({ id: 'q-2', metric: 'up', label: 'job' }),
    ];
    render(<QueriesEditor {...defaultProps} value={queries} />);
    expect(screen.getByTestId('query-duplicate-warning-0')).toBeInTheDocument();
    expect(screen.getByTestId('query-duplicate-warning-1')).toBeInTheDocument();
  });

  it('should show regex error for invalid regex', () => {
    const queries = [makeQuery({ id: 'q-1', regex: '(' })];
    render(<QueriesEditor {...defaultProps} value={queries} />);
    expect(screen.getByTestId('query-regex-error-0')).toBeInTheDocument();
  });

  it('should not show regex error for valid regex', () => {
    const queries = [makeQuery({ id: 'q-1', regex: '^/api/(.*)' })];
    render(<QueriesEditor {...defaultProps} value={queries} />);
    expect(screen.queryByTestId('query-regex-error-0')).not.toBeInTheDocument();
  });

  it('should show label field only for label_values query type', () => {
    const queries = [makeQuery({ queryType: QUERY_TYPE.METRICS, label: '' })];
    render(<QueriesEditor {...defaultProps} value={queries} />);
    expect(screen.queryByPlaceholderText('e.g., job, instance, handler')).not.toBeInTheDocument();
  });

  it('should show label field for label_values query type', () => {
    const queries = [makeQuery({ queryType: QUERY_TYPE.LABEL_VALUES })];
    render(<QueriesEditor {...defaultProps} value={queries} />);
    expect(screen.getByPlaceholderText('e.g., job, instance, handler')).toBeInTheDocument();
  });

  it('should show query preview', () => {
    const queries = [makeQuery({ metric: 'up', label: 'job', queryType: QUERY_TYPE.LABEL_VALUES })];
    render(<QueriesEditor {...defaultProps} value={queries} />);
    expect(screen.getByText('label_values(up, job)')).toBeInTheDocument();
  });

  it('should show a raw query textarea instead of metric for raw type', () => {
    const queries = [makeQuery({ queryType: QUERY_TYPE.RAW, metric: '', label: '', rawQuery: 'label_values(up, job)' })];
    render(<QueriesEditor {...defaultProps} value={queries} />);
    expect(screen.getByPlaceholderText('Datasource-specific query, e.g., label_values(up, job)')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('e.g., up, http_requests_total')).not.toBeInTheDocument();
  });

  it('should update rawQuery when the raw textarea changes', () => {
    const queries = [makeQuery({ queryType: QUERY_TYPE.RAW, metric: '', label: '', rawQuery: '' })];
    render(<QueriesEditor {...defaultProps} value={queries} />);
    const textarea = screen.getByPlaceholderText('Datasource-specific query, e.g., label_values(up, job)');
    fireEvent.change(textarea, { target: { value: 'metrics(.*)' } });
    expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
    expect(defaultProps.onChange.mock.calls[0][0][0].rawQuery).toBe('metrics(.*)');
  });

  it('should render the raw query verbatim in the preview', () => {
    const queries = [makeQuery({ queryType: QUERY_TYPE.RAW, metric: '', label: '', rawQuery: 'SHOW TAG VALUES' })];
    render(<QueriesEditor {...defaultProps} value={queries} />);
    const matches = screen.getAllByText('SHOW TAG VALUES');
    expect(matches.some((el) => el.tagName === 'DIV')).toBe(true);
  });
});
