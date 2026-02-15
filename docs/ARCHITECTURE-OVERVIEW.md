# Generic Discovery Framework - Architecture Specification

## 1. System Overview

The Generic Discovery Framework follows a **configuration-driven, URL-first architecture** that enables a single codebase to serve multiple data domains. The system is built on Angular 13.3 with NgModules, PrimeNG UI library, and a comprehensive service layer.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                                  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │   Main Window   │  │  Pop-out Window │  │   Pop-out Window    │ │
│  │  (Angular SPA)  │◄─┤ (BroadcastChannel)├─► (BroadcastChannel) │ │
│  └────────┬────────┘  └─────────────────┘  └─────────────────────┘ │
└───────────┼─────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      TRAEFIK INGRESS (Loki)                         │
├─────────────────────────────────────────────────────────────────────┤
│          generic-prime.minilab → K8s Services                       │
└───────────┬───────────────────────────────────────┬─────────────────┘
            │                                       │
            ▼                                       ▼
┌─────────────────────────┐           ┌─────────────────────────────┐
│   Frontend Service      │           │     Backend API Service     │
│   (nginx container)     │           │   (Node.js/Express)         │
└─────────────────────────┘           └─────────────┬───────────────┘
                                                    │
                                                    ▼
                                      ┌─────────────────────────────┐
                                      │      Elasticsearch          │
                                      │   (data.svc.cluster.local)  │
                                      └─────────────────────────────┘
```

---

## 2. Frontend Architecture

### 2.1 Directory Structure

```
src/app/
├── app.component.ts               # Root component (navigation, AI chat toggle)
├── app.module.ts                  # Root NgModule (providers, declarations)
├── app-routing.module.ts          # Route definitions
├── features/                      # Domain-specific feature components
│   ├── home/                      # Landing page
│   ├── automobile/                # Automobile domain
│   ├── discover/                  # Generic discovery component
│   ├── panel-popout/              # Pop-out window component
│   ├── popout/                    # Popout feature
│   └── ...
│
├── framework/                     # Domain-agnostic framework
│   ├── components/                # Reusable UI components
│   │   ├── ai-chat/               # LLM chat interface
│   │   ├── base-chart/            # Plotly chart wrapper
│   │   ├── base-picker/           # Multi-select picker
│   │   ├── basic-results-table/   # Simple data table
│   │   ├── dynamic-results-table/ # Table with column manipulation
│   │   ├── query-control/         # Advanced filter dialogs
│   │   ├── query-panel/           # Inline filter panel
│   │   ├── results-table/         # Full-featured results table
│   │   ├── statistics-panel/      # Statistics panel
│   │   ├── statistics-panel-2/    # Chart grid with drag-drop
│   │   ├── column-manager/        # Column management
│   │   └── inline-filters/        # Inline filter components
│   │
│   ├── services/                  # Application services
│   │   ├── api.service.ts         # HTTP client wrapper
│   │   ├── resource-management.service.ts  # State orchestrator
│   │   ├── url-state.service.ts   # URL synchronization
│   │   ├── popout-context.service.ts       # Pop-out communication
│   │   ├── ai.service.ts          # LLM integration
│   │   ├── user-preferences.service.ts     # Preference persistence
│   │   ├── request-coordinator.service.ts  # Cache + dedup + retry
│   │   ├── domain-config-registry.service.ts  # Contains DOMAIN_CONFIG token
│   │   ├── domain-config-validator.service.ts
│   │   ├── error-notification.service.ts
│   │   ├── global-error.handler.ts
│   │   └── http-error.interceptor.ts
│   │
│   ├── models/                    # TypeScript interfaces
│   │   ├── domain-config.interface.ts  # DomainConfig interface
│   │   ├── filter-definition.interface.ts  # Filter configuration
│   │   ├── table-config.interface.ts   # Table column config
│   │   ├── picker-config.interface.ts  # Picker definitions
│   │   ├── popout.interface.ts    # Pop-out types and utilities
│   │   ├── resource-management.interface.ts  # State management types
│   │   ├── ai.models.ts           # AI/chat models
│   │   └── ...
│   │
│   └── tokens/                    # DI injection tokens
│       └── popout.token.ts        # IS_POPOUT_TOKEN
│
├── domain-config/                 # Domain-specific configurations
│   ├── domain-providers.ts        # Central domain registration
│   └── automobile/                # Automobile domain config
│       ├── automobile.domain-config.ts
│       ├── models/
│       ├── adapters/
│       ├── configs/
│       └── chart-sources/
│
├── environments/                  # Environment configuration
│   ├── environment.ts             # Development
│   └── environment.prod.ts        # Production
│
├── assets/                        # Static assets
└── styles.scss                    # Global styles
```

### 2.2 Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AppComponent                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ PrimeNG TieredMenu │ AI Toggle │ Version │ <router-outlet>│  │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  AI Chat Panel (floating)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (routes to)
┌─────────────────────────────────────────────────────────────────┐
│                     DiscoverComponent                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │QueryControl │ │ QueryPanel  │ │ BasePicker  │ │Statistics │ │
│  │  (filters)  │ │(quick filter)│ │(multi-select)│ │ Panel2   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              DynamicResultsTable / ResultsTable          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 State Management Architecture

**URL-First Principle**: The URL is the single source of truth for application state.

```
┌─────────────────────────────────────────────────────────────────┐
│                       URL Query Parameters                       │
│  ?manufacturer=Toyota&yearMin=2020&yearMax=2024&page=1&size=20  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      UrlStateService                             │
│  - watchParams() → Observable<TParams>                          │
│  - setParams() → Updates URL via Router                         │
│  - serializeParams() / deserializeParams()                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                ResourceManagementService<TFilters, TData, TStat>│
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ BehaviorSubject State Management                            │ │
│  │  - stateSubject = new BehaviorSubject<ResourceState>()     │ │
│  │  - state$ = stateSubject.asObservable()                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Observable Streams (derived from state$)                    │ │
│  │  - filters$ = state$.pipe(map(s => s.filters))             │ │
│  │  - results$ = state$.pipe(map(s => s.results))             │ │
│  │  - loading$ = state$.pipe(map(s => s.loading))             │ │
│  │  - statistics$ = state$.pipe(map(s => s.statistics))       │ │
│  │  - highlights$ = state$.pipe(map(s => s.highlights))       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Domain Adapters                             │
│  - IApiAdapter.fetchData(filters) → Observable<{data, stats}>   │
│  - IFilterUrlMapper.fromUrlParams() / toUrlParams()            │
│  - ICacheKeyBuilder.buildKey(filters) → string                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Data Flow Sequence

