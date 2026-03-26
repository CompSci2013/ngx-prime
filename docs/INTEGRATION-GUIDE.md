# Integration Guide: Adding Discovery to a Brownfield Angular App

This guide is for developers who want to add a configuration-driven discovery interface to an existing Angular 13+ application using the ngx-prime libraries.

## What You'll Get

A fully functional discovery page with:
- Searchable, filterable, paginated data table
- URL-persisted filter state (bookmarkable, shareable)
- Chart dashboard with click-to-filter
- Multi-select picker components
- Pop-out panel support (any panel → separate window)
- Highlight system (overlay a subset in charts)

## Prerequisites

- Angular 13+ (Angular 14 recommended)
- PrimeNG installed (`primeng`, `primeicons`)
- Angular CDK installed (`@angular/cdk`)
- Plotly.js installed (for charts)

## Step 1: Import the Library Modules

In your feature module (or app module):

```typescript
import { FrameworkModule } from 'path-to-lib/framework';
import { PopoutModule } from 'path-to-lib/popout';

@NgModule({
  imports: [
    FrameworkModule,
    PopoutModule,
    // ... your other imports
  ]
})
export class MyFeatureModule { }
```

The `config` and `state-management` libraries are imported as TypeScript types/services — they don't have NgModules.

## Step 2: Define Your Resource

Create `src/app/domain-config/my-domain/my-domain.resource.ts`:

```typescript
import { ResourceDefinition, ResourceField } from 'path-to-lib/config';

const nameField: ResourceField = {
  name: 'name',
  label: 'Name',
  type: 'string',
  filterable: true,
  sortable: true,
  visible: true,
  highlightable: true,
  filterType: 'autocomplete',
  autocompleteEndpoint: 'filters/names',
  width: '200px',
  dataType: 'text'
};

const categoryField: ResourceField = {
  name: 'category',
  label: 'Category',
  type: 'array',
  filterable: true,
  sortable: true,
  visible: true,
  highlightable: true,
  filterType: 'multiselect',
  optionsEndpoint: 'category',
  width: '150px'
};

const priceMinField: ResourceField = {
  name: 'priceMin',
  label: 'Price (Min)',
  type: 'number',
  filterable: true,
  rangeField: 'price',    // Groups with priceMax
  rangeRole: 'min',
  min: 0
};

const priceMaxField: ResourceField = {
  name: 'priceMax',
  label: 'Price (Max)',
  type: 'number',
  filterable: true,
  rangeField: 'price',
  rangeRole: 'max',
  min: 0
};

const createdAtField: ResourceField = {
  name: 'createdAt',
  label: 'Created',
  type: 'date',
  sortable: true,
  visible: true,
  width: '120px',
  dataType: 'date'
};

const searchField: ResourceField = {
  name: 'search',
  label: 'Search',
  type: 'string',
  filterable: true,
  filterType: 'text',
  placeholder: 'Search...'
};

// Pagination and sorting (not user-visible, but needed for URL mapping)
const pageField: ResourceField = { name: 'page', label: 'Page', type: 'number', min: 1 };
const sizeField: ResourceField = { name: 'size', label: 'Size', type: 'number', min: 1, max: 100 };
const sortField: ResourceField = { name: 'sort', label: 'Sort', type: 'string', urlParam: 'sortBy' };
const sortDirField: ResourceField = { name: 'sortDirection', label: 'Sort Dir', type: 'string', urlParam: 'sortOrder' };

export const MY_DOMAIN_RESOURCE: ResourceDefinition = {
  name: 'my-domain',
  label: 'My Domain Discovery',
  fields: [
    nameField, categoryField, priceMinField, priceMaxField,
    createdAtField, searchField,
    pageField, sizeField, sortField, sortDirField
  ],
  endpoints: {
    search: '/items',
    stats: '/items/statistics'
  },
  pagination: {
    defaultSize: 20,
    sizeOptions: [10, 20, 50, 100]
  },
  sorting: {
    defaultField: 'name',
    defaultDirection: 'asc',
    sortFieldParam: 'sortBy',
    sortDirectionParam: 'sortOrder'
  },
  dataKey: 'id'
};
```

