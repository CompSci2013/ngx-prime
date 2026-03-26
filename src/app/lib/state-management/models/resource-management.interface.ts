import { Observable } from 'rxjs';
import { Params } from '@angular/router';

/**
 * Adapter for mapping filters to/from URL parameters
 *
 * @template TFilters - The shape of the filter object
 */
export interface IFilterUrlMapper<TFilters> {
  /**
   * Convert filters to URL query parameters
   *
   * @param filters - Filter object
   * @returns URL query parameters
   */
  toUrlParams(filters: TFilters): Params;

  /**
   * Convert URL query parameters to filters
   *
   * @param params - URL query parameters
   * @returns Filter object
   */
  fromUrlParams(params: Params): TFilters;

  /**
   * Extract highlight filters from URL parameters (optional)
   *
   * Domain-specific strategy for identifying "highlight" parameters.
   * If not implemented, the framework assumes no highlights are present.
   *
   * @param params - URL query parameters
   * @returns Highlight filters object (domain-specific structure)
   */
  extractHighlights?(params: Params): any;
}

/**
 * Response from API adapter
 */
export interface ApiAdapterResponse<TData, TStatistics = any> {
  /**
   * Array of data results
   */
  results: TData[];

  /**
   * Total count of results (unpaginated)
   */
  total: number;

  /**
   * Optional statistics/aggregations
   */
  statistics?: TStatistics;
}

/**
 * Adapter for fetching data from API
 *
 * @template TFilters - The shape of the filter object
 * @template TData - The shape of individual data items
 * @template TStatistics - The shape of statistics object (optional)
 */
export interface IApiAdapter<TFilters, TData, TStatistics = any> {
  /**
   * Fetch data from API based on filters
   *
   * @param filters - Filter object
   * @param highlights - Optional highlight filters (h_* parameters for segmented statistics)
   * @returns Observable of API response
   */
  fetchData(
    filters: TFilters,
    highlights?: any
  ): Observable<ApiAdapterResponse<TData, TStatistics>>;
}

/**
 * Adapter for building cache keys from filters
 *
 * @template TFilters - The shape of the filter object
 */
export interface ICacheKeyBuilder<TFilters> {
  /**
   * Build a unique cache key from filters
   *
   * @param filters - Filter object
   * @param highlights - Optional highlight filters (must be included in cache key)
   * @returns Cache key string
   */
  buildKey(filters: TFilters, highlights?: any): string;
}

/**
 * Configuration for ResourceManagementService
 */
export interface ResourceManagementConfig<TFilters, TData, TStatistics = any> {
  /**
   * Filter to URL parameter mapper
   */
  filterMapper: IFilterUrlMapper<TFilters>;

  /**
   * API data fetcher
   */
  apiAdapter: IApiAdapter<TFilters, TData, TStatistics>;

  /**
   * Cache key builder
   */
  cacheKeyBuilder: ICacheKeyBuilder<TFilters>;

  /**
   * Default filter values
   */
  defaultFilters: TFilters;

  /**
   * Whether to enable automatic data fetching on filter changes
   * Default: true
   */
  autoFetch?: boolean;

  /**
   * Cache TTL in milliseconds
   * Default: 30000 (30 seconds)
   */
  cacheTTL?: number;

  /**
   * @deprecated Use IFilterUrlMapper.extractHighlights() instead.
   * Whether to support highlight filters (h_* parameters)
   * Default: false
   */
  supportsHighlights?: boolean;

  /**
   * @deprecated Use IFilterUrlMapper.extractHighlights() instead.
   * Prefix for highlight parameters in URL
   * Default: 'h_'
   */
  highlightPrefix?: string;
}

/**
 * State managed by ResourceManagementService
 */
export interface ResourceState<TFilters, TData, TStatistics = any> {
  /**
   * Current filter values
   */
  filters: TFilters;

  /**
   * Data results
   */
  results: TData[];

  /**
   * Total count of results (unpaginated)
   */
  totalResults: number;

  /**
   * Loading state
   */
  loading: boolean;

  /**
   * Error state
   */
  error: Error | null;

  /**
   * Optional statistics/aggregations
   */
  statistics?: TStatistics;

  /**
   * Optional highlight filters (h_* parameters)
   * UI-only state for data highlighting
   */
  highlights?: any;
}
