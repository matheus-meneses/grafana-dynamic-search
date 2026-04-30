import React from 'react';
import { render, screen } from '@testing-library/react';
import { SearchResultsList } from './SearchResultsList';

describe('SearchResultsList', () => {
  it('should render "Searching..." when loading', () => {
    render(
      <SearchResultsList isLoading={true} hasSearched={false} lastResultCount={null} maxResults={0} />
    );
    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('should render nothing when not loading and not searched', () => {
    const { container } = render(
      <SearchResultsList isLoading={false} hasSearched={false} lastResultCount={null} maxResults={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should show "Found N results" after search', () => {
    render(
      <SearchResultsList isLoading={false} hasSearched={true} lastResultCount={5} maxResults={0} />
    );
    expect(screen.getByText('Found 5 results')).toBeInTheDocument();
  });

  it('should use singular "result" for count of 1', () => {
    render(
      <SearchResultsList isLoading={false} hasSearched={true} lastResultCount={1} maxResults={0} />
    );
    expect(screen.getByText('Found 1 result')).toBeInTheDocument();
  });

  it('should show "Showing first N results" when maxResults is hit', () => {
    render(
      <SearchResultsList isLoading={false} hasSearched={true} lastResultCount={10} maxResults={10} />
    );
    expect(screen.getByText('Showing first 10 results')).toBeInTheDocument();
  });

  it('should show "Found 0 results" when no results', () => {
    render(
      <SearchResultsList isLoading={false} hasSearched={true} lastResultCount={0} maxResults={0} />
    );
    expect(screen.getByText('Found 0 results')).toBeInTheDocument();
  });

  it('should apply className prop', () => {
    render(
      <SearchResultsList isLoading={true} hasSearched={false} lastResultCount={null} maxResults={0} className="custom-class" />
    );
    expect(screen.getByText('Searching...').parentElement).toHaveClass('custom-class');
  });
});
