import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataSourcePickerEditor } from './DataSourcePickerEditor';
import { StandardEditorProps } from '@grafana/data';

jest.mock('@grafana/runtime', () => ({
    DataSourcePicker: ({ onChange, current, filter }: any) => {
        if (filter && !filter({ type: 'prometheus' })) {
             return <div>Filtered Out</div>;
        }
        return (
            <div data-testid="datasource-picker">
                <span data-testid="current-value">{current ?? ''}</span>
                <button onClick={() => onChange({ uid: 'new-uid', type: 'prometheus' })}>Select DS</button>
                <button data-testid="select-no-uid" onClick={() => onChange({})}>Select No UID</button>
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

    it('does not call onChange when datasource has no uid', () => {
        render(<DataSourcePickerEditor {...defaultProps} />);
        fireEvent.click(screen.getByTestId('select-no-uid'));
        expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('renders with empty value', () => {
        render(<DataSourcePickerEditor {...defaultProps} value="" />);
        expect(screen.getByTestId('datasource-picker')).toBeInTheDocument();
        expect(screen.getByTestId('current-value')).toHaveTextContent('');
    });
});

