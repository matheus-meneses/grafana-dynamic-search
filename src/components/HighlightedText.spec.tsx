import React from 'react';
import { render, screen } from '@testing-library/react';
import { HighlightedText } from './HighlightedText';

jest.mock('@grafana/ui', () => ({
  useStyles2: (fn: any) =>
    fn({
      colors: {
        warning: { transparent: 'rgba(255, 183, 51, 0.15)' },
        text: { primary: '#000' },
      },
    }),
}));

describe('HighlightedText', () => {
  it('renders text without highlighting when highlight is empty', () => {
    render(<HighlightedText text="api/v1/users" highlight="" />);
    expect(screen.getByText('api/v1/users')).toBeInTheDocument();
    expect(screen.queryByRole('mark')).not.toBeInTheDocument();
  });

  it('highlights matching substring', () => {
    const { container } = render(<HighlightedText text="/api/v1/users" highlight="api" />);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent('api');
  });

  it('handles case-insensitive matching', () => {
    const { container } = render(<HighlightedText text="/API/v1/users" highlight="api" />);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent('API');
  });

  it('highlights multiple occurrences', () => {
    const { container } = render(<HighlightedText text="api-gateway-api" highlight="api" />);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(2);
  });

  it('renders full text when no match found', () => {
    render(<HighlightedText text="prometheus_requests" highlight="xyz" />);
    expect(screen.getByText('prometheus_requests')).toBeInTheDocument();
    expect(screen.queryByRole('mark')).not.toBeInTheDocument();
  });

  it('handles special regex characters in highlight', () => {
    const { container } = render(<HighlightedText text="/api/v1/users[0]" highlight="[0]" />);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent('[0]');
  });

  it('handles highlight at start of text', () => {
    const { container } = render(<HighlightedText text="api/users" highlight="api" />);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent('api');
  });

  it('handles highlight at end of text', () => {
    const { container } = render(<HighlightedText text="users/api" highlight="api" />);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent('api');
  });

  it('handles exact match of entire text', () => {
    const { container } = render(<HighlightedText text="api" highlight="api" />);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent('api');
  });

  it('preserves original case in non-matching parts', () => {
    render(<HighlightedText text="MyAPI/Users" highlight="api" />);
    expect(screen.getByText('My')).toBeInTheDocument();
    expect(screen.getByText('/Users')).toBeInTheDocument();
  });
});
