import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataSourcePickerEditor } from './DataSourcePickerEditor';
import { StandardEditorProps } from '@grafana/data';

// Mock DataSourcePicker
jest.mock('@grafana/runtime', () => ({
    DataSourcePicker: ({ onChange, current, filter }: any) => {
        // Simulate a filter check
        if (filter && !filter({ type: 'prometheus' })) {
             return <div>Filtered Out</div>;
        }
        return (
            <div data-testid="datasource-picker">
                <span data-testid="current-value">{current}</span>
                <button onClick={() => onChange({ uid: 'new-uid', type: 'prometheus' })}>Select DS</button>
            </div>
        );
    },
}));

const mockOnChange = jest.fn();

const defaultProps: StandardEditorProps<string> = {
    value: 'test-ds-uid',
    onChange: mockOnChange,
    context: {} as any,
    item: {} as any,
};

describe('DataSourcePickerEditor', () => {
    beforeEach(() => {
        mockOnChange.mockClear();
    });

    it('renders correctly with current value', async () => {
        render(<DataSourcePickerEditor {...defaultProps} />);
        expect(await screen.findByTestId('datasource-picker')).toBeInTheDocument();
        expect(screen.getByTestId('current-value')).toHaveTextContent('test-ds-uid');
    });

    it('calls onChange when a datasource is selected', () => {
        render(<DataSourcePickerEditor {...defaultProps} />);
        fireEvent.click(screen.getByText('Select DS'));
        expect(mockOnChange).toHaveBeenCalledWith('new-uid');
    });
});

