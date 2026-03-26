# Design: ngx-prime Discovery Libraries

## Problem Statement

Enterprise Angular applications frequently need "discovery" interfaces — searchable, filterable, paginated views over domain data with charts, pop-outs, and URL-persisted state. Building one from scratch is 20+ files of boilerplate. Building a second domain in the same app means duplicating most of that work.

## Design Goals

1. **Configuration over code**: Define a domain in one `ResourceDefinition` file. Everything else is generated or generic.
2. **URL as truth**: Every filter, sort, page, and highlight parameter lives in the URL. Users can bookmark, share, and navigate back through filter states.
3. **Domain agnosticism**: The framework knows nothing about automobiles, real estate, or agriculture. All domain knowledge lives in configuration.
4. **Progressive complexity**: Simple domains need 3 files (resource, models, domain-config). Complex domains can add custom chart sources, pickers, and adapters.
5. **Pop-out isolation**: Any panel can be torn off into a separate window without losing data synchronization.

## Design Decisions

### 1. ResourceDefinition as Single Source of Truth

**Problem**: In the original brownfield app, field metadata was duplicated across 4+ files — URL mapper, API adapter, table config, filter definitions. Adding a field meant editing all four.

**Decision**: `ResourceDefinition` declares each field once with capability flags (`filterable`, `sortable`, `visible`, `highlightable`). Generic implementations read these flags:

```typescript
// ONE declaration...
const field: ResourceField = {
  name: 'bodyClass', label: 'Body Class', type: 'array',
  filterable: true, sortable: true, visible: true, highlightable: true,
  filterType: 'multiselect', optionsEndpoint: 'body_class'
};

// ...drives FOUR outputs:
// 1. GenericUrlMapper: ?bodyClass=Sedan,SUV ↔ filters.bodyClass
// 2. GenericApiAdapter: API param bodyClass=Sedan,SUV
// 3. generateTableConfig(): column { field: 'bodyClass', header: 'Body Class', sortable: true }
// 4. generateTableFilterDefinitions(): multiselect filter with optionsEndpoint
```

**Escape hatches**: Fields with non-standard serialization (e.g., `modelCombos` = `"Ford:F-150,Toyota:Camry"`) use `customUrlParser`, `customUrlSerializer`, and `customApiMapper` callbacks on the field definition.

### 2. Two Distinct Filter Interfaces

**Problem**: The Query Control component and the inline table filters serve different UX patterns but early designs tried to share one interface.

**Decision**: Separate them cleanly.

| Interface | Renders in | UX Pattern | Key Properties |
|-----------|-----------|------------|----------------|
| `FilterDefinition<T>` | QueryControlComponent | Chip bar → dialog. User clicks chip, dialog opens (multiselect list, range slider, text input). Selected values show as removable chips. | `field`, `type`, `optionsEndpoint`, `optionsTransformer`, `urlParams`, `rangeConfig` |
| `TableFilterDefinition` | QueryPanelComponent / ResultsTable | Inline inputs above table columns. Immediate text/number/select filtering. | `id`, `type`, `operators`, `options`, `optionsEndpoint`, `autocompleteEndpoint`, `format` |

Both ultimately write to the same URL parameters and trigger the same `ResourceManagementService` cycle. They just offer different interaction models.

### 3. Component-Level Providers

**Problem**: If `ResourceManagementService` is a singleton, two discover pages on the same route can't coexist, and pop-out windows need separate state management.

**Decision**: `ResourceManagementService` is provided at the **component level**:

```typescript
@Component({
  providers: [ResourceManagementService, PopOutManagerService]
})
export class DiscoverComponent { ... }
```

Each discover page gets its own state instance. Pop-out windows share the host's instance via CDK Portal (same injector), so they see the same data without sync logic.

### 4. CDK Portal Pop-Outs (Not BroadcastChannel)

**Problem**: Pop-out windows need access to the same data and services as the main window.

**Alternatives considered**:
- **BroadcastChannel**: Requires serializing state, handling sync races, rebuilding DI in the child window. Complex and error-prone.
- **SharedWorker**: Same serialization issues, plus browser support concerns.

**Decision**: Open an `about:blank` window and use Angular CDK's `DomPortalOutlet` to render components into it. The portal component receives the host's Angular `Injector`, so it shares the exact same `ResourceManagementService` instance.

**Trade-off**: Pop-out windows don't survive page refresh (they're `about:blank`). This is acceptable because the URL-first design means the user can always reconstruct state by navigating back to the main page.

### 5. ChartDataSource as Abstract Class

**Problem**: Charts need to transform domain statistics into Plotly traces, and clicking a chart bar should apply a filter.

**Decision**: `ChartDataSource<TStatistics>` is an abstract class that domain authors extend:

