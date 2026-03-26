# Configuration Library (`src/app/lib/config`)

Defines domain configuration: data shapes, URL/API adapters, table/filter/chart configs, and registries. This is the entry point when adding a new data domain to a brownfield project.

## Contents

| Directory | Purpose |
|-----------|---------|
| `models/` | Interfaces: `DomainConfig`, `ResourceDefinition`, `FilterDefinition<T>`, `TableConfig`, `PickerConfig`, `ChartConfig` |
| `adapters/` | `GenericUrlMapper`, `GenericApiAdapter` — configuration-driven replacements for hand-written mappers |
| `utils/` | `config-generators.ts` — auto-generate `TableConfig` and `TableFilterDefinition[]` from a `ResourceDefinition` |
| `services/` | `DomainConfigRegistry`, `PickerConfigRegistry`, `DomainConfigValidator` |
| `tokens/` | `DOMAIN_CONFIG` injection token, `ENVIRONMENT_CONFIG` token |

## Core Concepts

### ResourceDefinition — Single Source of Truth

A `ResourceDefinition` declares every field in your domain once. The framework derives URL mappers, API adapters, table columns, and inline filters from it. This replaces separate hand-written mapper/adapter/config files.

Each `ResourceField` supports:
- **Capability flags**: `filterable`, `sortable`, `visible`, `highlightable`
- **Type hints**: `type` (`string | number | boolean | date | array | select`), `filterType` (`text | autocomplete | multiselect | range | ...`)
- **Parameter overrides**: `urlParam` (custom URL name), `apiParam` (custom API name)
- **Range pairs**: `rangeField` + `rangeRole` for min/max fields (e.g., `yearMin`/`yearMax` both reference `rangeField: 'year'`)
- **Escape hatches**: `customUrlParser`, `customUrlSerializer`, `customApiMapper` for complex formats

```typescript
// domain-config/automobile/automobile.resource.ts (actual code)

const bodyClassField: ResourceField = {
  name: 'bodyClass',
  label: 'Body Class',
  type: 'array',
  filterable: true,
  sortable: true,
  visible: true,
  highlightable: true,
  placeholder: 'Select body classes...',
  filterType: 'multiselect',
  optionsEndpoint: 'body_class',
  width: '120px',
  dataType: 'text'
};

// Range fields reference a shared rangeField name
const yearMinField: ResourceField = {
  name: 'yearMin',
  label: 'Year (Min)',
  type: 'number',
  filterable: true,
  highlightable: true,
  rangeField: 'year',
  rangeRole: 'min',
  min: 1900,
  max: new Date().getFullYear() + 1
};

// Fields with complex serialization use escape hatches
const modelCombosField: ResourceField = {
  name: 'modelCombos',
  label: 'Selected Models',
  type: 'string',
  filterable: true,
  customUrlParser: (value: string) => value,
  customUrlSerializer: (value: any) => String(value),
  customApiMapper: (value: any) => ({ models: value })  // API expects 'models', not 'modelCombos'
};

export const AUTOMOBILE_RESOURCE: ResourceDefinition = {
  name: 'automobile',
  label: 'Automobile Discovery',
  fields: [
    manufacturerField, modelField, yearMinField, yearMaxField,
    bodyClassField, searchField, modelCombosField,
    pageField, sizeField, sortField, sortDirectionField,
    vehicleIdField, yearField, instanceCountField
  ],
  endpoints: { search: '/vehicles/details', stats: '/statistics' },
  pagination: { defaultSize: 10, sizeOptions: [10, 20, 50, 100], pageParam: 'page', sizeParam: 'size', zeroIndexed: false },
  sorting: { defaultField: 'manufacturer', defaultDirection: 'asc', sortFieldParam: 'sortBy', sortDirectionParam: 'sortOrder' },
  highlights: { prefix: 'h_', valueSeparator: ',', normalizePipes: true },
  dataKey: 'vehicle_id'
};
```

### DomainConfig — The Assembled Configuration

`DomainConfig<TFilters, TData, TStatistics>` combines a ResourceDefinition's generated outputs with domain-specific adapters, filter definitions, chart sources, and feature flags into one injectable object.