**Key points:**
- Every URL parameter your API accepts should be a field in this definition
- `rangeField` + `rangeRole` groups min/max fields into a single range filter control
- `urlParam` overrides the URL parameter name when it differs from the field name
- `filterType` overrides the auto-detected filter UI

## Step 3: Create Type Models

### Filter Model (`models/my-domain.filters.ts`)

```typescript
export class MyDomainFilters {
  name?: string;
  category?: string[];
  priceMin?: number;
  priceMax?: number;
  search?: string;
  page: number = 1;
  size: number = 20;
  sort?: string;
  sortDirection?: string;

  constructor(init?: Partial<MyDomainFilters>) {
    Object.assign(this, init);
  }
}
```

### Data Model (`models/my-domain.data.ts`)

```typescript
export class MyDomainItem {
  id: string = '';
  name: string = '';
  category: string = '';
  price: number = 0;
  createdAt: string = '';

  /**
   * Transform API response item to model instance.
   * Used by GenericApiAdapter's dataTransformer.
   */
  static fromApiResponse(item: any): MyDomainItem {
    const result = new MyDomainItem();
    result.id = item.id || '';
    result.name = item.name || '';
    result.category = item.category || '';
    result.price = item.price || 0;
    result.createdAt = item.created_at || item.createdAt || '';
    return result;
  }
}
```

### Statistics Model (`models/my-domain.statistics.ts`) — Optional

```typescript
export class MyDomainStatistics {
  totalCount: number = 0;
  byCategory: Map<string, number> = new Map();

  static fromApiResponse(stats: any): MyDomainStatistics {
    const result = new MyDomainStatistics();
    result.totalCount = stats?.totalCount || 0;
    if (stats?.categoryDistribution) {
      result.byCategory = new Map(Object.entries(stats.categoryDistribution));
    }
    return result;
  }
}
```

## Step 4: Create Query Control Filters

These are the chip-based filter dialogs. Hand-write these for full control over UX:

```typescript
// configs/my-domain.query-control-filters.ts
import { FilterDefinition } from 'path-to-lib/config';
import { MyDomainFilters } from '../models/my-domain.filters';

export const MY_DOMAIN_QUERY_CONTROL_FILTERS: FilterDefinition<MyDomainFilters>[] = [
  {
    field: 'category',
    label: 'Category',
    type: 'multiselect',
    optionsEndpoint: '/agg/category',
    optionsTransformer: (response) =>
      (response.values || []).map((v: any) => ({
        value: v.value,
        label: v.value,
        count: v.count
      })),
    urlParams: 'category',
    searchPlaceholder: 'Search categories...',
    dialogTitle: 'Select Categories'
  },
  {
    field: 'priceMin',
    label: 'Price Range',
    type: 'range',
    urlParams: { min: 'priceMin', max: 'priceMax' },
    rangeConfig: {
      valueType: 'decimal',
      minLabel: 'Min Price',
      maxLabel: 'Max Price',
      step: 0.01,
      decimalPlaces: 2,
      useGrouping: true,
      defaultRange: { min: 0, max: 1000000 }
    }
  },
  {
    field: 'search',
    label: 'Search',
    type: 'text',
    urlParams: 'search',
    searchPlaceholder: 'Search items...'
  }
];
```

## Step 5: Create Chart Sources (Optional)

