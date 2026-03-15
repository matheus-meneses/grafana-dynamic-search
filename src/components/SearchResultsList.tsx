import React from 'react';

interface Props {
  isLoading: boolean;
  hasSearched: boolean;
  lastResultCount: number | null;
  maxResults: number;
  className?: string;
}

export const SearchResultsList: React.FC<Props> = ({
  isLoading,
  hasSearched,
  lastResultCount,
  maxResults,
  className,
}) => {
  if (isLoading) {
    return <div className={className}><span>Searching...</span></div>;
  }

  if (hasSearched && lastResultCount !== null) {
    return (
      <div className={className}>
        <span>
          {lastResultCount === maxResults && maxResults > 0
            ? `Showing first ${maxResults} results`
            : `Found ${lastResultCount} result${lastResultCount === 1 ? '' : 's'}`}
        </span>
      </div>
    );
  }

  return null;
};