```
User Interaction (click filter, select item)
         │
         ▼
Component Event Handler
         │
         ▼
UrlStateService.setParams(newParams)
         │
         ▼
Router.navigate() [shallow navigation]
         │
         ▼
ActivatedRoute params Observable emits
         │
         ▼
ResourceManagementService.watchUrlChanges()
         │
         ▼
filterMapper.fromUrlParams(params) → TFilters
         │
         ▼
state.update({ filters: newFilters, loading: true })
         │
         ▼
(if autoFetch enabled)
         │
         ▼
apiAdapter.fetchData(filters)
         │
         ▼
RequestCoordinatorService.execute()
  ├─ Layer 1: Check cache (TTL=30s)
  ├─ Layer 2: Check in-flight (dedup)
  └─ Layer 3: HTTP with retry (3x)
         │
         ▼
API Response received
         │
         ▼
state.update({ results, statistics, loading: false })
         │
         ▼
Observable subscriptions trigger component re-render
         │
         ▼
BroadcastChannel → Pop-out windows receive STATE_UPDATE
```

---

## 3. Service Architecture

### 3.1 Service Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                     Angular Injector                             │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐
│  ApiService  │    │UrlStateService│   │DomainConfigRegistry │
│  (HTTP)      │    │  (URL sync)   │    │   (config store)    │
└──────────────┘    └──────────────┘    └──────────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────────┐
              │   ResourceManagementService       │
              │   (State Orchestrator)            │
              │   [per-component instance]        │
              └───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐
