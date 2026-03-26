# Framework UI Library (`src/app/lib/framework`)

Domain-agnostic UI components that render based on injected `DomainConfig`. These components have zero knowledge of any specific data domain — they work with "records," "filters," and "statistics."

## Components

### BaseChartComponent

Plotly.js chart container. Renders charts from a `ChartDataSource` that transforms domain statistics into Plotly traces.

**Inputs/Outputs:**
```typescript
@Input() chartConfig: ChartConfig;           // Chart definition (id, title, type, height)
@Input() dataSource: ChartDataSource;        // Transforms statistics → Plotly traces
@Input() data: TStatistics | undefined;      // Statistics data (or null)
@Input() highlights?: any;                   // Active highlight filters
@Input() selectedValue?: string;             // Currently selected bar/slice

@Output() chartClicked: EventEmitter<{ value: string; isHighlightMode: boolean }>;
```

**Pop-out aware:** Injects `PopOutContextService` (@Optional) and `ResourceManagementService` (@Optional). In pop-out windows, it subscribes to `statistics$`/`highlights$` directly via DI instead of relying on `@Input()` bindings.

**Usage in template:**
```html
<app-base-chart
  *ngFor="let chartId of chartOrder"
  [chartConfig]="domainConfig.charts | findById:chartId"
  [dataSource]="domainConfig.chartDataSources[chartId]"
  [data]="statistics"
  [highlights]="highlights"
  (chartClicked)="onChartClick($event, chartId)">
</app-base-chart>
```

**Creating a chart data source** (domain-config code, not in lib):
```typescript
// Extend the abstract ChartDataSource<TStatistics>
export class ManufacturerChartDataSource extends ChartDataSource<VehicleStatistics> {

  transform(statistics: VehicleStatistics | null, highlights: any,
            _selectedValue: string | null, _containerWidth: number): ChartData | null {
    if (!statistics?.byManufacturer) return null;
    const entries = Object.entries(statistics.byManufacturer)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 20);
    return {
      traces: [{ type: 'bar', x: entries.map(([n]) => n), y: entries.map(([,c]) => c) }],
      layout: { xaxis: { tickangle: -45 }, margin: { b: 120 } }
    };
  }

  toUrlParams(value: string, isHighlightMode: boolean): Record<string, any> {
    return { [isHighlightMode ? 'h_manufacturer' : 'manufacturer']: value };
  }
}
```

### BasePickerComponent

Configuration-driven multi-select table. Resolves its config from `PickerConfigRegistry` by `configId`, or accepts a `PickerConfig` directly.

**Inputs/Outputs:**
```typescript
@Input() configId?: string;           // Look up config from PickerConfigRegistry
@Input() config?: PickerConfig<T>;    // Or provide config directly

@Output() selectionChange: EventEmitter<PickerSelectionEvent<T>>;
```

**What PickerConfig controls:**
- Columns, pagination, search behavior
- `api.fetchData(params)` — how to load data
- `row.keyGenerator(row)` / `row.keyParser(key)` — row identity
- `selection.serializer(items)` / `selection.deserializer(urlString)` — URL sync
- `selection.urlParam` — which URL parameter holds selections

**Usage:**
```html
<app-base-picker
  configId="manufacturer-model-picker"
  (selectionChange)="onPickerSelectionChange($event)">
</app-base-picker>
```

### QueryControlComponent

Filter chip builder with add/remove/edit dialogs. Renders `FilterDefinition<TFilters>[]` from `domainConfig.queryControlFilters`. Supports multiselect dialogs (with API-loaded options) and range dialogs.

**Inputs/Outputs:**
```typescript
@Input() domainConfig: DomainConfig<TFilters, TData, TStatistics>;

@Output() urlParamsChange: EventEmitter<{ [key: string]: any }>;
@Output() clearAllFilters: EventEmitter<void>;
```

