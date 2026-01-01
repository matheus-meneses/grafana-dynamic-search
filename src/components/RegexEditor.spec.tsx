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

    it('calls onChange on blur with valid regex', () => {
        render(<RegexEditor {...defaultProps} />);
        const input = screen.getByPlaceholderText('e.g. /api/(.*)');
        
        fireEvent.change(input, { target: { value: 'test.*' } });
        mockOnChange.mockClear();
        
        fireEvent.blur(input);
        
        expect(mockOnChange).toHaveBeenCalledWith('test.*');
    });

    it('does not call onChange on blur with invalid regex', () => {
        render(<RegexEditor {...defaultProps} />);
        const input = screen.getByPlaceholderText('e.g. /api/(.*)');
        
        fireEvent.change(input, { target: { value: '[' } });
        mockOnChange.mockClear();
        
        fireEvent.blur(input);
        
        expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('shows test preview section when valid regex is entered', () => {
        render(<RegexEditor {...defaultProps} value="node-(\d+)" />);
        
        expect(screen.getByText('Test your regex:')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter a sample value to test')).toBeInTheDocument();
    });

    it('does not show test preview section when regex is empty', () => {
        render(<RegexEditor {...defaultProps} value="" />);
        
        expect(screen.queryByText('Test your regex:')).not.toBeInTheDocument();
    });

    it('does not show test preview section when regex is invalid', () => {
        render(<RegexEditor {...defaultProps} value="[" />);
        
        expect(screen.queryByText('Test your regex:')).not.toBeInTheDocument();
    });

    it('shows match result when test value matches regex with capture group', () => {
        render(<RegexEditor {...defaultProps} value="node-(\d+)" />);
        
        const testInput = screen.getByPlaceholderText('Enter a sample value to test');
        fireEvent.change(testInput, { target: { value: 'node-01' } });
        
        expect(screen.getByText('01')).toBeInTheDocument();
    });

    it('shows match result when test value matches regex without capture group', () => {
        render(<RegexEditor {...defaultProps} value="node" />);
        
        const testInput = screen.getByPlaceholderText('Enter a sample value to test');
        fireEvent.change(testInput, { target: { value: 'node-01' } });
        
        expect(screen.getByText('node')).toBeInTheDocument();
    });

    it('shows no match when test value does not match regex', () => {
        render(<RegexEditor {...defaultProps} value="node-(\d+)" />);
        
        const testInput = screen.getByPlaceholderText('Enter a sample value to test');
        fireEvent.change(testInput, { target: { value: 'other-value' } });
        
        expect(screen.getByText('No match')).toBeInTheDocument();
    });

    it('does not show preview result when test input is empty', () => {
        render(<RegexEditor {...defaultProps} value="node-(\d+)" />);
        
        expect(screen.queryByText('No match')).not.toBeInTheDocument();
    });
});

