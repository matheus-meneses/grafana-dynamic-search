import { renderHook, act, waitFor } from '@testing-library/react';
import { useDynamicSearch } from './useDynamicSearch';
import { getDataSourceSrv, locationService } from '@grafana/runtime';
import { SEARCH_MODE, QUERY_TYPE, SimpleOptions } from '../types';

jest.mock('@grafana/runtime', () => ({
  getDataSourceSrv: jest.fn(),
  locationService: {
    partial: jest.fn(),
  },
}));

const mockDatasource = {
  get: jest.fn(),
};

const mockDsInstance = {
  metricFindQuery: jest.fn(),
};

(getDataSourceSrv as jest.Mock).mockReturnValue(mockDatasource);
mockDatasource.get.mockResolvedValue(mockDsInstance);

const defaultOptions: SimpleOptions = {
  datasourceUid: 'ds-1',
  queries: [
    {
      id: 'q1',
      queryType: QUERY_TYPE.LABEL_VALUES,
      label: 'job',
      metric: 'up',
    },
  ],
  variableName: 'testVar',
  minChars: 3,
  maxResults: 10,
  searchMode: SEARCH_MODE.CONTAINS,
};

describe('useDynamicSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDsInstance.metricFindQuery.mockResolvedValue([]);
  });

  it('should initialize with value from URL/store', () => {
    const { result } = renderHook(() => useDynamicSearch({ 
        options: defaultOptions, 
        resolvedDatasourceUid: 'ds-1' 
    }));
    expect(result.current.selectedValue).toBeNull();
  });

  it('should not search if input is shorter than minChars', async () => {
    const { result } = renderHook(() => useDynamicSearch({ 
        options: defaultOptions, 
        resolvedDatasourceUid: 'ds-1' 
    }));

    let results: Array<{ label: string; value: string; description?: string }> = [];
    await act(async () => {
      results = await result.current.loadOptions('ab');
    });

    expect(results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(mockDsInstance.metricFindQuery).not.toHaveBeenCalled();
  });

  it('should search after debounce when input is valid', async () => {
    mockDsInstance.metricFindQuery.mockResolvedValue([{ text: 'abc-result', value: 'v1' }]);
    
    const { result } = renderHook(() => useDynamicSearch({ 
        options: defaultOptions, 
        resolvedDatasourceUid: 'ds-1' 
    }));

    await act(async () => {
        result.current.loadOptions('abc');
    });

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.hasSearched).toBe(true);
        expect(result.current.lastResultCount).toBe(1);
    }, { timeout: 1000 });

    expect(mockDsInstance.metricFindQuery).toHaveBeenCalled();
  });

  it('should handle query failure gracefully', async () => {
    mockDsInstance.metricFindQuery.mockRejectedValue(new Error('API Error'));
    
    const { result } = renderHook(() => useDynamicSearch({ 
        options: defaultOptions, 
        resolvedDatasourceUid: 'ds-1' 
    }));

    await act(async () => {
        result.current.loadOptions('abc');
    });

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.failedQueries).toEqual(['Query 1']);
    }, { timeout: 1000 });

    expect(result.current.lastResultCount).toBe(0);
  });

  it('should handle selection and update location', () => {
    const { result } = renderHook(() => useDynamicSearch({ 
        options: defaultOptions, 
        resolvedDatasourceUid: 'ds-1' 
    }));

    act(() => {
        result.current.handleChange({ label: 'Selected', value: 'val1' });
    });

    expect(result.current.selectedValue?.value).toBe('val1');
    expect(locationService.partial).toHaveBeenCalledWith({ 'var-testVar': 'val1' }, true);
  });

  it('should clear selection when input is emptied', () => {
    const { result } = renderHook(() => useDynamicSearch({ 
        options: defaultOptions, 
        resolvedDatasourceUid: 'ds-1' 
    }));

    act(() => {
        result.current.handleChange({ label: 'Selected', value: 'val1' });
    });
    expect(result.current.selectedValue?.value).toBe('val1');

    act(() => {
        result.current.handleChange(null);
    });

    expect(result.current.selectedValue).toBeNull();
    expect(locationService.partial).toHaveBeenCalledWith({ 'var-testVar': '' }, true);
  });
});
