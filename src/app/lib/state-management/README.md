# State Management Library (`src/app/lib/state-management`)

Implements URL-first state management. The browser URL is the single source of truth — all data fetching, filter state, pagination, and sorting derive from URL query parameters.

## Data Flow

```
URL Change (browser navigation or setParams())
    │
    ▼
UrlStateService.params$
    │
    ▼
ResourceManagementService.watchUrlChanges()
    │
    ├─▶ urlMapper.fromUrlParams(params) → TFilters
    ├─▶ urlMapper.extractHighlights(params) → highlights
    │
    ▼
fetchData(filters, highlights)
    │
    ├─▶ cacheKeyBuilder.buildKey() → check RequestCoordinator cache
    ├─▶ apiAdapter.fetchData(filters, highlights) → HTTP call
    │
    ▼
updateState({ results, totalResults, statistics, loading: false })
    │
    ▼
Components subscribed to state$.results$ / statistics$ / loading$ re-render
```

**Why URL-first:** Back button, bookmarks, shared links, and page refresh all restore the exact application state without extra code.

## Services

### ResourceManagementService<TFilters, TData, TStatistics>

The orchestrator. Provided at **component level** (not root), so each page gets its own instance with its own state.

```typescript
@Component({
  providers: [ResourceManagementService, PopOutManagerService]
})
export class DiscoverComponent {
  constructor(
    @Inject(DOMAIN_CONFIG) public domainConfig: DomainConfig<any, any, any>,
    public resourceService: ResourceManagementService<any, any, any>
  ) {}
}
```

**Observable streams** (subscribe in templates or components):
```typescript
state$: Observable<ResourceState<TFilters, TData, TStatistics>>   // Full state
filters$: Observable<TFilters>                                      // Current filters
results$: Observable<TData[]>                                       // Current page data
totalResults$: Observable<number>                                   // Total (unpaginated)
statistics$: Observable<TStatistics | undefined>                    // Aggregated stats
highlights$: Observable<any>                                        // Highlight filters (h_*)
loading$: Observable<boolean>                                       // Loading state
error$: Observable<Error | null>                                    // Last error
```

**Synchronous getters** (for imperative access):
```typescript
get filters(): TFilters
get results(): TData[]
get totalResults(): number
get statistics(): TStatistics | undefined
get highlights(): any
get loading(): boolean
get error(): Error | null
```

**Pop-out awareness:** When `IS_POPOUT_TOKEN` is true, auto-fetch is disabled. The pop-out receives state via `syncStateFromExternal()` — but since CDK Portal pop-outs share the same service instance, this is mainly for OnPush change detection triggering.

### UrlStateService

Bidirectional URL ↔ state synchronization. Wraps Angular Router.

```typescript
// Read current params
const params = this.urlState.getParams<{ manufacturer: string; page: number }>();

// Watch for changes (reactive)
this.urlState.watchParams().pipe(takeUntil(this.destroy$))
  .subscribe(params => { /* URL changed */ });

// Update URL (triggers the full data flow above)
await this.urlState.setParams({ manufacturer: 'Ford', page: 1 });

// Clear all params
await this.urlState.clearParams();
```

**All state changes go through the URL.** Components never update data directly — they call `setParams()`, which updates the URL, which triggers `ResourceManagementService` to fetch new data.

### RequestCoordinatorService

Three-layer request optimization: Cache → In-flight deduplication → HTTP with retry.

```typescript
// Used internally by ResourceManagementService
this.requestCoordinator.execute<ApiResponse>(
  cacheKey,
  () => this.apiAdapter.fetchData(filters, highlights),
  { cacheTTL: 30000, retries: 2 }
);
```

- **Cache**: If the same `cacheKey` was fetched within TTL, returns cached result (no HTTP call)
- **Deduplication**: If two components trigger the same fetch simultaneously, only one HTTP call is made
- **Retry**: Failed requests retry with exponential backoff

### ApiService

HTTP abstraction (`get`, `post`, etc.). Injected by `GenericApiAdapter` for making API calls.

### FilterOptionsService

Loads filter options from API endpoints. Used by `QueryControlComponent` and `QueryPanelComponent`.

```typescript
this.filterOptionsService
  .loadOptions('/api/filters/manufacturers', response => response.manufacturers.map(m => ({ value: m, label: m })))
  .subscribe(options => { /* FilterOption[] */ });
```

## Interfaces

### ResourceState<TFilters, TData, TStatistics>

Complete application state snapshot:

```typescript
interface ResourceState<TFilters, TData, TStatistics> {
  filters: TFilters;
  results: TData[];
  totalResults: number;
  statistics?: TStatistics;
  highlights?: any;
  loading: boolean;
  error: Error | null;
  timestamp: number;
}
```

### IFilterUrlMapper<TFilters>

Bidirectional URL conversion. Implement directly or use `GenericUrlMapper` (config-driven).

```typescript
interface IFilterUrlMapper<TFilters> {
  toUrlParams(filters: TFilters): Params;
  fromUrlParams(params: Params): TFilters;
  extractHighlights?(params: Params): any;  // Extract h_* params
}
```

### IApiAdapter<TFilters, TData, TStatistics>

Data fetching. Implement directly or use `GenericApiAdapter` (config-driven).

```typescript
interface IApiAdapter<TFilters, TData, TStatistics> {
  fetchData(filters: TFilters, highlights?: any): Observable<ApiAdapterResponse<TData, TStatistics>>;
}

interface ApiAdapterResponse<TData, TStatistics> {
  results: TData[];
  total: number;
  statistics?: TStatistics;
}
```

### ICacheKeyBuilder<TFilters>

Generate deterministic cache keys from filter state.

```typescript
interface ICacheKeyBuilder<TFilters> {
  buildKey(filters: TFilters, highlights?: any): string;
}
```

## Integrating Into a Brownfield App

### Changing what data is displayed

Never mutate component state directly. Always go through the URL:

```typescript
// Wrong — bypasses URL-first architecture
this.results = newData;

// Right — URL drives everything
await this.urlStateService.setParams({ manufacturer: 'Toyota', page: 1 });
// ResourceManagementService detects URL change → fetches data → updates results
```

### Handling filter changes from UI components

Framework components emit URL param changes. The page component forwards them to `UrlStateService`:

```typescript
// In DiscoverComponent
async onUrlParamsChange(params: Params): Promise<void> {
  await this.urlStateService.setParams(params);
}

async onClearAllFilters(): Promise<void> {
  await this.urlStateService.clearParams();
}
```

### Chart click → filter update

Chart data sources define how click values map to URL params:

```typescript
async onStandaloneChartClick(
  event: { value: string; isHighlightMode: boolean },
  dataSource: ChartDataSource | undefined
): Promise<void> {
  if (!dataSource) return;
  const newParams = dataSource.toUrlParams(event.value, event.isHighlightMode);
  if (!event.isHighlightMode) newParams['page'] = 1;
  await this.urlStateService.setParams(newParams);
}
```

## Barrel Export

All public services, interfaces, and tokens are exported through `index.ts`. Import from `../../lib/state-management` only.
