/**
 * Filter Options Service
 *
 * Caches filter dropdown options to support URL-First architecture.
 * In main window: fetches and caches options from API
 * In popout window: receives cached options via STATE_UPDATE broadcast
 *
 * This service ensures popout windows don't make direct API calls for filter options.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { FilterOption } from '../../config/models/filter-definition.interface';

/**
 * Cached options for a single filter field
 */
export interface CachedFilterOptions {
  /** Filter field identifier (e.g., 'manufacturer', 'bodyClass') */
  field: string;
  /** Endpoint URL used to fetch options */
  endpoint: string;
  /** Cached options array */
  options: FilterOption[];
  /** Raw API response (for filters that need custom transformation) */
  rawResponse?: any;
  /** Timestamp when options were cached */
  cachedAt: number;
}

/**
 * Complete filter options cache
 */
export interface FilterOptionsCache {
  /** Map of endpoint URL to cached options */
  [endpoint: string]: CachedFilterOptions;
}

@Injectable({
  providedIn: 'root'
})
export class FilterOptionsService {
  /**
   * Cache of filter options by endpoint URL
   */
  private cache: FilterOptionsCache = {};

  /**
   * Observable of the current cache state
   */
  private cache$ = new BehaviorSubject<FilterOptionsCache>({});

  constructor(private apiService: ApiService) {}

  /**
   * Get the current cache for inclusion in state broadcasts
   */
  getCache(): FilterOptionsCache {
    return { ...this.cache };
  }

  /**
   * Get observable of cache changes
   */
  getCache$(): Observable<FilterOptionsCache> {
    return this.cache$.asObservable();
  }

  /**
   * Load options from cache or fetch from API
   *
   * @param endpoint - API endpoint URL
   * @param field - Filter field identifier
   * @param transformer - Optional function to transform API response to FilterOption[]
   * @returns Observable of filter options
   */
  getOptions(
    endpoint: string,
    field: string,
    transformer?: (response: any) => FilterOption[]
  ): Observable<FilterOption[]> {
    // Check cache first
    const cached = this.cache[endpoint];
    if (cached) {
      // If transformer provided and we have raw response, re-transform
      // (in case transformer logic changed)
      if (transformer && cached.rawResponse) {
        return of(transformer(cached.rawResponse));
      }
      return of(cached.options);
    }

    // Fetch from API
    return this.apiService.get(endpoint).pipe(
      tap(response => {
        // Cache raw response and transformed options
        const options = transformer ? transformer(response) : [];
        this.cache[endpoint] = {
          field,
          endpoint,
          options,
          rawResponse: response,
          cachedAt: Date.now()
        };
        this.cache$.next({ ...this.cache });
      }),
      map(response => transformer ? transformer(response) : []),
      catchError(error => {
        console.error(`[FilterOptionsService] Failed to load options from ${endpoint}:`, error);
        throw error;
      })
    );
  }

  /**
   * Get raw API response from cache (for range filters that need min/max)
   *
   * @param endpoint - API endpoint URL
   * @returns Cached raw response or null
   */
  getRawResponse(endpoint: string): any | null {
    return this.cache[endpoint]?.rawResponse ?? null;
  }

  /**
   * Load raw response from cache or fetch from API
   *
   * @param endpoint - API endpoint URL
   * @param field - Filter field identifier
   * @returns Observable of raw API response
   */
  getRawResponseAsync(endpoint: string, field: string): Observable<any> {
    // Check cache first
    const cached = this.cache[endpoint];
    if (cached?.rawResponse) {
      return of(cached.rawResponse);
    }

    // Fetch from API
    return this.apiService.get(endpoint).pipe(
      tap(response => {
        this.cache[endpoint] = {
          field,
          endpoint,
          options: [],
          rawResponse: response,
          cachedAt: Date.now()
        };
        this.cache$.next({ ...this.cache });
      }),
      catchError(error => {
        console.error(`[FilterOptionsService] Failed to load from ${endpoint}:`, error);
        throw error;
      })
    );
  }

  /**
   * Sync cache from external source (used by popout windows)
   *
   * Called when popout receives STATE_UPDATE with filterOptionsCache
   *
   * @param externalCache - Cache received from main window
   */
  syncFromExternal(externalCache: FilterOptionsCache): void {
    if (!externalCache) return;

    // Merge external cache into local cache
    this.cache = { ...this.cache, ...externalCache };
    this.cache$.next({ ...this.cache });
  }

  /**
   * Check if options are cached for an endpoint
   */
  isCached(endpoint: string): boolean {
    return !!this.cache[endpoint];
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache = {};
    this.cache$.next({});
  }
}
