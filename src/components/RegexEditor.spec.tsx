import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RegexEditor } from './RegexEditor';
import { StandardEditorProps } from '@grafana/data';

const mockOnChange = jest.fn();

const defaultProps: StandardEditorProps<string> = {
    value: '',
    onChange: mockOnChange,
    context: {} as any,
    item: {} as any,
};

describe('RegexEditor', () => {
    beforeEach(() => {
        mockOnChange.mockClear();
    });

    it('renders correctly with empty value', async () => {
        render(<RegexEditor {...defaultProps} />);
        expect(await screen.findByPlaceholderText('e.g. /api/(.*)')).toBeInTheDocument();
        expect(screen.getByText('Optional: Use capture groups (.*) to extract values')).toBeInTheDocument();
    });

    it('renders with valid regex', async () => {
        render(<RegexEditor {...defaultProps} value="^/api/(.*)" />);
        expect(await screen.findByDisplayValue('^/api/(.*)')).toBeInTheDocument();
        expect(screen.getByText('Valid regex pattern')).toBeInTheDocument();
    });

    it('shows error message for invalid regex on init', () => {
        render(<RegexEditor {...defaultProps} value="[" />); // Invalid regex
        expect(screen.getByDisplayValue('[')).toBeInTheDocument();
        // The error message from RegExp constructor varies by browser/node, but usually contains "Invalid regular expression" or similar
        // We look for the container with the error class or icon
        expect(screen.getByTestId('dynamic-search-panel-regex-error')).toBeInTheDocument();
    });

    it('calls onChange when valid regex is typed', () => {
        render(<RegexEditor {...defaultProps} />);
        const input = screen.getByPlaceholderText('e.g. /api/(.*)');
        
        fireEvent.change(input, { target: { value: 'abc' } });
        
        expect(mockOnChange).toHaveBeenCalledWith('abc');
    });

    it('does not call onChange when invalid regex is typed (while typing)', () => {
        render(<RegexEditor {...defaultProps} />);
        const input = screen.getByPlaceholderText('e.g. /api/(.*)');
        
        fireEvent.change(input, { target: { value: '[' } });
        
        expect(mockOnChange).not.toHaveBeenCalled();
        expect(screen.getByTestId('dynamic-search-panel-regex-error')).toBeInTheDocument();
    });
});

