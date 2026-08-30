import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataSourcePickerEditor } from './DataSourcePickerEditor';
import { StandardEditorProps } from '@grafana/data';

const mockGetVariables = jest.fn();
const mockGetList = jest.fn();

jest.mock('@grafana/runtime', () => ({
  getTemplateSrv: () => ({
    getVariables: mockGetVariables,
  }),
  getDataSourceSrv: () => ({
    getList: mockGetList,
  }),
}));

jest.mock('@grafana/ui', () => ({
  Combobox: ({ options, value, onChange, placeholder }: any) => {
    const currentOption = options.find((o: any) => o.value === value);
    return (
      <div data-testid="datasource-select">
        <span data-testid="current-value">{currentOption?.label ?? ''}</span>
        <span data-testid="placeholder">{placeholder}</span>
        <ul data-testid="options-list">
          {options.map((opt: any) => (
            <li key={opt.value}>
              <button onClick={() => onChange(opt)}>{opt.label}</button>
            </li>
          ))}
        </ul>
      </div>
    );
  },
}));

const mockOnChange = jest.fn();

const defaultProps: StandardEditorProps<string> = {
  value: 'prometheus-uid',
  onChange: mockOnChange,
  context: {} as any,
  item: {} as any,
};

describe('DataSourcePickerEditor', () => {
  beforeEach(() => {
    mockOnChange.mockClear();
    mockGetVariables.mockReturnValue([
      { type: 'datasource', name: 'datasource', query: 'prometheus' },
      { type: 'datasource', name: 'testdb', query: 'testdata' },
      { type: 'query', name: 'other', query: '' },
    ]);
    mockGetList.mockReturnValue([
      { uid: 'prometheus-uid', name: 'Prometheus', isDefault: true, type: 'prometheus' },
      { uid: 'prometheus-2', name: 'Prometheus 2', isDefault: false, type: 'prometheus' },
      { uid: 'influx-1', name: 'InfluxDB', isDefault: false, type: 'influxdb' },
    ]);
  });

  it('renders correctly with current value', async () => {
    render(<DataSourcePickerEditor {...defaultProps} />);
    expect(await screen.findByTestId('datasource-select')).toBeInTheDocument();
    expect(screen.getByTestId('current-value')).toHaveTextContent('Prometheus');
  });

  it('calls onChange when a datasource is selected', () => {
    render(<DataSourcePickerEditor {...defaultProps} />);
    fireEvent.click(screen.getByText('Prometheus 2'));
    expect(mockOnChange).toHaveBeenCalledWith('prometheus-2');
  });

  it('shows all datasource-type variables regardless of datasource type', () => {
    render(<DataSourcePickerEditor {...defaultProps} />);
    expect(screen.getByText('$datasource')).toBeInTheDocument();
    expect(screen.getByText('$testdb')).toBeInTheDocument();
    expect(screen.queryByText('$other')).not.toBeInTheDocument();
  });

  it('shows datasources of any type', () => {
    render(<DataSourcePickerEditor {...defaultProps} />);
    expect(screen.getAllByText('Prometheus').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Prometheus 2')).toBeInTheDocument();
    expect(screen.getByText('InfluxDB')).toBeInTheDocument();
  });

  it('renders with empty value', () => {
    render(<DataSourcePickerEditor {...defaultProps} value="" />);
    expect(screen.getByTestId('datasource-select')).toBeInTheDocument();
    expect(screen.getByTestId('current-value')).toHaveTextContent('');
  });

  it('calls onChange when a variable is selected', () => {
    render(<DataSourcePickerEditor {...defaultProps} />);
    fireEvent.click(screen.getByText('$datasource'));
    expect(mockOnChange).toHaveBeenCalledWith('$datasource');
  });
});