```typescript
// chart-sources/category-chart-source.ts
import { ChartDataSource, ChartData } from 'path-to-lib/framework';
import { Params } from '@angular/router';
import { MyDomainStatistics } from '../models/my-domain.statistics';

export class CategoryChartDataSource extends ChartDataSource<MyDomainStatistics> {

  transform(stats: MyDomainStatistics, highlights?: any): ChartData {
    const entries = Array.from(stats.byCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      data: [{
        x: entries.map(e => e[0]),
        y: entries.map(e => e[1]),
        type: 'bar',
        marker: { color: '#4CAF50' }
      }],
      layout: {
        title: 'Top Categories',
        xaxis: { title: 'Category' },
        yaxis: { title: 'Count' }
      }
    };
  }

  toUrlParams(clickedValue: string, isHighlightMode: boolean): Params {
    const param = isHighlightMode ? 'h_category' : 'category';
    return { [param]: clickedValue };
  }
}
```

## Step 6: Assemble the Domain Config

```typescript
// my-domain.domain-config.ts
import { Injector, Provider } from '@angular/core';
import {
  DomainConfig, DOMAIN_CONFIG,
  GenericUrlMapper, GenericApiAdapter,
  generateTableConfig, generateTableFilterDefinitions
} from 'path-to-lib/config';
import { ApiService } from 'path-to-lib/state-management';
import { environment } from '../../../environments/environment';

import { MyDomainFilters } from './models/my-domain.filters';
import { MyDomainItem } from './models/my-domain.data';
import { MyDomainStatistics } from './models/my-domain.statistics';
import { MY_DOMAIN_RESOURCE } from './my-domain.resource';
import { MY_DOMAIN_QUERY_CONTROL_FILTERS } from './configs/my-domain.query-control-filters';
import { CategoryChartDataSource } from './chart-sources/category-chart-source';

export function createMyDomainConfig(injector: Injector): DomainConfig<
  MyDomainFilters, MyDomainItem, MyDomainStatistics
> {
  const apiService = injector.get(ApiService);

  return {
    domainName: 'my-domain',
    domainLabel: 'My Domain Discovery',
    apiBaseUrl: environment.apiBaseUrl,

    filterModel: MyDomainFilters,
    dataModel: MyDomainItem,
    statisticsModel: MyDomainStatistics,

    // Generic adapters — driven by MY_DOMAIN_RESOURCE
    apiAdapter: new GenericApiAdapter(apiService, MY_DOMAIN_RESOURCE, {
      baseUrl: environment.apiBaseUrl,
      dataTransformer: MyDomainItem.fromApiResponse,
      statisticsTransformer: MyDomainStatistics.fromApiResponse
    }),
    urlMapper: new GenericUrlMapper(MY_DOMAIN_RESOURCE),
    cacheKeyBuilder: { buildKey: (f, h) => JSON.stringify({ ...f, ...h }) },

    // UI configs — generated from resource, hand-written where needed
    tableConfig: generateTableConfig(MY_DOMAIN_RESOURCE),
    filters: generateTableFilterDefinitions(MY_DOMAIN_RESOURCE),
    queryControlFilters: MY_DOMAIN_QUERY_CONTROL_FILTERS,
    charts: [
      { id: 'category', title: 'Categories', type: 'bar', dataSourceId: 'category' }
    ],
    chartDataSources: {
      'category': new CategoryChartDataSource()
    },
    pickers: [],

    features: {
      highlights: false,   // Enable later when API supports h_* params
      popOuts: true,
      rowExpansion: false,
      statistics: true
    }
  };
}

// Drop-in provider for your module
export const MY_DOMAIN_PROVIDER: Provider = {
  provide: DOMAIN_CONFIG,
  useFactory: createMyDomainConfig,
  deps: [Injector]
};
```

## Step 7: Wire It Up

### In your feature module:

```typescript
import { MY_DOMAIN_PROVIDER } from './domain-config/my-domain/my-domain.domain-config';

@NgModule({
  imports: [FrameworkModule, PopoutModule, /* ... */],
  providers: [MY_DOMAIN_PROVIDER],
  declarations: [MyDiscoverComponent]
})
export class MyFeatureModule { }
```

### In your component:

