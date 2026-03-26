import { Injectable, NgZone } from '@angular/core';
import { Router, ActivatedRoute, Params, NavigationEnd } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, distinctUntilChanged, filter } from 'rxjs/operators';

/**
 * Domain-agnostic URL state management service
 *
 * Provides bidirectional synchronization between application state and URL query parameters.
 * The URL serves as the single source of truth for application state.
 *
 * @example
 * ```typescript
 * interface MyFilters {
 *   search: string;
 *   page: number;
 *   categories: string[];
 * }
 *
 * // Get current params
 * const filters = urlState.getParams<MyFilters>();
 *
 * // Update URL (triggers navigation)
 * urlState.setParams({ search: 'test', page: 1 });
 *
 * // Watch for changes
 * urlState.watchParams<MyFilters>().subscribe(filters => {
 *   console.log('URL changed:', filters);
 * });
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class UrlStateService {
  /**
   * Subject that holds the current URL query parameters
   *
   * BehaviorSubject that tracks current query parameters from the URL.
   * Emits whenever route query parameters change via router navigation.
   * Initialized in constructor from current route params.
   *
   * @private
   */
  private paramsSubject = new BehaviorSubject<Params>({});

  /**
   * Observable stream of URL query parameters
   *
   * Public observable that emits current and future URL query parameters.
   * Subscribers receive updates whenever the URL query parameters change.
   * Used by watchParams() to provide type-safe filtered streams.
   */
  public params$: Observable<Params> = this.paramsSubject.asObservable();

  /**
   * Constructor for dependency injection
   *
   * Initializes URL state service by reading current route parameters and
   * setting up automatic synchronization with Angular router navigation events.
   *
   * @param router - Angular Router for navigation and state updates
   * @param route - ActivatedRoute for reading current route parameters
   */
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone
  ) {
    // Initialize from current URL
    this.initializeFromRoute();

    // Watch for URL changes
    this.watchRouteChanges();
  }

  /**
   * Get current URL query parameters as a typed object
   *
   * @template TParams - The shape of the parameters object
   * @returns Current query parameters
   */
  getParams<TParams = Params>(): TParams {
    return this.paramsSubject.value as TParams;
  }

  /**
   * Update URL query parameters
   *
   * Performs a shallow merge with existing parameters and navigates to the new URL.
   * Use null or undefined to remove a parameter.
   *
   * @template TParams - The shape of the parameters object
   * @param params - Partial parameters to update
   * @param replaceUrl - If true, replaces current history entry instead of pushing new one
   * @returns Promise that resolves when navigation completes
   *
   * @example
   * ```typescript
   * // Update specific params
   * await urlState.setParams({ page: 2, search: 'test' });
   *
   * // Remove a param by setting to null
   * await urlState.setParams({ search: null });
   *
   * // Replace history entry
   * await urlState.setParams({ page: 1 }, true);
   * ```
   */
  async setParams<TParams = Params>(
    params: Partial<TParams>,
    replaceUrl = false
  ): Promise<boolean> {
    const currentParams = this.paramsSubject.value;
    const mergedParams = { ...currentParams };

    // Merge new params, removing null/undefined values
    Object.keys(params).forEach(key => {
      const value = (params as any)[key];
      if (value === null || value === undefined) {
        delete mergedParams[key];
      } else {
        mergedParams[key] = value;
      }
    });

    return await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: mergedParams,
      replaceUrl,
      queryParamsHandling: '' // Don't preserve, use exact params
    });
  }

  /**
   * Watch URL query parameters as an observable stream
   *
   * @template TParams - The shape of the parameters object
   * @returns Observable of query parameters that emits on every URL change
   *
   * @example
   * ```typescript
   * interface Filters {
   *   search: string;
   *   page: number;
   * }
   *
   * urlState.watchParams<Filters>().subscribe(filters => {
   *   console.log('Filters changed:', filters);
   * });
   * ```
   */
  watchParams<TParams = Params>(): Observable<TParams> {
    return this.params$.pipe(
      map(params => params as TParams),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    );
  }

  /**
   * Clear all URL query parameters
   *
   * @param replaceUrl - If true, replaces current history entry
   * @returns Promise that resolves when navigation completes
   */
  async clearParams(replaceUrl = false): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl
    });
  }

  /**
   * Get a specific query parameter value
   *
   * @param key - Parameter key
   * @returns Parameter value or null if not found
   */
  getParam(key: string): any {
    return this.paramsSubject.value[key] || null;
  }

  /**
   * Set a specific query parameter
   *
   * @param key - Parameter key
   * @param value - Parameter value (null to remove)
   * @param replaceUrl - If true, replaces current history entry
   * @returns Promise that resolves when navigation completes
   */
  async setParam(
    key: string,
    value: any,
    replaceUrl = false
  ): Promise<boolean> {
    return this.setParams({ [key]: value } as any, replaceUrl);
  }

  /**
   * Check if a specific parameter exists in the URL
   *
   * @param key - Parameter key
   * @returns True if parameter exists
   */
  hasParam(key: string): boolean {
    return key in this.paramsSubject.value;
  }

  /**
   * Watch a specific parameter for changes
   *
   * @param key - Parameter key to watch
   * @returns Observable of parameter value
   */
  watchParam(key: string): Observable<any> {
    return this.params$.pipe(
      map(params => params[key] || null),
      distinctUntilChanged()
    );
  }

  /**
   * Serialize parameters to URL query string
   *
   * @param params - Parameters object
   * @returns Query string (without leading '?')
   */
  serializeParams(params: Params): string {
    const queryParams = new URLSearchParams();

    Object.keys(params).forEach(key => {
      const value = params[key];

      // Skip null/undefined
      if (value === null || value === undefined) {
        return;
      }

      // Handle arrays (comma-separated)
      if (Array.isArray(value)) {
        queryParams.set(key, value.join(','));
        return;
      }

      // Convert to string
      queryParams.set(key, String(value));
    });

    return queryParams.toString();
  }

  /**
   * Deserialize URL query string to parameters object
   *
   * @param queryString - Query string (with or without leading '?')
   * @returns Parameters object
   */
  deserializeParams(queryString: string): Params {
    const params: Params = {};
    const urlParams = new URLSearchParams(
      queryString.startsWith('?') ? queryString.slice(1) : queryString
    );

    urlParams.forEach((value, key) => {
      // Try to parse as number
      if (!isNaN(Number(value)) && value !== '') {
        params[key] = Number(value);
        return;
      }

      // Try to parse as boolean
      if (value === 'true' || value === 'false') {
        params[key] = value === 'true';
        return;
      }

      // Check for comma-separated values (arrays)
      if (value.includes(',')) {
        params[key] = value.split(',');
        return;
      }

      // Keep as string
      params[key] = value;
    });

    return params;
  }

  /**
   * Initialize from current route
   *
   * IMPORTANT: Uses router.url instead of route.snapshot because UrlStateService
   * is a root singleton. Root-level ActivatedRoute.snapshot may not have query
   * params from child routes (like /discover). router.url contains the full URL.
   */
  private initializeFromRoute(): void {
    const params = this.extractQueryParams();
    this.ngZone.run(() => {
      this.paramsSubject.next(params);
    });
  }

  /**
   * Watch for route changes and update internal state
   *
   * IMPORTANT: Uses Router.events instead of ActivatedRoute.queryParams because
   * UrlStateService is a root singleton. Root-level ActivatedRoute doesn't receive
   * query param updates from child routes (like /discover). Router.events is global
   * and captures all navigation events including query parameter changes.
   */
  private watchRouteChanges(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map(() => this.extractQueryParams()),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(params => {
        this.ngZone.run(() => {
          this.paramsSubject.next(params);
        });
      });
  }

  /**
   * Extract query parameters from current router state
   */
  private extractQueryParams(): Params {
    const urlTree = this.router.parseUrl(this.router.url);
    return urlTree.queryParams;
  }
}
