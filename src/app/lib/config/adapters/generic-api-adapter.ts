/**
 * Generic API Adapter
 *
 * A configuration-driven API adapter that reads from a ResourceDefinition
 * to convert filter objects into API query parameters and fetch data.
 *
 * This replaces domain-specific API adapters like AutomobileApiAdapter,
 * reducing boilerplate as documented in docs/audit/refactor.md.
 *
 * @example
 * ```typescript
 * const adapter = new GenericApiAdapter(
 *   apiService,
 *   AUTOMOBILE_RESOURCE,
 *   'http://api.example.com/v1',
 *   VehicleResult.fromApiResponse,
 *   VehicleStatistics.fromApiResponse
 * );
 *
 * adapter.fetchData(filters, highlights).subscribe(response => {
 *   console.log('Results:', response.results);
 *   console.log('Total:', response.total);
 *   console.log('Statistics:', response.statistics);
 * });
 * ```
 */

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IApiAdapter, ApiAdapterResponse } from '../../state-management/models/resource-management.interface';
import { ApiResponse } from '../../state-management/models/api-response.interface';
import { ApiService } from '../../state-management/services/api.service';
import {
  ResourceDefinition,
  ResourceField,
  getApiParamName,
  DEFAULT_HIGHLIGHTS
} from '../models/resource-definition.interface';

/**
 * Response transformer function type
 *
 * Converts raw API response items to domain model instances.
 */
export type ResponseTransformer<T> = (item: any) => T;

/**
 * Generic API Adapter Configuration
 */
export interface GenericApiAdapterConfig<TData, TStatistics> {
  /**
   * Base URL for API requests
   */
  baseUrl: string;

  /**
   * Transform function for data results
   */
  dataTransformer: ResponseTransformer<TData>;

  /**
   * Transform function for statistics (optional)
   */
  statisticsTransformer?: ResponseTransformer<TStatistics>;

  /**
   * Custom endpoint override (defaults to definition.endpoints.search)
   */
  searchEndpoint?: string;

  /**
   * Custom statistics endpoint override (defaults to definition.endpoints.stats)
   */
  statsEndpoint?: string;
}

/**
 * Generic API Adapter
 *
 * Implements IApiAdapter using a ResourceDefinition as the configuration source.
 * Automatically handles:
 * - Filter to API parameter mapping
 * - Pagination (page, size)
 * - Sorting (sortBy, sortOrder)
 * - Highlight parameters (h_* prefix)
 * - Response transformation
 *
 * @template TFilters - The filter object type
 * @template TData - The data result type
 * @template TStatistics - The statistics type
 */
export class GenericApiAdapter<
  TFilters extends Record<string, any>,
  TData,
  TStatistics = any