```typescript
@Component({
  selector: 'app-my-discover',
  template: `
    <app-query-control></app-query-control>
    <app-basic-results-table></app-basic-results-table>
    <app-statistics-panel-2></app-statistics-panel-2>
  `,
  providers: [ResourceManagementService, PopOutManagerService]
})
export class MyDiscoverComponent implements OnInit {
  constructor(
    @Inject(DOMAIN_CONFIG) public config: DomainConfig<any, any, any>,
    public resourceService: ResourceManagementService,
    private urlState: UrlStateService,
    private popOutManager: PopOutManagerService,
    private injector: Injector
  ) {}

  ngOnInit() {
    this.popOutManager.initialize(this.injector);
  }
}
```

That's it. The framework components inject `ResourceManagementService` and `DOMAIN_CONFIG` from the component-level providers and render themselves.

---

## Common Customization Patterns

### Custom URL Serialization (Complex Fields)

For fields like `modelCombos` where the URL format is `"Ford:F-150,Toyota:Camry"`:

```typescript
const modelCombosField: ResourceField = {
  name: 'modelCombos',
  label: 'Selected Models',
  type: 'string',
  filterable: true,
  customUrlParser: (value) => value,  // Pass through
  customUrlSerializer: (value) => String(value),
  customApiMapper: (value) => ({ models: value })  // API wants 'models', not 'modelCombos'
};
```

### Inline Cache Key Builder (No Separate File)

For simple cases, skip the adapter file:

```typescript
cacheKeyBuilder: {
  buildKey: (filters, highlights) => JSON.stringify({ ...filters, ...highlights })
}
```

### Adding a Picker

```typescript
// configs/my-domain.picker-configs.ts
export function createMyPicker(apiService: ApiService): PickerConfig<MyRow> {
  return {
    id: 'my-picker',
    displayName: 'Select Items',
    columns: [
      { field: 'name', header: 'Name', sortable: true, filterable: true, width: '60%' },
      { field: 'count', header: 'Count', sortable: true, filterable: false, width: '40%' }
    ],
    api: {
      fetchData: (params) => apiService.get('/items/picker', { params }),
      responseTransformer: (r) => ({ results: r.data, total: r.total })
    },
    row: {
      keyGenerator: (row) => row.id,
      keyParser: (key) => ({ id: key })
    },
    selection: {
      mode: 'multiple',
      urlParam: 'selectedItems',
      serializer: (items) => items.map(i => i.id).join(','),
      deserializer: (url) => url.split(',').map(id => ({ id }))
    },
    pagination: { mode: 'server', defaultPageSize: 20 }
  };
}
```

### Enabling Highlights

1. Add `highlightable: true` to fields in your `ResourceDefinition`
2. Create `highlightFilters` array mirroring `queryControlFilters` but with `h_` URL params:

```typescript
export const MY_DOMAIN_HIGHLIGHT_FILTERS: FilterDefinition<any>[] = [
  {
    field: 'h_category',
    label: 'Highlight Category',
    type: 'multiselect',
    optionsEndpoint: '/agg/category',
    urlParams: 'h_category'
  }
];
```

3. Set `features.highlights: true` in your `DomainConfig`
4. Update chart sources to handle the `highlights` parameter in `transform()`

---

## Checklist

- [ ] `ResourceDefinition` with all fields, endpoints, pagination, sorting
- [ ] Filter model class with properties matching field names
- [ ] Data model class with `static fromApiResponse(item)`
- [ ] Statistics model class with `static fromApiResponse(stats)` (if using charts)
- [ ] Query control filters (`FilterDefinition<T>[]`)
- [ ] Chart configs + chart data sources (if using charts)
- [ ] Domain config factory function + `DOMAIN_PROVIDER`
- [ ] `DOMAIN_PROVIDER` added to feature module `providers`
- [ ] `ResourceManagementService` + `PopOutManagerService` in component-level `providers`
- [ ] Feature module imports `FrameworkModule` and `PopoutModule`