**How it works:**
1. Reads `domainConfig.queryControlFilters` to build the filter dropdown
2. User selects a field → opens multiselect or range dialog
3. Dialog fetches options from `filterDef.optionsEndpoint`, transforms via `optionsTransformer`
4. On confirm → emits `urlParamsChange` with new URL params
5. Parent component calls `urlStateService.setParams()` → URL updates → data refreshes

**Usage:**
```html
<app-query-control
  [domainConfig]="domainConfig"
  (urlParamsChange)="onUrlParamsChange($event)"
  (clearAllFilters)="onClearAllFilters()">
</app-query-control>
```

### QueryPanelComponent

Inline filter panel (dropdowns, autocomplete, text inputs above the results table). Uses `domainConfig.filters` (`TableFilterDefinition[]`) for field definitions.

**Inputs/Outputs:**
```typescript
@Input() domainConfig: DomainConfig<TFilters, TData, TStatistics>;

@Output() urlParamsChange: EventEmitter<{ [key: string]: any }>;
@Output() clearAllFilters: EventEmitter<void>;
```

### BasicResultsTableComponent / ResultsTableComponent

PrimeNG lazy-loaded data table. Reads columns from `domainConfig.tableConfig`. Gets data from `ResourceManagementService` (injected, not via `@Input()`).

**Key state** (all from ResourceManagementService getters):
```typescript
get results(): TData[]                    // Current page of results
get totalResults(): number                // Total count (unpaginated)
get loading(): boolean                    // API call in progress
get statistics(): TStatistics | undefined // Aggregated stats
```

**`BasicResultsTableComponent`** — pure display table (pagination + sorting only).
**`ResultsTableComponent`** — display table with inline `QueryPanelComponent` filters.

**Usage:**
```html
<app-basic-results-table [domainConfig]="domainConfig">
</app-basic-results-table>
```

### StatisticsPanel2Component

CDK drag-drop grid of charts. Reads chart configs from `domainConfig.charts` and data sources from `domainConfig.chartDataSources`. Charts are reorderable by dragging.

**Inputs/Outputs:**
```typescript
@Input() domainConfig: DomainConfig<any, any, any>;
@Input() isPanelPoppedOut: (panelId: string) => boolean;

@Output() chartPopOut: EventEmitter<string>;
@Output() chartClicked: EventEmitter<{ event, dataSource }>;
```

## How Components Get Data

Framework components do **not** receive data through `@Input()` bindings. They inject `ResourceManagementService` directly and read from it:

```typescript
// Inside a framework component
constructor(
  private resourceService: ResourceManagementService<any, any, any>,
  // ...
) {}

get statistics() { return this.resourceService.statistics; }
get results()    { return this.resourceService.results; }
get loading()    { return this.resourceService.loading; }
```

This works because `DiscoverComponent` provides `ResourceManagementService` at component level (`providers: [ResourceManagementService]`), so all child components share the same instance.

## Integrating Into a Brownfield App

1. Import `FrameworkModule` in your feature module
2. Provide `DOMAIN_CONFIG` (see config library README)
3. Provide `ResourceManagementService` and `PopOutManagerService` at your page component level
4. Use framework components in your template — they self-configure from the injected `DOMAIN_CONFIG`

```typescript
// your-page.component.ts
@Component({
  selector: 'app-your-page',
  providers: [ResourceManagementService, PopOutManagerService],
  template: `
    <app-query-control [domainConfig]="domainConfig" (urlParamsChange)="onUrlParamsChange($event)">
    </app-query-control>
    <app-statistics-panel-2 [domainConfig]="domainConfig" (chartPopOut)="onChartPopOut($event)">
    </app-statistics-panel-2>
    <app-basic-results-table [domainConfig]="domainConfig">
    </app-basic-results-table>
  `
})
export class YourPageComponent {
  constructor(
    @Inject(DOMAIN_CONFIG) public domainConfig: DomainConfig<any, any, any>,
    public resourceService: ResourceManagementService<any, any, any>
  ) {}
}
```

## Barrel Export

All public components, services, and types are exported through `index.ts`. Import from `../../lib/framework` — never deep-import component files directly.
