import React from 'react';
import { render, screen } from '@testing-library/react';
import { FailedQueriesWarning } from './FailedQueriesWarning';

jest.mock('@grafana/ui', () => ({
  Alert: ({ title, children, severity }: { title: string; children: React.ReactNode; severity: string }) => (
    <div data-testid="alert" data-severity={severity}>
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  ),
  useStyles2: (fn: Function) => fn({
    spacing: (n: number) => `${n * 8}px`,
    colors: { background: { secondary: '#f0f0f0' }, border: { weak: '#ccc' } },
  }),
}));

describe('FailedQueriesWarning', () => {
  it('should render nothing when failedQueries is empty', () => {
    const { container } = render(<FailedQueriesWarning failedQueries={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render alert with failed query names', () => {
    render(<FailedQueriesWarning failedQueries={['Query 1', 'Query 2']} />);
    expect(screen.getByTestId('alert')).toBeInTheDocument();
    expect(screen.getByText(/Query 1, Query 2/)).toBeInTheDocument();
  });

  it('should show warning severity', () => {
    render(<FailedQueriesWarning failedQueries={['Query 1']} />);
    expect(screen.getByTestId('alert')).toHaveAttribute('data-severity', 'warning');
  });

  it('should display the correct title', () => {
    render(<FailedQueriesWarning failedQueries={['Q1']} />);
    expect(screen.getByText('Data may be missing')).toBeInTheDocument();
  });
});