> implements IApiAdapter<TFilters, TData, TStatistics> {
  private readonly definition: ResourceDefinition;
  private readonly apiService: ApiService;
  private readonly config: GenericApiAdapterConfig<TData, TStatistics>;
  private readonly highlightPrefix: string;

  constructor(
    apiService: ApiService,
    definition: ResourceDefinition,
    config: GenericApiAdapterConfig<TData, TStatistics>
  ) {
    this.apiService = apiService;
    this.definition = definition;
    this.config = config;

    // Highlight configuration
    const highlights = definition.highlights ?? DEFAULT_HIGHLIGHTS;
    this.highlightPrefix = highlights.prefix;
  }

  /**
   * Fetch data from API based on filters
   *
   * @param filters - Filter object
   * @param highlights - Optional highlight filters (h_* parameters)
   * @returns Observable of API response
   */
  fetchData(
    filters: TFilters,
    highlights?: any
  ): Observable<ApiAdapterResponse<TData, TStatistics>> {
    const params = this.filtersToApiParams(filters, highlights);
    const endpoint = this.config.searchEndpoint ?? this.definition.endpoints.search;
    const url = `${this.config.baseUrl}${endpoint}`;

    return this.apiService
      .get<TData>(url, { params })
      .pipe(
        map((apiResponse: ApiResponse<TData>) => this.transformResponse(apiResponse))
      );
  }

  /**
   * Convert filter object to API query parameters
   *
   * @param filters - Filter object
   * @param highlights - Optional highlight filters
   * @returns API query parameters
   */
  filtersToApiParams(
    filters: TFilters,
    highlights?: any
  ): Record<string, any> {
    const params: Record<string, any> = {};

    // Process each field in the definition
    for (const field of this.definition.fields) {
      const value = filters[field.name as keyof TFilters];

      // Skip undefined/null values
      if (value === undefined || value === null) {
        continue;
      }

      // Use custom API mapper if provided
      if (field.customApiMapper) {
        const customParams = field.customApiMapper(value);
        Object.assign(params, customParams);
        continue;
      }

      // Get API parameter name
      const apiParam = getApiParamName(field);

      // Add to params (API service will handle serialization)
      params[apiParam] = value;
    }

    // Handle sorting with URL param names (sortBy, sortOrder)
    // The definition may have different internal names (sort, sortDirection)
    this.handleSorting(filters, params);

    // Add highlight parameters
    if (highlights) {
      this.addHighlightParams(highlights, params);
    }

    return params;
  }

  /**
   * Handle sorting parameters with proper API param names
   */
  private handleSorting(filters: TFilters, params: Record<string, any>): void {
    const sorting = this.definition.sorting;
    if (!sorting) return;

    // Find the sort field in filters
    const sortFieldName = this.findSortFieldName();
    const sortDirFieldName = this.findSortDirectionFieldName();

    if (sortFieldName && filters[sortFieldName as keyof TFilters]) {
      // Use the URL param name for API (typically 'sortBy')
      params[sorting.sortFieldParam ?? 'sortBy'] = filters[sortFieldName as keyof TFilters];
      // Remove the internal name if different
      if (sortFieldName !== (sorting.sortFieldParam ?? 'sortBy')) {
        delete params[sortFieldName];
      }
    }

    if (sortDirFieldName && filters[sortDirFieldName as keyof TFilters]) {
      // Use the URL param name for API (typically 'sortOrder')
      params[sorting.sortDirectionParam ?? 'sortOrder'] = filters[sortDirFieldName as keyof TFilters];
      // Remove the internal name if different
      if (sortDirFieldName !== (sorting.sortDirectionParam ?? 'sortOrder')) {
        delete params[sortDirFieldName];
      }
    }
  }

  /**
   * Find the field name used for sort field in the definition
   */
  private findSortFieldName(): string | undefined {
    const sortParam = this.definition.sorting?.sortFieldParam ?? 'sortBy';
    // Look for a field with urlParam matching sortBy, or name 'sort'
    const field = this.definition.fields.find(f =>
      f.urlParam === sortParam || f.name === 'sort' || f.name === sortParam
    );
    return field?.name;
  }

  /**
   * Find the field name used for sort direction in the definition
   */
  private findSortDirectionFieldName(): string | undefined {
    const sortDirParam = this.definition.sorting?.sortDirectionParam ?? 'sortOrder';
    // Look for a field with urlParam matching sortOrder, or name 'sortDirection'
    const field = this.definition.fields.find(f =>
      f.urlParam === sortDirParam || f.name === 'sortDirection' || f.name === sortDirParam
    );
    return field?.name;
  }

  /**
   * Add highlight parameters (h_* prefix) to API params
   */
  private addHighlightParams(highlights: any, params: Record<string, any>): void {
    for (const [key, value] of Object.entries(highlights)) {
      if (value === undefined || value === null) continue;

      // Add h_ prefix if not already present
      const paramName = key.startsWith(this.highlightPrefix)
        ? key
        : `${this.highlightPrefix}${key}`;

      params[paramName] = value;
    }
  }

  /**
   * Transform API response to adapter response format
   */
  private transformResponse(
    apiResponse: ApiResponse<TData>
  ): ApiAdapterResponse<TData, TStatistics> {
    return {
      results: apiResponse.results.map(item => this.config.dataTransformer(item)),
      total: apiResponse.total,
      statistics: apiResponse.statistics && this.config.statisticsTransformer
        ? this.config.statisticsTransformer(apiResponse.statistics)
        : apiResponse.statistics as TStatistics | undefined
    };
  }

  /**
   * Get the search endpoint URL
   */
  getSearchEndpoint(): string {
    return `${this.config.baseUrl}${this.config.searchEndpoint ?? this.definition.endpoints.search}`;
  }

  /**
   * Get the statistics endpoint URL (if configured)
   */
  getStatsEndpoint(): string | undefined {
    const endpoint = this.config.statsEndpoint ?? this.definition.endpoints.stats;
    return endpoint ? `${this.config.baseUrl}${endpoint}` : undefined;
  }
}

/**
 * Factory function to create a GenericApiAdapter
 *
 * @param apiService - ApiService instance
 * @param definition - ResourceDefinition
 * @param config - Adapter configuration
 * @returns Configured GenericApiAdapter instance
 */
export function createApiAdapter<
  TFilters extends Record<string, any>,
  TData,
  TStatistics = any
>(
  apiService: ApiService,
  definition: ResourceDefinition,
  config: GenericApiAdapterConfig<TData, TStatistics>
): GenericApiAdapter<TFilters, TData, TStatistics> {
  return new GenericApiAdapter<TFilters, TData, TStatistics>(
    apiService,
    definition,
    config
  );
}
