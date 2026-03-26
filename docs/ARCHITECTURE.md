# Architecture: ngx-prime Discovery Libraries

## Purpose

Four Angular libraries that, together, implement a **configuration-driven discovery interface** — searchable, filterable, chartable views over any data domain. The developer writes configuration; the framework does everything else.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Feature Component                            │
│                      (e.g. DiscoverComponent)                       │
│                                                                     │
│  Provides: ResourceManagementService, PopOutManagerService          │
│  Injects:  DOMAIN_CONFIG                                            │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Query    │ │ Query    │ │ Results  │ │ Stats    │ │ Charts   │ │
│  │ Control  │ │ Panel    │ │ Table    │ │ Panel    │ │ (Plotly) │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│        ↕              ↕            ↕            ↕           ↕      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              ResourceManagementService                      │   │
│  │  (component-level provider — one per discover instance)     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│        ↕                                           ↕               │
│  ┌──────────────┐                         ┌──────────────────┐     │
│  │ UrlState     │◄── URL ──►  Browser     │ RequestCoord.    │     │
│  │ Service      │     bar                 │ Service          │     │
│  └──────────────┘                         │ (cache/dedup/    │     │
│                                           │  retry)          │     │
│                                           └──────────────────┘     │
│                                                    ↕               │
│                                           ┌──────────────────┐     │
│                                           │ API via adapters │     │
│                                           └──────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘

  ┌─────────────────── CDK Portal Pop-Out ──────────────────────────┐
  │ about:blank window                                               │
  │ Shares host DI context (same ResourceManagementService)          │
  │ Component rendered via DomPortalOutlet                           │
  │ @Output() events relayed as PopOutMessageType.COMPONENT_OUTPUT   │
  └──────────────────────────────────────────────────────────────────┘
```

---

## The Four Libraries

### 1. `lib/config` — Configuration Schema

**What it owns**: The *shape* of domain configuration. No runtime behavior, no UI — pure interfaces, registries, and generic adapter implementations.

| Export | Role |
|--------|------|
| `ResourceDefinition` | Single source of truth for a domain's fields. Drives URL mappers, API adapters, table configs, and filter definitions from one declaration. |
| `DomainConfig<TFilters, TData, TStatistics>` | Complete domain wiring: adapters, UI configs, feature flags. Injected via `DOMAIN_CONFIG` token. |
| `FilterDefinition<T>` | Query Control dialog filters (multiselect, range, text, date). These open dialogs with chip-based selection. |
| `TableFilterDefinition` | Inline table header filters (text, number, select, autocomplete, etc.). Separate interface from `FilterDefinition`. |
| `PickerConfig<T>` | Multi-select table pickers with pagination, serialization, caching. |
| `ChartConfig` | Chart panel configuration (id, type, dataSourceId). |
| `GenericUrlMapper` | Configuration-driven `IFilterUrlMapper` — reads `ResourceDefinition` fields and generates `toUrlParams`/`fromUrlParams` automatically. |
| `GenericApiAdapter` | Configuration-driven `IApiAdapter` — reads `ResourceDefinition` fields and maps filters to API params automatically. |
| `generateTableConfig()` | Generates `TableConfig` from `ResourceDefinition`. |
| `generateTableFilterDefinitions()` | Generates `TableFilterDefinition[]` from `ResourceDefinition`. |
| `DomainConfigRegistry` | Multi-domain registry for apps that serve multiple domains. |
| `PickerConfigRegistry` | Registry for picker configurations. |

**Key design decision**: `FilterDefinition<T>` and `TableFilterDefinition` are deliberately separate interfaces. `FilterDefinition` drives Query Control chip dialogs (multiselect, range). `TableFilterDefinition` drives inline table column filters (text, number, autocomplete). They serve different UX patterns.

### 2. `lib/state-management` — URL-First State Engine

**What it owns**: The data pipeline from URL to API to component state.

**Core principle**: The URL is the single source of truth. Every filter change writes to the URL first; components react to URL changes via `ResourceManagementService`.

| Export | Role |
|--------|------|
| `ResourceManagementService` | Orchestrates the entire data lifecycle. Provided at **component level** (one instance per discover page). Exposes `state$`, `results$`, `filters$`, `statistics$`, `loading$`, `error$` observables plus sync getters. |
| `UrlStateService` | Bidirectional URL ↔ state sync. `setParams()` writes to URL, triggering `ResourceManagementService` to fetch. |
| `RequestCoordinatorService` | Three-layer optimization: **cache** (keyed by `ICacheKeyBuilder`), **deduplication** (identical in-flight requests share one observable), **retry** (configurable). |
| `ApiService` | Thin HTTP wrapper over `HttpClient`. |
| `FilterOptionsService` | Fetches filter option lists (for multiselect dropdowns). |
| `IFilterUrlMapper<T>` | Interface: `toUrlParams(filters)` / `fromUrlParams(params)` / `extractHighlights(params)` |
| `IApiAdapter<TFilters, TData, TStatistics>` | Interface: `fetchData(filters, highlights)` → `Observable<ApiAdapterResponse>` |
| `ICacheKeyBuilder<T>` | Interface: `buildKey(filters, highlights)` → `string` |
| `ResourceState<T,D,S>` | State shape: `{ filters, results, totalResults, loading, error, statistics, highlights }` |

**Data flow**:
```
URL change → UrlStateService.params$
  → ResourceManagementService.fromUrlParams()
    → RequestCoordinatorService.fetch()
      → IApiAdapter.fetchData()
        → API response
      → Cache result
    → Update ResourceState
      → state$ / results$ / statistics$ emit
        → Components re-render (OnPush)