```typescript
abstract class ChartDataSource<TStatistics = any> {
  abstract transform(stats: TStatistics, highlights?: any): ChartData;
  abstract toUrlParams(clickedValue: string, isHighlight: boolean): Params;
}
```

`transform()` converts statistics into Plotly `{data, layout}`. `toUrlParams()` converts a bar click into URL parameters. The `BaseChartComponent` calls both, keeping chart rendering and click handling domain-agnostic.

Highlights support is built in: when the API returns both base and highlighted statistics, chart sources render them as segmented bars (two traces — total + highlight).

### 6. URL-First State Management

**Problem**: Users need to bookmark filter states, share URLs, and use browser back/forward.

**Decision**: The `UrlStateService` → `ResourceManagementService` pipeline ensures:

1. **Every state change goes through the URL first.** Components call `urlStateService.setParams()`, never `resourceService.setFilters()`.
2. **URL changes trigger data fetches.** `ResourceManagementService` subscribes to `UrlStateService.params$` and runs the pipeline: parse → validate → fetch → emit.
3. **Deep linking works automatically.** Loading `/discover?manufacturer=Toyota&yearMin=2020&page=2` reconstructs the exact filter state and fetches the correct data.

**Implication**: There is no "set filters then navigate" pattern. The URL is not a reflection of state — it IS the state.

### 7. PickerConfig for Complex Selection

**Problem**: Some domains need selection UIs more complex than a dropdown — e.g., picking manufacturer+model combinations from a searchable, paginated table.

**Decision**: `PickerConfig<T>` defines a complete mini-application:

- **Columns**: PrimeNG table column definitions
- **API**: `fetchData()` function + `responseTransformer()`
- **Row**: `keyGenerator()` (row → string) + `keyParser()` (string → partial row)
- **Selection**: `serializer()` (selections → URL string) + `deserializer()` (URL string → partial selections)
- **Pagination**: Server-side or client-side
- **Caching**: Optional TTL-based caching

The `BasePickerComponent` is fully generic — it reads the `PickerConfig` and renders accordingly. New picker types require zero component code, only a new config object.

### 8. Highlight System

**Problem**: Users want to see how a subset of data compares to the whole — e.g., "show me all vehicles, but highlight Toyotas in the charts."

**Decision**: Parallel URL parameters with an `h_` prefix. Regular filters narrow the dataset; highlight filters overlay a subset within that dataset.

```
?manufacturer=Toyota,Honda&h_manufacturer=Toyota
```

This URL means: "Show Toyota and Honda vehicles in the table, but highlight only Toyota in the charts." The API returns both base statistics and highlighted statistics, and chart sources render them as segmented bars.

Fields opt into highlight support via `highlightable: true` on `ResourceField`. The `DomainConfig.highlightFilters` array mirrors `queryControlFilters` but maps to `h_*` URL parameters.

---

## File Organization

### Domain Configuration (per domain, written by developer)

```
src/app/domain-config/<domain>/
├── <domain>.resource.ts         # ResourceDefinition — THE source of truth
├── <domain>.domain-config.ts    # DomainConfig assembly + DOMAIN_PROVIDER
├── models/
│   ├── <domain>.filters.ts      # Filter state class (properties matching ResourceField names)
│   ├── <domain>.data.ts         # Data model with fromApiResponse()
│   └── <domain>.statistics.ts   # Statistics model with fromApiResponse()
├── configs/
│   ├── <domain>.query-control-filters.ts   # FilterDefinition<T>[] (hand-tuned)
│   ├── <domain>.highlight-filters.ts       # FilterDefinition<any>[] (h_* params)
│   ├── <domain>.chart-configs.ts           # ChartConfig[]
│   └── <domain>.picker-configs.ts          # PickerConfig<T>[] factory
├── chart-sources/
│   └── <field>-chart-source.ts  # One per chart (extends ChartDataSource)
├── adapters/
│   └── <domain>-cache-key-builder.ts  # ICacheKeyBuilder (usually the only hand-written adapter)
└── index.ts
```

### Minimum viable domain: 3 files

For a domain with no charts, no pickers, and standard caching:

1. `<domain>.resource.ts` — field definitions
2. `models/<domain>.filters.ts` + `<domain>.data.ts` — type models
3. `<domain>.domain-config.ts` — wires everything together

The `GenericUrlMapper`, `GenericApiAdapter`, `generateTableConfig()`, and `generateTableFilterDefinitions()` eliminate the need for hand-written adapters and configs.

### Maximum complexity: ~20 files

The automobile domain in this repo has 19 files because it uses:
- 4 custom chart sources (manufacturer, top-models, body-class, year)
- 1 picker (manufacturer-model with custom serialization)
- Custom query-control and highlight filter definitions
- Custom cache key builder

Most of that complexity comes from **presentation customization** (chart colors, layouts, picker columns), not framework integration.
