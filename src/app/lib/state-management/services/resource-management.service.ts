import { Inject, Injectable, NgZone, OnDestroy, Optional } from '@angular/core';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  finalize,
  map,
  takeUntil
} from 'rxjs/operators';
import { DomainConfig } from '../../config/models/domain-config.interface';
import {
  ResourceManagementConfig,
  ResourceState
} from '../models/resource-management.interface';
import { DOMAIN_CONFIG } from '../../config/services/domain-config-registry.service';
import { UrlStateService } from './url-state.service';
import { IS_POPOUT_TOKEN } from '../tokens/popout.token';

/**
 * Generic resource management service - Core state orchestrator for URL-first architecture
 *
 * **Purpose**: Manages application state with URL as single source of truth.
 * Coordinates filter changes, API calls, state updates, and cross-window synchronization.
 *
 * **Architecture**: URL → Filters → API → Data → Components
 *
 * **Key Features**:
 * - URL-first design: URL parameters are the single source of truth
 * - Domain-agnostic: Works with any domain via DOMAIN_CONFIG injection
 * - Component-level injection: New instance per component (e.g., DiscoverComponent, PanelPopoutComponent)
 * - Pop-out aware: Automatically disables API calls in pop-out windows
 * - Highlight support: Filters with h_ prefix for highlighted results
 * - Observable streams: filters$, results$, statistics$, loading$, error$
 *
 * **State Flow**:
 * ```
 * 1. URL Changes
 *    ↓
 * 2. watchUrlChanges() detects URL param change
 *    ↓
 * 3. filterMapper.fromUrlParams() converts URL → TFilters
 *    ↓
 * 4. updateState() updates internal BehaviorSubject
 *    ↓
 * 5. Components subscribe to filters$, results$, etc. → re-render
 *    ↓
 * 6. If autoFetch=true: fetchData() calls API
 *    ↓
 * 7. API response → updateState() → components re-render
 * ```
 *
 * **Pop-Out Architecture**:
 * - Main window: URL change → fetchData() → API → updateState()
 * - Main window: Broadcasts state via BroadcastChannel
 * - Pop-out window: Receives state via syncStateFromExternal() → NO API call
 * - Pop-out window: Components use same observable streams (filters$, results$, etc.)
 *
 * **Configuration via DOMAIN_CONFIG**:
 * - filterMapper: Converts between URL params ↔ TFilters objects
 * - apiAdapter: Calls API with filters/highlights, returns results
 * - cacheKeyBuilder: Generates cache keys (not currently used)
 * - defaultFilters: Initial filter values when no URL params present
 *
 * @template TFilters - The shape of filter objects (e.g., AutoSearchFilters)
 * @template TData - The shape of individual data items (e.g., VehicleResult)
 * @template TStatistics - The shape of statistics objects (e.g., VehicleStatistics)
 *
 * @example
 * ```typescript
 * // In DiscoverComponent
 * @Component({
 *   providers: [ResourceManagementService] // New instance per component
 * })
 * export class DiscoverComponent {
 *   constructor(
 *     @Inject(DOMAIN_CONFIG) domainConfig: DomainConfig<...>,
 *     public resourceService: ResourceManagementService<...>
 *   ) {}
 *
 *   ngOnInit() {
 *     // Subscribe to state changes
 *     this.resourceService.filters$.subscribe(filters => {
 *       // Re-render filter UI
 *     });
 *
 *     this.resourceService.results$.subscribe(results => {
 *       // Re-render results table
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export class ResourceManagementService<TFilters, TData, TStatistics = any>
  implements OnDestroy {
  /**
   * Internal state BehaviorSubject
   *
   * Single source of truth for all service state (filters, results, loading, error, statistics).
   * All public observable streams (state$, filters$, results$, etc.) are derived from this subject.
   * Updated by updateState() when URL changes or API calls complete.
   *
   * @private
   */
  private stateSubject: BehaviorSubject<
    ResourceState<TFilters, TData, TStatistics>
  >;

  /**
   * RxJS Subject for component destruction cleanup
   *
   * Emits when ngOnDestroy is called, signaling all subscribers to
   * unsubscribe. Used with takeUntil() in internal subscriptions.
   *
   * @private
   */
  private destroy$ = new Subject<void>();

  /**
   * Service configuration from DOMAIN_CONFIG
   *
   * Merged configuration containing:
   * - filterMapper: URL ↔ filter object conversion
   * - apiAdapter: API calls for this domain
   * - defaultFilters: Initial filter values
   * - autoFetch: Whether to call API (disabled in pop-outs)
   *
   * @private
   */
  private config: ResourceManagementConfig<TFilters, TData, TStatistics>;

  /**
   * Observable of complete state
   */
  public state$: Observable<ResourceState<TFilters, TData, TStatistics>>;

  /**
   * Observable of current filters
   */
  public filters$: Observable<TFilters>;

  /**
   * Observable of data results
   */
  public results$: Observable<TData[]>;

  /**
   * Observable of total results count
   */
  public totalResults$: Observable<number>;

  /**
   * Observable of loading state
   */
  public loading$: Observable<boolean>;

  /**
   * Observable of error state
   */
  public error$: Observable<Error | null>;

  /**
   * Observable of statistics
   */
  public statistics$: Observable<TStatistics | undefined>;

  /**
   * Observable of highlight filters
   */
  public highlights$: Observable<any>;

  /**
   * Constructor for dependency injection
   *
   * Initializes service with domain configuration and sets up state management,
   * observable streams, and URL/pop-out synchronization.
   *
   * @param urlState - UrlStateService for URL parameter synchronization
   * @param domainConfig - Domain configuration with filter mappers and API adapters (injected)
   * @param ngZone - Angular NgZone
   * @param isPopOutToken - Optional injection token to explicitly signal pop-out context
   */
  constructor(
    private urlState: UrlStateService,
    @Inject(DOMAIN_CONFIG)
    private domainConfig: DomainConfig<TFilters, TData, TStatistics>,
    private ngZone: NgZone,
    @Optional() @Inject(IS_POPOUT_TOKEN) private isPopOutToken: boolean
  ) {
    // STEP 1: Extract configuration from domain config
    // The domain config contains domain-specific implementations that work with generic types.
    // We wrap them in a ResourceManagementConfig for consistent internal usage.
    this.config = {
      filterMapper: this.domainConfig.urlMapper,     // Converts URL params ↔ filter objects
      apiAdapter: this.domainConfig.apiAdapter,       // API client for this domain
      cacheKeyBuilder: this.domainConfig.cacheKeyBuilder,
      defaultFilters: (this.domainConfig.defaultFilters || {}) as TFilters,
      supportsHighlights: this.domainConfig.features?.highlights ?? false,
      highlightPrefix: 'h_',
      // **Pop-out aware**: Service disables API calls when running in pop-out windows.
      // Pop-outs receive state from main window via BroadcastChannel (syncStateFromExternal).
      // This prevents duplicate API calls and ensures state consistency.
      // CDK Portal approach shares parent DI context, so IS_POPOUT_TOKEN is the only signal needed.
      autoFetch: this.isPopOutToken ? false : true
    };

    // STEP 2: Initialize internal state BehaviorSubject
    // This is the single source of truth for all state within this service instance.
    // Every component will subscribe to streams derived from this subject.
    this.stateSubject = new BehaviorSubject<
      ResourceState<TFilters, TData, TStatistics>
    >({
      filters: this.config.defaultFilters,  // Start with domain defaults
      results: [],                           // Empty until first fetch
      totalResults: 0,
      loading: false,
      error: null,
      statistics: undefined
    });

    // STEP 3: Create observable streams for component consumption
    // Components subscribe to these observables, not the BehaviorSubject directly.
    // Each stream uses RxJS operators to:
    // - Extract specific state properties (map)
    // - Skip unchanged values (distinctUntilChanged)
    // - Allow proper change detection and subscriptions
    this.state$ = this.stateSubject.asObservable();

    // Stream for filter changes (used by QueryControl, Pickers, etc.)
    this.filters$ = this.state$.pipe(
      map(state => state.filters),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    );

    // Stream for results data (used by ResultsTable)
    this.results$ = this.state$.pipe(
      map(state => state.results),
      distinctUntilChanged()
    );

    // Stream for total result count (used for pagination)
    this.totalResults$ = this.state$.pipe(
      map(state => state.totalResults),
      distinctUntilChanged()
    );

    // Stream for loading indicator (used by spinner components)
    this.loading$ = this.state$.pipe(
      map(state => state.loading),
      distinctUntilChanged()
    );

    // Stream for error state (used for error messages)
    this.error$ = this.state$.pipe(
      map(state => state.error),
      distinctUntilChanged()
    );

    // Stream for statistics/aggregations (used by StatisticsPanel)
    this.statistics$ = this.state$.pipe(
      map(state => state.statistics),
      distinctUntilChanged()
    );

    // Stream for highlight filters (h_ prefixed params)
    this.highlights$ = this.state$.pipe(
      map(state => state.highlights || {}),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    );

    // STEP 4: Bootstrap state management
    // - Initialize filters from current URL (before fetchData)
    // - Watch for future URL changes and react accordingly
    this.initializeFromUrl();
    this.watchUrlChanges();
  }

  /**
   * Update filters (triggers URL update → data fetch in main window)
   *
   * Flow: updateFilters() → filterMapper.toUrlParams() → setParams() → URL change →
   * watchUrlChanges() → fetchData() (if autoFetch) → updateState() → observables emit
   *
   * **Note on undefined/null values**: Pass undefined or null to remove a filter parameter.
   * Example: `updateFilters({ search: undefined })` removes the search param from URL.
   *
   * @param partial - Partial filter updates (undefined/null values remove keys)
   *
   * @example
   * ```typescript
   * // Add/update filters
   * this.resourceService.updateFilters({ manufacturer: 'Toyota', year: 2020 });
   * // URL becomes: ?manufacturer=Toyota&year=2020
   *
   * // Remove a filter
   * this.resourceService.updateFilters({ year: undefined });
   * // URL becomes: ?manufacturer=Toyota (year param removed)
   *
   * // Clear all filters by resetting to defaults
   * this.resourceService.clearFilters();
   * ```
   */
  updateFilters(partial: Partial<TFilters>): void {
    const currentFilters = this.stateSubject.value.filters;
    const merged = { ...currentFilters, ...partial };

    // Step 1: Clean up filters (remove empty values)
    // Filter objects may have undefined/null/empty strings which should not go to URL
    const newFilters: Record<string, any> = {};
    for (const key of Object.keys(merged)) {
      const value = (merged as Record<string, any>)[key];
      // Keep only truthy values (exclude undefined, null, and empty strings)
      if (value !== undefined && value !== null && value !== '') {
        newFilters[key] = value;
      }
    }

    // Step 2: Convert filter objects to URL parameters
    // filterMapper.toUrlParams() uses domain-specific logic to serialize filters
    // Example: { manufacturer: 'Toyota', models: ['Camry', 'Corolla'] }
    //          → { manufacturer: 'Toyota', models: 'Camry,Corolla' }
    const newUrlParams = this.config.filterMapper.toUrlParams(
      newFilters as TFilters
    );

    // Step 3: Get current URL params to identify which ones need to be removed
    // We need to explicitly set removed params to null so UrlStateService removes them from URL
    const currentUrlParams = this.config.filterMapper.toUrlParams(currentFilters);

    // Step 4: Build final params object with null values for removed params
    // Angular Router will ignore null values when navigating, effectively removing them
    const finalParams: Record<string, any> = { ...newUrlParams };
    for (const key of Object.keys(currentUrlParams)) {
      if (!(key in newUrlParams)) {
        // This param was present before but not now - mark for removal by setting to null
        finalParams[key] = null;
      }
    }

    // Step 5: Update URL
    // This triggers Router navigation, which causes Angular to emit NavigationEnd event.
    // watchUrlChanges() listens for these events and updates state accordingly.
    // If autoFetch=true, fetchData() is called to get new results from API.
    this.urlState.setParams(finalParams);
  }

  /**
   * Clear all filters (reset to defaults)
   */
  clearFilters(): void {
    // Get current URL params to find which ones need to be removed
    const currentFilters = this.stateSubject.value.filters;
    const currentUrlParams = this.config.filterMapper.toUrlParams(currentFilters);

    // Get default URL params
    const defaultUrlParams = this.config.filterMapper.toUrlParams(
      this.config.defaultFilters
    );

    // Build final params: default params + null for removed params
    const finalParams: Record<string, any> = { ...defaultUrlParams };
    for (const key of Object.keys(currentUrlParams)) {
      if (!(key in defaultUrlParams)) {
        finalParams[key] = null;
      }
    }

    this.urlState.setParams(finalParams, true); // Replace history entry
  }

  /**
   * Refresh data with current filters
   */
  refresh(): void {
    const currentFilters = this.stateSubject.value.filters;
    this.fetchData(currentFilters);
  }

  /**
   * Get current state snapshot
   *
   * @returns Current state
   */
  getCurrentState(): ResourceState<TFilters, TData, TStatistics> {
    return this.stateSubject.value;
  }

  /**
   * Get current filters snapshot
   *
   * @returns Current filters
   */
  getCurrentFilters(): TFilters {
    return this.stateSubject.value.filters;
  }

  // ============================================================================
  // Synchronous Getters (for template binding compatibility)
  // ============================================================================

  /**
   * Get current filters (synchronous getter for templates)
   */
  get filters(): TFilters {
    return this.stateSubject.value.filters;
  }

  /**
   * Get current results (synchronous getter for templates)
   */
  get results(): TData[] {
    return this.stateSubject.value.results;
  }

  /**
   * Get current total results count (synchronous getter for templates)
   */
  get totalResults(): number {
    return this.stateSubject.value.totalResults;
  }

  /**
   * Get current loading state (synchronous getter for templates)
   */
  get loading(): boolean {
    return this.stateSubject.value.loading;
  }

  /**
   * Get current error (synchronous getter for templates)
   */
  get error(): Error | null {
    return this.stateSubject.value.error;
  }

  /**
   * Get current statistics (synchronous getter for templates)
   */
  get statistics(): TStatistics | undefined {
    return this.stateSubject.value.statistics;
  }

  /**
   * Get current highlights (synchronous getter for templates)
   */
  get highlights(): any {
    return this.stateSubject.value.highlights || {};
  }

  /**
   * Extract highlight filters from URL parameters
   * Extracts parameters with h_ prefix (e.g., h_yearMin, h_manufacturer)
   *
   * Normalizes separators: Converts pipes (|) to commas (,) for backend compatibility.
   * Backend expects comma-separated values: h_manufacturer=Ford,Buick
   *
   * @param urlParams - URL parameters
   * @returns Highlight filters object
   */
  private extractHighlights(urlParams: Record<string, any>): any {
    if (!this.config.supportsHighlights) {
      return {};
    }

    const prefix = this.config.highlightPrefix || 'h_';
    const highlights: Record<string, any> = {};

    Object.keys(urlParams).forEach(key => {
      if (key.startsWith(prefix)) {
        const highlightKey = key.substring(prefix.length);
        let value = urlParams[key];

        // Normalize separators: Convert pipes to commas for backend compatibility
        // Supports both h_manufacturer=Ford,Buick and h_manufacturer=Ford|Buick
        if (typeof value === 'string' && value.includes('|')) {
          value = value.replace(/\|/g, ',');
        }

        highlights[highlightKey] = value;
      }
    });

    return highlights;
  }

  /**
   * Initialize filters from current URL
   *
   * IMPORTANT: Only syncs filters from URL, does NOT fetch data.
   * Data fetching is handled by watchUrlChanges() subscription which fires
   * immediately after this initialization completes. Fetching here would cause
   * duplicate API calls (one from init, one from watch subscription).
   */
  private initializeFromUrl(): void {
    const urlParams = this.urlState.getParams();
    const filters = this.config.filterMapper.fromUrlParams(urlParams);
    const highlights = this.extractHighlights(urlParams);

    this.updateState({ filters, highlights });
    // Note: Do NOT call fetchData() here - watchUrlChanges() handles initial fetch
  }

  /**
   * Watch for URL changes and update state
   */
  private watchUrlChanges(): void {
    this.urlState
      .watchParams()
      .pipe(takeUntil(this.destroy$))
      .subscribe(urlParams => {
        const filters = this.config.filterMapper.fromUrlParams(urlParams);
        const highlights = this.extractHighlights(urlParams);
        this.updateState({ filters, highlights });

        // Fetch data if auto-fetch is enabled
        if (this.config.autoFetch) {
          this.fetchData(filters);
        }
      });
  }

  /**
   * Fetch data from API (called when URL changes and autoFetch=true)
   *
   * Flow: Called by watchUrlChanges() when URL params change.
   * Only executes in main window (autoFetch=false in pop-outs).
   * Pop-outs receive state via syncStateFromExternal() from BroadcastChannel.
   *
   * @param filters - The current TFilters object (already extracted from URL)
   *
   * **Process**:
   * 1. Set loading=true to show spinner
   * 2. Call apiAdapter.fetchData() with filters + highlights
   * 3. Handle errors by setting error state and clearing results
   * 4. On success: extract results, total, statistics → updateState()
   * 5. Always ensure loading=false in finally block
   * 6. Unsubscribe on destroy via takeUntil(destroy$)
   */
  private fetchData(filters: TFilters): void {
    // Step 1: Set loading state to show spinners/loaders to user
    this.updateState({ loading: true, error: null });
    const fetchStartTime = Date.now();
    const fetchId = Math.random().toString(36).substring(7);
    console.log(`[ResourceManagementService] FETCH START [${fetchId}]`, {
      filters,
      timestamp: new Date().toISOString()
    });

    // Step 2: Get current highlights from state
    // Highlights are h_ prefixed params used for secondary filtering/highlighting
    const highlights = this.stateSubject.value.highlights;

    // Step 3: Call domain-specific API adapter
    // apiAdapter.fetchData() is implemented per-domain and knows how to:
    // - Serialize TFilters to API query parameters
    // - Call the correct API endpoint
    // - Deserialize JSON response to ApiResponse<TData[]>
    // Example: AutomobileApiAdapter calls GET /api/specs/v1/vehicles/details?manufacturer=...
    this.config.apiAdapter
      .fetchData(filters, highlights)
      .pipe(
        // Unsubscribe when this service is destroyed (component cleanup)
        takeUntil(this.destroy$),

        // Error handling: convert errors to user-friendly state
        catchError(error => {
          console.error(`[ResourceManagementService] FETCH ERROR [${fetchId}]:`, error);
          // Update state with error message, clear results
          this.updateState({
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
            results: [],    // Clear stale results
            totalResults: 0
          });
          // Return null (empty observable) to continue chain
          return of(null);
        }),

        // Ensure loading is always set to false, even on error
        // This prevents spinner from staying on screen if error occurs
        finalize(() => {
          const duration = Date.now() - fetchStartTime;
          console.log(`[ResourceManagementService] FETCH FINALIZE [${fetchId}] - Duration: ${duration}ms`);
          const currentState = this.stateSubject.value;
          if (currentState.loading) {
            this.updateState({ loading: false });
          }
        })
      )
      .subscribe(response => {
        // Step 4: On success, extract data and update state
        const duration = Date.now() - fetchStartTime;
        console.log(`[ResourceManagementService] FETCH COMPLETE [${fetchId}] - Duration: ${duration}ms`, {
          resultCount: response?.results?.length ?? 0,
          totalResults: response?.total ?? 0,
          timestamp: new Date().toISOString()
        });
        if (response) {
          this.updateState({
            results: response.results,           // Array of TData items (e.g., VehicleResult[])
            totalResults: response.total,        // Total count for pagination
            statistics: response.statistics,     // Aggregations (e.g., VehicleStatistics)
            loading: false,
            error: null
          });
        }
      });
  }

  /**
   * Update state (partial update)
   *
   * @param partial - Partial state update
   */
  private updateState(
    partial: Partial<ResourceState<TFilters, TData, TStatistics>>
  ): void {
    const currentState = this.stateSubject.value;
    const newState = { ...currentState, ...partial };
    this.stateSubject.next(newState);
  }

  /**
   * Sync state from external source (e.g., pop-out receiving state from main window)
   *
   * **Pop-Out Architecture**:
   * This method is the bridge between main window and pop-out windows.
   * Main window calls this method (via BroadcastChannel message) to push state to pop-outs.
   *
   * Flow:
   * 1. Main window: URL changes → fetchData() → updateState() → state$
   * 2. DiscoverComponent listens to state$ and broadcasts via BroadcastChannel
   * 3. PanelPopoutComponent receives message via PopOutContextService
   * 4. PanelPopoutComponent calls: this.resourceService.syncStateFromExternal(state)
   * 5. Pop-out's ResourceManagementService updates its BehaviorSubject
   * 6. Components in pop-out subscribe to same observables (results$, filters$, etc.)
   * 7. Components re-render with synchronized state
   *
   * **Important**: No API call happens in pop-out. State is received from main window.
   * This prevents duplicate requests and ensures consistency across windows.
   *
   * @param externalState - Complete ResourceState object from main window
   *
   * @example
   * ```typescript
   * // In PanelPopoutComponent, receiving STATE_UPDATE from main window
   * this.popOutContext.getMessages$()
   *   .subscribe(msg => {
   *     if (msg.type === PopOutMessageType.STATE_UPDATE) {
   *       // Main window sent new state
   *       this.resourceService.syncStateFromExternal(msg.payload.state);
   *     }
   *   });
   * ```
   */
  public syncStateFromExternal(
    externalState: ResourceState<TFilters, TData, TStatistics>
  ): void {
    // Ensure state emission happens inside Angular zone so that all observable
    // subscriptions (in child components) trigger change detection properly.
    // This is critical for pop-out windows where BroadcastChannel messages arrive outside the zone.
    this.ngZone.run(() => {
      // Emit the external state through our BehaviorSubject.
      // All subscribed observables (results$, filters$, etc.) will automatically
      // emit new values to components, triggering change detection and re-renders.
      this.stateSubject.next(externalState);
    });
  }

  /**
   * Clean up subscriptions on component destroy
   */
  destroy(): void {
    this.ngOnDestroy();
  }

  /**
   * Clean up subscriptions on component destroy
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