```typescript
// domain-config/automobile/automobile.domain-config.ts (actual code)

export function createAutomobileDomainConfig(injector: Injector): DomainConfig<
  AutoSearchFilters, VehicleResult, VehicleStatistics
> {
  const apiService = injector.get(ApiService);
  return {
    domainName: 'automobile',
    domainLabel: 'Vvroom Discovery',
    apiBaseUrl: environment.apiBaseUrl,
    filterModel: AutoSearchFilters,
    dataModel: VehicleResult,
    statisticsModel: VehicleStatistics,

    // Generic adapters driven by AUTOMOBILE_RESOURCE
    apiAdapter: new GenericApiAdapter(apiService, AUTOMOBILE_RESOURCE, {
      baseUrl: environment.apiBaseUrl,
      dataTransformer: VehicleResult.fromApiResponse,
      statisticsTransformer: VehicleStatistics.fromApiResponse
    }),
    urlMapper: new GenericUrlMapper(AUTOMOBILE_RESOURCE),
    cacheKeyBuilder: new AutomobileCacheKeyBuilder(),

    // UI config — generated + hand-written
    tableConfig: generateTableConfig<VehicleResult>(AUTOMOBILE_RESOURCE),
    filters: generateTableFilterDefinitions(AUTOMOBILE_RESOURCE),
    queryControlFilters: AUTOMOBILE_QUERY_CONTROL_FILTERS,
    highlightFilters: AUTOMOBILE_HIGHLIGHT_FILTERS,
    charts: AUTOMOBILE_CHART_CONFIGS,
    chartDataSources: {
      'manufacturer': new ManufacturerChartDataSource(),
      'top-models': new TopModelsChartDataSource(),
      'body-class': new BodyClassChartDataSource(),
      'year': new YearChartDataSource()
    },
    pickers: AUTOMOBILE_PICKER_CONFIGS,

    features: { highlights: true, popOuts: true, rowExpansion: true, statistics: true, export: true },
    metadata: { version: '1.0.0', description: 'Automobile vehicle discovery and analysis' }
  };
}

// Register via DI in your module:
export const DOMAIN_PROVIDER: Provider = {
  provide: DOMAIN_CONFIG,
  useFactory: createAutomobileDomainConfig,
  deps: [Injector]
};
```

### FilterDefinition<T> vs TableFilterDefinition

Two distinct filter interfaces exist:

- **`FilterDefinition<T>`** — Used by `QueryControlComponent`. Typed to filter model (`<AutoSearchFilters>`). Defines dialogs for adding/removing filter chips. Has `optionsEndpoint`, `optionsTransformer`, `rangeConfig`.
- **`TableFilterDefinition`** — Used by `QueryPanelComponent` for inline table header filters. Auto-generated from `ResourceDefinition` via `generateTableFilterDefinitions()`.

```typescript
// FilterDefinition<T> — hand-written, type-safe to filter model
const yearFilter: FilterDefinition<AutoSearchFilters> = {
  field: 'yearMin',               // keyof AutoSearchFilters
  label: 'Year',
  type: 'range',
  urlParams: { min: 'yearMin', max: 'yearMax' },
  rangeConfig: {
    valueType: 'integer',
    minLabel: 'Start Year',
    maxLabel: 'End Year',
    step: 1,
    defaultRange: { min: 1900, max: new Date().getFullYear() }
  }
};

// TableFilterDefinition — auto-generated from ResourceDefinition
const tableFilters = generateTableFilterDefinitions(AUTOMOBILE_RESOURCE);
```

### Registries

**`DomainConfigRegistry`** — register/retrieve domain configs by name. Supports multi-domain apps.

```typescript
// Register
registry.register(automobileConfig);
registry.register(realEstateConfig);

// Retrieve
const config = registry.get<Filters, Data, Stats>('automobile');
registry.setActive('automobile');
const active = registry.getActive();
```

**`PickerConfigRegistry`** — register picker configs (used by `BasePickerComponent`).

```typescript
const pickerConfigs = createAutomobilePickerConfigs(injector);
pickerRegistry.registerMultiple(pickerConfigs);

// BasePickerComponent resolves config by ID:
// <app-base-picker configId="manufacturer-model-picker">
```

## Adding a New Domain (Step-by-Step)

1. **Create `domain-config/your-domain/your-domain.resource.ts`** — define all fields as `ResourceField[]`, endpoints, pagination, sorting
2. **Create filter/data/statistics model classes** in `domain-config/your-domain/models/`
3. **Create `your-domain.domain-config.ts`** — assemble `DomainConfig` using `GenericUrlMapper`, `GenericApiAdapter`, and generators
4. **Create query control filters** in `configs/your-domain.query-control-filters.ts` (hand-written `FilterDefinition<T>[]`)
5. **Create chart data sources** (if needed) — extend `ChartDataSource<TStatistics>`, implement `transform()`, `handleClick()`, `toUrlParams()`
6. **Register provider** — export `DOMAIN_PROVIDER` and add to your feature module
7. **Use framework components** — they read everything from the injected `DOMAIN_CONFIG`

## Barrel Export (`index.ts`)

All public types are exported through `index.ts`. Application code must import from `../../lib/config` — never deep-import internal files.
