import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryPreview } from './QueryPreview';
import { StandardEditorContext } from '@grafana/data';
import { SimpleOptions } from '../types';

jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

const createMockContext = (options: Partial<SimpleOptions> = {}): StandardEditorContext<SimpleOptions> => ({
  options: {
    queryType: 'label_values',
    metric: '',
    ...options,
  } as SimpleOptions,
  data: [],
});

const defaultProps = {
  value: undefined,
  onChange: jest.fn(),
  item: {} as any,
  id: 'test',
};

describe('QueryPreview', () => {
  it('should render empty state when no query options configured', () => {
    render(
      <QueryPreview
        {...defaultProps}
        context={createMockContext({ queryType: 'label_values', metric: '', label: '' })}
      />
    );

    expect(screen.getByText('Configure query options above')).toBeInTheDocument();
  });

  it('should render label_values query with metric and label', () => {
    render(
      <QueryPreview
        {...defaultProps}
        context={createMockContext({
          queryType: 'label_values',
          metric: 'http_requests_total',
          label: 'handler',
        })}
      />
    );

    expect(screen.getByText('label_values(http_requests_total, handler)')).toBeInTheDocument();
  });

  it('should render label_values query with only label', () => {
    render(
      <QueryPreview
        {...defaultProps}
        context={createMockContext({
          queryType: 'label_values',
          metric: '',
          label: 'job',
        })}
      />
    );

    expect(screen.getByText('label_values(job)')).toBeInTheDocument();
  });

  it('should render label_names query with metric', () => {
    render(
      <QueryPreview
        {...defaultProps}
        context={createMockContext({
          queryType: 'label_names',
          metric: 'up',
        })}
      />
    );

    expect(screen.getByText('label_names(up)')).toBeInTheDocument();
  });

  it('should render label_names query without metric', () => {
    render(
      <QueryPreview
        {...defaultProps}
        context={createMockContext({
          queryType: 'label_names',
          metric: '',
        })}
      />
    );

    expect(screen.getByText('label_names()')).toBeInTheDocument();
  });

  it('should render metrics query with pattern', () => {
    render(
      <QueryPreview
        {...defaultProps}
        context={createMockContext({
          queryType: 'metrics',
          metric: 'http_.*',
        })}
      />
    );

    expect(screen.getByText('metrics(http_.*)')).toBeInTheDocument();
  });

  it('should render metrics query with default pattern when no metric', () => {
    render(
      <QueryPreview
        {...defaultProps}
        context={createMockContext({
          queryType: 'metrics',
          metric: '',
        })}
      />
    );

    expect(screen.getByText('metrics(.*)')).toBeInTheDocument();
  });

  it('should handle undefined options gracefully', () => {
    const contextWithNoOptions = {
      options: undefined,
      data: [],
    } as unknown as StandardEditorContext<SimpleOptions>;

    render(<QueryPreview {...defaultProps} context={contextWithNoOptions} />);

    expect(screen.getByText('Configure query options above')).toBeInTheDocument();
  });

  it('should update when options change', () => {
    const { rerender } = render(
      <QueryPreview
        {...defaultProps}
        context={createMockContext({
          queryType: 'label_values',
          metric: 'metric_a',
          label: 'label_a',
        })}
      />
    );

    expect(screen.getByText('label_values(metric_a, label_a)')).toBeInTheDocument();

    rerender(
      <QueryPreview
        {...defaultProps}
        context={createMockContext({
          queryType: 'label_values',
          metric: 'metric_b',
          label: 'label_b',
        })}
      />
    );

    expect(screen.getByText('label_values(metric_b, label_b)')).toBeInTheDocument();
  });
});