│PopOutContext │    │UserPreferences│   │   AiService          │
│  Service     │    │   Service    │    │  (LLM chat)          │
└──────────────┘    └──────────────┘    └──────────────────────┘
```

### 3.2 Service Responsibilities

| Service | Scope | Responsibility |
|---------|-------|----------------|
| **ApiService** | Singleton | HTTP client wrapper, error handling |
| **RequestCoordinatorService** | Singleton | Cache, deduplication, retry logic |
| **UrlStateService** | Singleton | URL parameter synchronization |
| **ResourceManagementService** | Per-component | State orchestration, API coordination |
| **DomainConfigRegistry** | Singleton | Domain configuration storage |
| **DomainConfigValidator** | Singleton | Configuration validation |
| **PopOutContextService** | Singleton | Cross-window communication |
| **UserPreferencesService** | Singleton | User preference persistence |
| **AiService** | Singleton | LLM chat integration |
| **ErrorNotificationService** | Singleton | Toast notifications |
| **GlobalErrorHandler** | Singleton | Uncaught error handling |

---

## 4. Domain Configuration Architecture

### 4.1 Configuration Structure

```typescript
interface DomainConfig<TFilters, TData, TStatistics> {
  // Identity
  domainName: string;
  domainLabel: string;
  apiBaseUrl: string;

  // Type Models
  filterModel: Type<TFilters>;
  dataModel: Type<TData>;
  statisticsModel: Type<TStatistics>;

  // Adapters (domain-specific logic)
  apiAdapter: IApiAdapter<TFilters, TData, TStatistics>;
  urlMapper: IFilterUrlMapper<TFilters>;
  cacheKeyBuilder: ICacheKeyBuilder<TFilters>;

  // UI Configurations
  tableConfig: TableConfig<TData>;
  pickers: PickerConfig[];
  filters: FilterDefinition[];
  queryControlFilters: QueryControlFilter[];
  highlightFilters: HighlightFilter[];
  charts: ChartConfig[];
  chartDataSources: Record<string, ChartDataSource>;

  // Feature Flags
  features: {
    highlights: boolean;
    popOuts: boolean;
    rowExpansion: boolean;
    statistics: boolean;
    export: boolean;
    columnManagement: boolean;
    statePersistence: boolean;
  };

  // Metadata
  metadata: {
    version: string;
    description: string;
    author: string;
    createdAt: Date;
    updatedAt: Date;
  };
}
```

### 4.2 Adapter Interfaces

```typescript
// API communication
interface IApiAdapter<TFilters, TData, TStatistics> {
  fetchData(filters: TFilters, highlights?: HighlightFilters):
    Observable<{ results: TData[], total: number, statistics: TStatistics }>;
  fetchStatistics(filters: TFilters): Observable<TStatistics>;
}

// URL ↔ Filter mapping
interface IFilterUrlMapper<TFilters> {
  fromUrlParams(params: Record<string, string>): TFilters;
  toUrlParams(filters: TFilters): Record<string, string>;
}

// Cache key generation
interface ICacheKeyBuilder<TFilters> {
  buildKey(filters: TFilters, highlights?: HighlightFilters): string;
}
```

---

## 5. Pop-Out Window Architecture

### 5.1 Communication Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                     Main Window                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              DiscoverComponent                           │   │
│  │  - Opens pop-out via window.open()                       │   │
│  │  - Creates BroadcastChannel('panel-{panelId}')           │   │
│  │  - Listens for messages                                   │   │
│  │  - Broadcasts STATE_UPDATE on state changes              │   │
│  │  - Polls window.closed every 500ms                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    BroadcastChannel API
                               │
┌──────────────────────────────┴──────────────────────────────────┐
│                     Pop-out Window                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              PanelPopoutComponent                        │   │
│  │  - Detects pop-out context from URL (/panel/:id/:type)  │   │
│  │  - Connects to BroadcastChannel                          │   │
│  │  - Sends PANEL_READY on init                             │   │
│  │  - Receives STATE_UPDATE messages                        │   │
│  │  - Emits filter changes to parent                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Message Types

```typescript
enum PopOutMessageType {
  // Main Window → Pop-Out
  STATE_UPDATE = 'STATE_UPDATE',         // Sync full application state
  CLOSE_POPOUT = 'CLOSE_POPOUT',         // Request pop-out to close