```

### 3. `lib/framework` — UI Components

**What it owns**: Domain-agnostic UI components that render based on injected configuration.

| Component | How it gets data | What it renders |
|-----------|-----------------|-----------------|
| `QueryControlComponent` | Injects `DOMAIN_CONFIG` → reads `queryControlFilters` | Chip-based filter bar with dialogs (multiselect, range, text, date) |
| `QueryPanelComponent` | Injects `ResourceManagementService` | Inline header filter row |
| `BasicResultsTableComponent` | Injects `ResourceManagementService` + `DOMAIN_CONFIG` | PrimeNG lazy-loaded data table with column management |
| `StatisticsPanel2Component` | Injects `ResourceManagementService` + `DOMAIN_CONFIG` | CDK drag-drop grid of chart cards |
| `BaseChartComponent` | Receives `ChartDataSource` via `@Input()` or pop-out data | Plotly.js chart with click-to-filter |
| `BasePickerComponent` | Injects `PickerConfigRegistry` | Multi-select table picker with URL serialization |
| `DynamicResultsTableComponent` | Injects `ResourceManagementService` | Runtime-configurable table variant |

**Important**: Components **do not** receive data via `@Input()`. They inject `ResourceManagementService` from the component-level provider on the host. This is why they work identically in the main window and in pop-out windows — same DI context.

Services:
| Service | Role |
|---------|------|
| `ErrorNotificationService` | Toast notifications for errors |
| `HttpErrorInterceptor` | Global HTTP error handling |
| `GlobalErrorHandler` | Catches unhandled exceptions |
| `UserPreferencesService` | Panel order, collapsed state, column visibility (localStorage) |

Abstract class:
| Class | Role |
|-------|------|
| `ChartDataSource<TStatistics>` | Extend to implement `transform(stats, highlights?)` → Plotly traces and `toUrlParams(value, isHighlight)` → URL params for chart click-to-filter. |

### 4. `lib/popout` — CDK Portal Pop-Out Windows

**What it owns**: Opening, managing, and communicating with pop-out browser windows.

| Export | Role |
|--------|------|
| `PopOutManagerService` | Opens `about:blank` windows, renders components via `DomPortalOutlet`, auto-wires `@Output()` event relay |
| `PopOutContextService` | Side-car service with `ready$: ReplaySubject<void>` — pop-out components wait on this before accessing DOM |
| `PopOutMessage` | Message types: `PANEL_READY`, `STATE_UPDATE`, `COMPONENT_OUTPUT` |
| `IS_POPOUT_TOKEN` | DI token — `true` when running inside a pop-out window |

**Why CDK Portal, not BroadcastChannel**: Portal-rendered components share the host's Angular injector. The pop-out component gets the *same* `ResourceManagementService` instance — no state serialization, no sync logic, no stale data. `@Output()` events are auto-wired and relayed as `COMPONENT_OUTPUT` messages.

---

## Key Interfaces Relationship

```
ResourceDefinition
  │
  ├──► GenericUrlMapper ──► IFilterUrlMapper<TFilters>
  ├──► GenericApiAdapter ──► IApiAdapter<TFilters, TData, TStatistics>
  ├──► generateTableConfig() ──► TableConfig<TData>
  └──► generateTableFilterDefinitions() ──► TableFilterDefinition[]

