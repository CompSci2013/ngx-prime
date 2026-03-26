import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, timer } from 'rxjs';
import {
  tap,
  finalize,
  shareReplay,
  retry,
  map,
  distinctUntilChanged
} from 'rxjs/operators';

/**
 * Configuration options for request coordination
 */
export interface RequestConfig {
  /**
   * Cache time-to-live in milliseconds
   * @default 30000
   */
  cacheTTL?: number;

  /**
   * Number of retry attempts on failure
   * @default 3
   */
  retryAttempts?: number;

  /**
   * Initial retry delay in milliseconds (uses exponential backoff)
   * @default 1000
   */
  retryDelay?: number;

  /**
   * Force bypass cache and execute fresh request
   * @default false
   */
  skipCache?: boolean;
}

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  /** Cached response data */
  data: T;
  /** Timestamp when cached (ms since epoch) */
  timestamp: number;
  /** Time-to-live in milliseconds */
  ttl: number;
}

/**
 * Domain-agnostic request coordination service
 *
 * Provides three-layer request processing:
 * 1. Response Cache (TTL-based) - Return cached response if fresh
 * 2. In-Flight Deduplication - Share ongoing requests
 * 3. HTTP Request with Retry - Execute with exponential backoff
 *
 * @example
 * ```typescript
 * // Basic usage
 * this.coordinator.execute(
 *   'vehicles-page-1',
 *   () => this.api.get<Vehicle[]>('/vehicles?page=1')
 * ).subscribe(vehicles => {
 *   console.log('Vehicles:', vehicles);
 * });
 *
 * // With custom configuration
 * this.coordinator.execute(
 *   'stats-latest',
 *   () => this.api.get<Stats>('/stats'),
 *   { cacheTTL: 60000, retryAttempts: 5 }
 * ).subscribe(stats => {
 *   console.log('Statistics:', stats);
 * });
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class RequestCoordinatorService {
  /**
   * Response cache storage
   *
   * Maps request keys to CacheEntry objects containing cached data, timestamp,
   * and TTL. Used by getCachedResponse() for cache hits and setCachedResponse()
   * for storing successful responses.
   *
   * @private
   */
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * In-flight requests storage
   *
   * Maps request keys to Observable instances of ongoing HTTP requests.
   * Enables deduplication: if same request key is requested again before
   * first completes, returns same shared Observable instead of executing new request.
   *
   * @private
   */
  private inFlightRequests = new Map<string, Observable<any>>();

  /**
   * Loading state per request key
   *
   * BehaviorSubject that tracks which requests are currently loading.
   * Maps request key to boolean (true = loading, false/absent = idle).
   * Used internally to emit loadingState$ observable updates.
   *
   * @private
   */
  private loadingStateSubject = new BehaviorSubject<Map<string, boolean>>(
    new Map()
  );

  /**
   * Observable of loading states
   *
   * Public observable stream that emits Map of request keys to loading states.
   * Subscribers can use getLoadingState$() to filter for specific requests
   * or getGlobalLoading$() for overall loading status.
   */
  public loadingState$ = this.loadingStateSubject.asObservable();

  /**
   * Execute HTTP request with caching, deduplication, and retry
   *
   * @template T - Response type
   * @param requestKey - Unique identifier for this request
   * @param requestFn - Function that returns Observable (lazy execution)
   * @param config - Optional request configuration
   * @returns Observable of response data (shared, cached, deduplicated)
   */
  execute<T>(
    requestKey: string,
    requestFn: () => Observable<T>,
    config?: RequestConfig
  ): Observable<T> {
    const effectiveConfig = this.getEffectiveConfig(config);

    // Layer 1: Check response cache (unless skipCache)
    if (!effectiveConfig.skipCache) {
      const cachedResponse = this.getCachedResponse<T>(requestKey);
      if (cachedResponse !== null) {
        return new Observable(observer => {
          observer.next(cachedResponse);
          observer.complete();
        });
      }
    }

    // Layer 2: Check in-flight requests (deduplication)
    if (this.inFlightRequests.has(requestKey)) {
      return this.inFlightRequests.get(requestKey)!;
    }

    // Layer 3: Execute request with retry
    this.setLoadingState(requestKey, true);

    const request$ = requestFn().pipe(
      retry({
        count: effectiveConfig.retryAttempts!,
        delay: (error, retryCount) => {
          const delay =
            effectiveConfig.retryDelay! * Math.pow(2, retryCount - 1);
          return timer(delay);
        }
      }),
      tap(data => {
        // Cache successful response
        if (!effectiveConfig.skipCache) {
          this.setCachedResponse(
            requestKey,
            data,
            effectiveConfig.cacheTTL!
          );
        }
      }),
      finalize(() => {
        // Cleanup: remove from in-flight and update loading state
        this.inFlightRequests.delete(requestKey);
        this.setLoadingState(requestKey, false);
      }),
      shareReplay(1) // Share with multiple subscribers
    );

    // Store in-flight request
    this.inFlightRequests.set(requestKey, request$);

    return request$;
  }

  /**
   * Get loading state for specific request
   *
   * @param requestKey - Request identifier
   * @returns Observable of loading state for this request
   */
  getLoadingState$(requestKey: string): Observable<boolean> {
    return this.loadingState$.pipe(
      map(stateMap => stateMap.get(requestKey) || false),
      distinctUntilChanged()
    );
  }

  /**
   * Get global loading state (true if any request is loading)
   *
   * @returns Observable of global loading state
   */
  getGlobalLoading$(): Observable<boolean> {
    return this.loadingState$.pipe(
      map(stateMap => Array.from(stateMap.values()).some(loading => loading)),
      distinctUntilChanged()
    );
  }

  /**
   * Clear all cached responses or specific request cache
   *
   * @param requestKey - Optional specific request key to clear
   */
  clearCache(requestKey?: string): void {
    if (requestKey) {
      this.cache.delete(requestKey);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Invalidate specific cached response
   *
   * @param requestKey - Request identifier
   */
  invalidateCache(requestKey: string): void {
    this.cache.delete(requestKey);
  }

  /**
   * Invalidate all cached responses matching pattern
   *
   * @param pattern - String pattern to match (simple substring match)
   */
  invalidateCachePattern(pattern: string): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get current cache size
   *
   * @returns Number of cached entries
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Get number of in-flight requests
   *
   * @returns Number of ongoing requests
   */
  getInFlightCount(): number {
    return this.inFlightRequests.size;
  }

  /**
   * Get cached response if exists and not expired
   */
  private getCachedResponse<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Store response in cache
   */
  private setCachedResponse<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Update loading state for request
   */
  private setLoadingState(requestKey: string, loading: boolean): void {
    const currentStates = new Map(this.loadingStateSubject.value);

    if (loading) {
      currentStates.set(requestKey, true);
    } else {
      currentStates.delete(requestKey);
    }

    this.loadingStateSubject.next(currentStates);
  }

  /**
   * Get effective configuration with defaults
   */
  private getEffectiveConfig(config?: RequestConfig): Required<RequestConfig> {
    return {
      cacheTTL: config?.cacheTTL ?? 30000,
      retryAttempts: config?.retryAttempts ?? 3,
      retryDelay: config?.retryDelay ?? 1000,
      skipCache: config?.skipCache ?? false
    };
  }
}