  // Pop-Out → Main Window
  PANEL_READY = 'PANEL_READY',           // Pop-out initialized
  PICKER_SELECTION_CHANGE = 'PICKER_SELECTION_CHANGE',
  FILTER_ADD = 'FILTER_ADD',
  FILTER_REMOVE = 'FILTER_REMOVE',
  HIGHLIGHT_REMOVE = 'HIGHLIGHT_REMOVE',
  CLEAR_HIGHLIGHTS = 'CLEAR_HIGHLIGHTS',
  CLEAR_ALL_FILTERS = 'CLEAR_ALL_FILTERS',
  URL_PARAMS_CHANGED = 'URL_PARAMS_CHANGED',
  URL_PARAMS_SYNC = 'URL_PARAMS_SYNC',
  CHART_CLICK = 'CHART_CLICK'
}
```

---

## 6. Error Handling Architecture

### 6.1 Error Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Error Sources                                │
├─────────────────────────────────────────────────────────────────┤
│  HTTP Errors  │  Promise Rejections  │  Synchronous Exceptions │
└───────┬───────┴──────────┬───────────┴──────────┬───────────────┘
        │                  │                      │
        ▼                  ▼                      ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│HttpError     │  │ GlobalError      │  │ GlobalError          │
│Interceptor   │  │ Handler          │  │ Handler              │
│(retry logic) │  │ (Angular hook)   │  │ (Angular hook)       │
└──────┬───────┘  └────────┬─────────┘  └──────────┬───────────┘
       │                   │                       │
       └───────────────────┼───────────────────────┘
                           │
                           ▼
              ┌─────────────────────────────────┐
              │   ErrorNotificationService      │
              │   - Deduplication (3s window)   │
              │   - Severity categorization     │
              │   - PrimeNG Toast display       │
              └─────────────────────────────────┘
```

### 6.2 Retry Strategy

```typescript
// RequestCoordinatorService retry configuration
// Uses exponential backoff: Math.pow(2, retryCount - 1) * initialDelayMs
{
  maxRetries: 3,
  initialDelayMs: 1000,
  // Exponential backoff: 1s, 2s, 4s
  retryableStatusCodes: [429, 500, 502, 503, 504]
}
```

---

## 7. Deployment Architecture

### 7.1 Container Structure

```dockerfile
# Production Dockerfile
FROM nginx:alpine
COPY dist/frontend /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

### 7.2 Kubernetes Deployment

```yaml
# Simplified K8s structure
Namespace: generic-prime
├── Deployment: generic-prime-frontend
│   ├── Replicas: 2
│   └── Container: nginx (port 80)
├── Service: generic-prime-frontend
│   └── Port: 80 → container:80
└── IngressRoute: generic-prime.minilab
    └── Routes to: generic-prime-frontend:80
```

---

## 8. Design Patterns

### 8.1 Patterns Used

| Pattern | Usage | Location |
|---------|-------|----------|
| **Configuration-Driven** | Domain logic externalized | domain-config/ |
| **Dependency Injection** | Type-safe DI with tokens | DOMAIN_CONFIG token |
| **URL-First State** | URL as source of truth | UrlStateService |
| **BehaviorSubject** | Reactive state management | ResourceManagementService |
| **Observer** | RxJS for async operations | All services |
| **Factory** | Domain config creation | createAutomobileDomainConfig() |
| **Adapter** | API communication | IApiAdapter implementations |
| **Strategy** | Chart data transformation | ChartDataSource classes |
| **Registry** | Configuration storage | DomainConfigRegistry |
| **Interceptor** | HTTP error handling | HttpErrorInterceptor |

### 8.2 Angular-Specific Patterns

| Pattern | Description |
|---------|-------------|
| **NgModules** | Module-based organization (AppModule, FrameworkModule) |
| **OnPush Change Detection** | Performance optimization |
| **Constructor DI** | Constructor-based dependency injection |
| **takeUntil Pattern** | Cleanup via Subject and takeUntil() |
| **BehaviorSubject** | RxJS-based reactive state |

---

## 9. Security Considerations

### 9.1 XSS Prevention

- All user input sanitized via Angular's DomSanitizer
- innerHTML only used with bypassSecurityTrustHtml() after sanitization
- KaTeX rendering uses throwOnError: false

### 9.2 CORS Handling

- nginx proxy configuration for API requests
- withCredentials: false for HttpClient
- Backend CORS headers configured

### 9.3 Input Validation

- TypeScript strict mode enforced
- Filter validation in URL mapper
- Numeric range validation (min <= max)

---

*Document Version: 1.2*
*Last Updated: 2026-02-14*
*Source: vvroom codebase (Angular 13.3.0)*