DomainConfig<TFilters, TData, TStatistics>
  │
  ├── urlMapper: IFilterUrlMapper<TFilters>
  ├── apiAdapter: IApiAdapter<TFilters, TData, TStatistics>
  ├── cacheKeyBuilder: ICacheKeyBuilder<TFilters>
  ├── tableConfig: TableConfig<TData>
  ├── filters: TableFilterDefinition[]        ◄── inline table filters
  ├── queryControlFilters: FilterDefinition<TFilters>[]  ◄── chip dialogs
  ├── highlightFilters?: FilterDefinition<any>[]
  ├── charts: ChartConfig[]
  ├── chartDataSources?: Record<string, ChartDataSource>
  ├── pickers: PickerConfig<any>[]
  └── features: DomainFeatures
```

---

## Dependency Direction

```
lib/config ◄── lib/state-management ◄── lib/framework
                                              │
lib/popout ◄──────────────────────────────────┘
```

- `config` depends on nothing
- `state-management` depends on `config` (imports interface types)
- `framework` depends on `state-management` (injects services) and `config` (injects `DOMAIN_CONFIG`)
- `popout` depends on nothing internally, but is consumed by `framework` components

---

## Convention over Configuration

The `ResourceDefinition` → `GenericUrlMapper` / `GenericApiAdapter` / `generateTableConfig()` pipeline means most domains need zero hand-written adapters. You define fields once:

```typescript
const field: ResourceField = {
  name: 'manufacturer',
  label: 'Manufacturer',
  type: 'string',
  filterable: true,
  sortable: true,
  visible: true,
  highlightable: true,
  filterType: 'autocomplete',
  autocompleteEndpoint: 'filters/manufacturers'
};
```

And that single declaration drives:
- URL parameter parsing/serialization (`?manufacturer=Toyota`)
- API parameter mapping (`GET /api/v1/vehicles?manufacturer=Toyota`)
- Table column (`{ field: 'manufacturer', header: 'Manufacturer', sortable: true }`)
- Table filter control (autocomplete input)
- Highlight support (`?h_manufacturer=Toyota` for segmented charts)

Escape hatches exist for complex fields: `customUrlParser`, `customUrlSerializer`, `customApiMapper` on `ResourceField`.

---

## File Counts

| Library | Files | Key Types |
|---------|-------|-----------|
| `lib/config` | 17 | 5 interfaces, 3 services, 2 adapters, 2 tokens, 1 utils |
| `lib/framework` | 16 | 8 components, 4 services, 1 abstract class |
| `lib/popout` | 6 | 2 services, 1 interface, 1 module |
| `lib/state-management` | 11 | 5 services, 3 interfaces, 1 token |
| **Total** | **50** | |

The brownfield developer never sees these 50 files. They import four modules and write one `DomainConfig`.
