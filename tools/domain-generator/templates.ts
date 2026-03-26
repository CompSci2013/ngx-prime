/**
 * Code generation templates.
 *
 * Each function returns a string of generated TypeScript source for one file
 * in the domain-config directory.
 */

import { GeneratorOptions, ResolvedField } from './types';
import { toCamelCase } from './schema-resolver';

// ============================================================================
// Helpers
// ============================================================================

function pascalCase(s: string): string {
  return s.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function camelCase(s: string): string {
  const p = pascalCase(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

/** kebab-case from domain name */
function kebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();
}

function filterFields(fields: ResolvedField[]): ResolvedField[] {
  return fields.filter(f => f.filterable);
}

function keywordFields(fields: ResolvedField[]): ResolvedField[] {
  return fields.filter(f => f.aggregable && (f.esType === 'keyword' || f.hasKeywordSubfield));
}

function numericFields(fields: ResolvedField[]): ResolvedField[] {
  return fields.filter(f => f.aggregable && ['integer', 'long', 'float', 'double'].includes(f.esType));
}

function rangeFields(fields: ResolvedField[]): ResolvedField[] {
  return fields.filter(f => f.filterType === 'range');
}

function visibleFields(fields: ResolvedField[]): ResolvedField[] {
  return fields.filter(f => f.visible);
}

function chartableFields(fields: ResolvedField[]): ResolvedField[] {
  return fields.filter(f => f.aggregable && f.esType !== 'boolean');
}

// ============================================================================
// Resource Definition
// ============================================================================

export function genResource(opts: GeneratorOptions, fields: ResolvedField[]): string {
  const Domain = pascalCase(opts.domain);
  const DOMAIN = opts.domain.toUpperCase().replace(/-/g, '_');

  const fieldDefs = fields.map(f => {
    const lines: string[] = [];
    lines.push(`const ${f.tsName}Field: ResourceField = {`);
    lines.push(`  name: '${f.tsName}',`);
    lines.push(`  label: '${f.label}',`);
    lines.push(`  type: '${f.resourceFieldType}',`);
    if (f.filterable) lines.push(`  filterable: true,`);
    if (f.sortable) lines.push(`  sortable: true,`);
    if (f.visible) lines.push(`  visible: true,`);
    if (f.highlightable) lines.push(`  highlightable: true,`);
    if (f.filterType === 'multiselect') {
      lines.push(`  filterType: 'multiselect',`);
      lines.push(`  optionsEndpoint: 'filters/${f.esPath.replace(/\./g, '-')}',`);
    } else if (f.filterType === 'autocomplete') {
      lines.push(`  filterType: 'autocomplete',`);
      lines.push(`  autocompleteEndpoint: 'filters/${f.esPath.replace(/\./g, '-')}',`);
    } else if (f.filterType === 'range') {
      lines.push(`  filterType: 'number',`);
    } else if (f.filterType === 'daterange') {
      lines.push(`  filterType: 'date',`);
    } else if (f.filterType === 'boolean') {
      lines.push(`  filterType: 'select',`);
      lines.push(`  options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }],`);
    }
    if (f.visible) lines.push(`  width: '${f.resourceFieldType === 'number' ? '100' : '150'}px',`);
    if (f.esPath !== f.tsName) {
      lines.push(`  urlParam: '${f.tsName}',`);
      lines.push(`  apiParam: '${f.esPath}',`);
    }
    lines.push(`};`);
    return lines.join('\n');
  });

  // Pagination + sort fields (always needed)
  const builtinFields = `
const pageField: ResourceField = {
  name: 'page',
  label: 'Page',
  type: 'number',
  min: 1
};

const sizeField: ResourceField = {
  name: 'size',
  label: 'Page Size',
  type: 'number',
  min: 1,
  max: 100
};

const sortField: ResourceField = {
  name: 'sort',
  label: 'Sort Field',
  type: 'string',
  urlParam: 'sortBy',
  apiParam: 'sort'
};

const sortDirectionField: ResourceField = {
  name: 'sortDirection',
  label: 'Sort Direction',
  type: 'string',
  urlParam: 'sortOrder',
  apiParam: 'sortDirection'
};`;

  const fieldNames = fields.map(f => `    ${f.tsName}Field`).join(',\n');

  return `/**
 * ${Domain} Resource Definition
 *
 * Generated from Elasticsearch index mapping.
 * Single source of truth — drives URL mappers, API adapters, table configs, and filter definitions.
 *
 * Review and adjust:
 * - Field labels
 * - Field visibility and filter types
 * - API endpoints for filter options
 * - Range min/max defaults
 */

import { ResourceDefinition, ResourceField } from '../../lib/config';

// ============================================================================
// Field Definitions
// ============================================================================

${fieldDefs.join('\n\n')}

// ============================================================================
// Built-in Fields (pagination, sorting)
// ============================================================================
${builtinFields}

// ============================================================================
// Resource Definition
// ============================================================================

export const ${DOMAIN}_RESOURCE: ResourceDefinition = {
  name: '${opts.domain}',
  label: '${opts.label}',
  fields: [
${fieldNames},

    // Pagination
    pageField,
    sizeField,

    // Sorting
    sortField,
    sortDirectionField
  ],
  endpoints: {
    search: '${opts.apiBase}/search',
    stats: '${opts.apiBase}/statistics'
  },
  pagination: {
    defaultSize: 20,
    sizeOptions: [10, 20, 50, 100],
    pageParam: 'page',
    sizeParam: 'size',
    zeroIndexed: false
  },
  sorting: {
    defaultField: '${fields.find(f => f.sortable)?.tsName || fields[0]?.tsName || 'id'}',
    defaultDirection: 'asc',
    sortFieldParam: 'sortBy',
    sortDirectionParam: 'sortOrder'
  },
  highlights: {
    prefix: 'h_',
    valueSeparator: ',',
    normalizePipes: true
  },
  dataKey: '${toCamelCase(opts.dataKey)}'
};
`;
}

// ============================================================================
// Filter Model
// ============================================================================

export function genFilters(opts: GeneratorOptions, fields: ResolvedField[]): string {
  const Domain = pascalCase(opts.domain);
  const ClassName = `${Domain}Filters`;
  const filterable = filterFields(fields);

  const props = filterable.map(f => {
    const tsType = f.resourceFieldType === 'number' ? 'number | null'
      : f.resourceFieldType === 'boolean' ? 'boolean | null'
      : f.resourceFieldType === 'date' ? 'string | null'
      : f.filterType === 'multiselect' ? 'string | null'
      : 'string | null';
    return `  ${f.tsName}: ${tsType};`;
  }).join('\n');

  const defaults = filterable.map(f => {
    const val = f.resourceFieldType === 'number' ? 'null'
      : f.resourceFieldType === 'boolean' ? 'null'
      : 'null';
    return `      ${f.tsName}: ${val},`;
  }).join('\n');

  return `/**
 * ${Domain} Filter Model
 *
 * Generated from Elasticsearch index mapping.
 * Represents the complete set of filter parameters for ${opts.label}.
 */

export class ${ClassName} {
${props}
  page: number;
  size: number;
  sort: string;
  sortDirection: string;

  constructor(partial?: Partial<${ClassName}>) {
    const defaults = ${ClassName}.getDefaults();
    Object.assign(this, defaults, partial);
  }

  static getDefaults(): ${ClassName} {
    return Object.assign(new ${ClassName}(), {
${defaults}
      page: 1,
      size: 20,
      sort: '${filterable.find(f => f.sortable)?.tsName || ''}',
      sortDirection: 'asc'
    });
  }

  static fromPartial(partial: Partial<${ClassName}>): ${ClassName} {
    return new ${ClassName}(partial);
  }

  isEmpty(): boolean {
    const defaults = ${ClassName}.getDefaults();
    return Object.keys(this).every(key => {
      if (['page', 'size', 'sort', 'sortDirection'].includes(key)) return true;
      return (this as any)[key] === (defaults as any)[key];
    });
  }

  clone(): ${ClassName} {
    return new ${ClassName}({ ...this });
  }
}
`;
}

// ============================================================================
// Data Model
// ============================================================================

export function genData(opts: GeneratorOptions, fields: ResolvedField[]): string {
  const Domain = pascalCase(opts.domain);
  const ClassName = `${Domain}Result`;
  const visible = visibleFields(fields);

  const props = visible.map(f => {
    const tsType = f.resourceFieldType === 'number' ? 'number'
      : f.resourceFieldType === 'boolean' ? 'boolean'
      : 'string';
    const optional = f.esPath === opts.dataKey ? '' : '?';
    return `  ${f.tsName}${optional}: ${tsType};`;
  }).join('\n');

  const mappings = visible.map(f => {
    if (f.esPath === f.tsName) {
      return `      ${f.tsName}: raw.${f.esPath}`;
    }
    // Handle nested paths: raw.location?.city
    const accessPath = f.esPath.split('.').reduce((acc, part, i) => {
      return i === 0 ? `raw.${part}` : `${acc}?.${part}`;
    }, '');
    return `      ${f.tsName}: ${accessPath}`;
  }).join(',\n');

  return `/**
 * ${Domain} Data Model
 *
 * Generated from Elasticsearch index mapping.
 * Represents a single result row from the ${opts.label} API.
 */

export class ${ClassName} {
${props}

  constructor(partial?: Partial<${ClassName}>) {
    Object.assign(this, partial);
  }

  static fromApiResponse(raw: any): ${ClassName} {
    return new ${ClassName}({
${mappings}
    });
  }

  getDisplayName(): string {
    return String(this.${toCamelCase(opts.dataKey)} || 'Unknown');
  }
}
`;
}

// ============================================================================
// Statistics Model
// ============================================================================

export function genStatistics(opts: GeneratorOptions, fields: ResolvedField[]): string {
  const Domain = pascalCase(opts.domain);
  const ClassName = `${Domain}Statistics`;
  const chartable = chartableFields(fields);
  const kw = keywordFields(fields);
  const num = numericFields(fields);

  const byFieldProps = kw.map(f =>
    `  by${pascalCase(f.tsName)}?: Record<string, number | { total: number; highlighted: number }>;`
  ).join('\n');

  const byFieldMappings = kw.map(f =>
    `      by${pascalCase(f.tsName)}: raw.by_${f.esPath.replace(/\./g, '_')} || raw.by${pascalCase(f.tsName)} || {}`
  ).join(',\n');

  return `/**
 * ${Domain} Statistics Model
 *
 * Generated from Elasticsearch index mapping.
 * Represents aggregated statistics from the ${opts.label} API.
 *
 * Each keyword/categorical field gets a "by<Field>" distribution map.
 * The API can return simple counts or segmented {total, highlighted} objects.
 */

export class ${ClassName} {
  totalResults?: number;
${byFieldProps}

  constructor(partial?: Partial<${ClassName}>) {
    Object.assign(this, partial);
  }

  static fromApiResponse(raw: any): ${ClassName} {
    if (!raw) return new ${ClassName}();
    return new ${ClassName}({
      totalResults: raw.total || raw.totalResults || 0,
${byFieldMappings}
    });
  }
}
`;
}

// ============================================================================
// Models Index
// ============================================================================

export function genModelsIndex(opts: GeneratorOptions): string {
  const d = kebab(opts.domain);
  return `export * from './${d}.filters';
export * from './${d}.data';
export * from './${d}.statistics';
`;
}

// ============================================================================
// Query Control Filters
// ============================================================================

export function genQueryControlFilters(opts: GeneratorOptions, fields: ResolvedField[]): string {
  const Domain = pascalCase(opts.domain);
  const DOMAIN = opts.domain.toUpperCase().replace(/-/g, '_');
  const filterable = fields.filter(f => f.filterable && f.filterType);

  const filterDefs = filterable.map(f => {
    const lines: string[] = [];
    lines.push(`  {`);
    lines.push(`    field: '${f.tsName}',`);
    lines.push(`    label: '${f.label}',`);

    if (f.filterType === 'range' || f.filterType === 'daterange') {
      lines.push(`    type: 'range',`);
      lines.push(`    urlParams: { min: '${f.tsName}Min', max: '${f.tsName}Max' },`);
      if (f.resourceFieldType === 'number') {
        lines.push(`    rangeConfig: {`);
        lines.push(`      valueType: 'integer',`);
        lines.push(`      minLabel: 'Min ${f.label}',`);
        lines.push(`      maxLabel: 'Max ${f.label}',`);
        lines.push(`      step: 1`);
        lines.push(`    }`);
      }
    } else if (f.filterType === 'multiselect') {
      lines.push(`    type: 'multiselect',`);
      lines.push(`    optionsEndpoint: \`\${environment.apiBaseUrl}/filters/${f.esPath.replace(/\./g, '-')}\`,`);
      lines.push(`    optionsTransformer: (response: any): FilterOption[] => {`);
      lines.push(`      if (response && Array.isArray(response.values)) {`);
      lines.push(`        return response.values.map((v: string) => ({ value: v, label: v }));`);
      lines.push(`      }`);
      lines.push(`      return [];`);
      lines.push(`    },`);
      lines.push(`    urlParams: '${f.tsName}',`);
      lines.push(`    searchPlaceholder: 'Search ${f.label.toLowerCase()}...'`);
    } else if (f.filterType === 'autocomplete') {
      lines.push(`    type: 'text',`);
      lines.push(`    urlParams: '${f.tsName}'`);
    } else if (f.filterType === 'boolean') {
      lines.push(`    type: 'multiselect',`);
      lines.push(`    urlParams: '${f.tsName}'`);
    }

    lines.push(`  }`);
    return lines.join('\n');
  });

  return `/**
 * ${Domain} Query Control Filter Definitions
 *
 * Generated from Elasticsearch index mapping.
 * Defines filter dialogs for the QueryControlComponent.
 *
 * Review and adjust:
 * - optionsTransformer functions (must match your API response format)
 * - optionsEndpoint URLs
 * - Range defaults
 */

import { FilterDefinition, FilterOption } from '../../../lib/config';
import { ${Domain}Filters } from '../models/${kebab(opts.domain)}.filters';
import { environment } from '../../../../environments/environment';

export const ${DOMAIN}_QUERY_CONTROL_FILTERS: FilterDefinition<${Domain}Filters>[] = [
${filterDefs.join(',\n\n')}
];
`;
}

// ============================================================================
// Highlight Filters
// ============================================================================

export function genHighlightFilters(opts: GeneratorOptions, fields: ResolvedField[]): string {
  const Domain = pascalCase(opts.domain);
  const DOMAIN = opts.domain.toUpperCase().replace(/-/g, '_');
  const highlightable = fields.filter(f => f.highlightable);

  const filterDefs = highlightable.map(f => {
    const lines: string[] = [];
    lines.push(`  {`);
    lines.push(`    field: '${f.tsName}' as any,`);
    lines.push(`    label: '${f.label}',`);
    lines.push(`    type: 'multiselect',`);
    lines.push(`    optionsEndpoint: \`\${environment.apiBaseUrl}/filters/${f.esPath.replace(/\./g, '-')}\`,`);
    lines.push(`    optionsTransformer: (response: any): FilterOption[] => {`);
    lines.push(`      if (response && Array.isArray(response.values)) {`);
    lines.push(`        return response.values.map((v: string) => ({ value: v, label: v }));`);
    lines.push(`      }`);
    lines.push(`      return [];`);
    lines.push(`    },`);
    lines.push(`    urlParams: 'h_${f.tsName}'`);
    lines.push(`  }`);
    return lines.join('\n');
  });

  return `/**
 * ${Domain} Highlight Filter Definitions
 *
 * Generated from Elasticsearch index mapping.
 * Mirrors query-control filters but with h_ prefix for highlight parameters.
 */

import { FilterDefinition, FilterOption } from '../../../lib/config';
import { ${Domain}Filters } from '../models/${kebab(opts.domain)}.filters';
import { environment } from '../../../../environments/environment';

export const ${DOMAIN}_HIGHLIGHT_FILTERS: FilterDefinition<any>[] = [
${filterDefs.join(',\n\n')}
];
`;
}

// ============================================================================
// Chart Configs
// ============================================================================

export function genChartConfigs(opts: GeneratorOptions, fields: ResolvedField[]): string {
  const Domain = pascalCase(opts.domain);
  const DOMAIN = opts.domain.toUpperCase().replace(/-/g, '_');
  const chartable = chartableFields(fields);

  const configs = chartable.map((f, i) => {
    const chartType = ['integer', 'long', 'float', 'double'].includes(f.esType) ? 'histogram' : 'bar';
    return `  {
    id: '${f.tsName}',
    title: '${f.label} Distribution',
    type: '${chartType}' as any,
    dataSourceId: '${f.tsName}',
    height: 350,
    visible: ${i < 4}
  }`;
  });

  return `/**
 * ${Domain} Chart Configurations
 *
 * Generated from Elasticsearch index mapping.
 * One chart per aggregable field.
 *
 * Review: remove charts that aren't useful, adjust heights, reorder.
 */

import { ChartConfig } from '../../../lib/config';

export const ${DOMAIN}_CHART_CONFIGS: ChartConfig[] = [
${configs.join(',\n\n')}
];
`;
}

// ============================================================================
// Chart Data Sources
// ============================================================================

export function genChartSource(opts: GeneratorOptions, field: ResolvedField): string {
  const Domain = pascalCase(opts.domain);
  const FieldPascal = pascalCase(field.tsName);
  const isNumeric = ['integer', 'long', 'float', 'double'].includes(field.esType);

  return `/**
 * ${field.label} Chart Data Source
 *
 * Generated from Elasticsearch index mapping.
 * Transforms ${opts.domain} statistics into Plotly.js chart data.
 */

import { ChartDataSource, ChartData } from '../../../lib/framework';
import { ${Domain}Statistics } from '../models/${kebab(opts.domain)}.statistics';

export class ${FieldPascal}ChartDataSource extends ChartDataSource<${Domain}Statistics> {

  transform(
    statistics: ${Domain}Statistics | null,
    _highlights: any,
    _selectedValue: string | null,
    _containerWidth: number
  ): ChartData | null {
    const data = statistics?.by${FieldPascal};
    if (!data) return null;

    const entries = Object.entries(data);
    if (entries.length === 0) return null;

    // Detect segmented format ({total, highlighted})
    const isSegmented = entries.length > 0 &&
      typeof entries[0][1] === 'object' &&
      entries[0][1] !== null &&
      'total' in entries[0][1];

    let traces: any[];

    if (isSegmented) {
      const sorted = entries
        .sort((a, b) => ((b[1] as any).total || 0) - ((a[1] as any).total || 0))
        .slice(0, 20);
      const labels = sorted.map(([name]) => name);
      const highlighted = sorted.map(([, s]: [string, any]) => s.highlighted || 0);
      const other = sorted.map(([, s]: [string, any]) => (s.total || 0) - (s.highlighted || 0));

      traces = [
        { type: 'bar', name: 'Highlighted', x: labels, y: highlighted, marker: { color: '#3B82F6' } },
        { type: 'bar', name: 'Other', x: labels, y: other, marker: { color: '#9CA3AF' } }
      ];
    } else {
      const sorted = entries
        .map(([name, count]) => [name, typeof count === 'number' ? count : 0] as [string, number])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
      const labels = sorted.map(([name]) => name);
      const counts = sorted.map(([, count]) => count);

      traces = [{
        type: 'bar',
        x: labels,
        y: counts,
        marker: { color: '#3B82F6' },
        hovertemplate: '<b>%{x}</b><br>Count: %{y}<extra></extra>'
      }];
    }

    return {
      traces,
      layout: {
        barmode: isSegmented ? 'stack' : undefined,
        xaxis: { tickangle: -45, automargin: true, color: '#FFFFFF', gridcolor: '#333333' },
        yaxis: { gridcolor: '#333333', automargin: true, color: '#FFFFFF' },
        margin: { l: 60, r: 40, t: 40, b: 120 },
        plot_bgcolor: '#000000',
        paper_bgcolor: '#1a1a1a',
        font: { color: '#FFFFFF' },
        showlegend: isSegmented
      }
    };
  }

  getTitle(): string {
    return '${field.label} Distribution';
  }

  handleClick(event: any): string | null {
    if (event.points?.length > 0) {
      const values = [...new Set(event.points.map((p: any) => String(p.x)))];
      return values.join(',') || null;
    }
    return null;
  }

  toUrlParams(value: string, isHighlightMode: boolean): Record<string, any> {
    const paramName = isHighlightMode ? 'h_${field.tsName}' : '${field.tsName}';
    return { [paramName]: value };
  }
}
`;
}

export function genChartSourcesIndex(opts: GeneratorOptions, fields: ResolvedField[]): string {
  const chartable = chartableFields(fields);
  return chartable
    .map(f => `export * from './${kebab(f.tsName)}-chart-source';`)
    .join('\n') + '\n';
}

// ============================================================================
// Cache Key Builder
// ============================================================================

export function genCacheKeyBuilder(opts: GeneratorOptions, fields: ResolvedField[]): string {
  const Domain = pascalCase(opts.domain);
  const ClassName = `${Domain}CacheKeyBuilder`;
  const filterable = filterFields(fields);

  const fieldList = filterable.map(f => `      '${f.tsName}'`).join(',\n');

  return `/**
 * ${Domain} Cache Key Builder
 *
 * Generated from Elasticsearch index mapping.
 * Builds deterministic cache keys from filter state.
 */

import { ICacheKeyBuilder } from '../../../lib/config';
import { ${Domain}Filters } from '../models/${kebab(opts.domain)}.filters';

export class ${ClassName} implements ICacheKeyBuilder<${Domain}Filters> {

  buildKey(filters: ${Domain}Filters, highlights?: any): string {
    const filterFields = [
${fieldList},
      'page',
      'size',
      'sort',
      'sortDirection'
    ];

    const entries = filterFields
      .map(field => {
        const value = (filters as any)[field];
        if (value === null || value === undefined || value === '') return null;
        return \`\${field}=\${this.serializeValue(value)}\`;
      })
      .filter(Boolean);

    let key = \`${opts.domain}:\${entries.join('&')}\`;

    if (highlights && typeof highlights === 'object') {
      const hEntries = Object.entries(highlights)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => \`\${k}=\${this.serializeValue(v)}\`);
      if (hEntries.length > 0) {
        key += \`|h:\${hEntries.join('&')}\`;
      }
    }

    return key;
  }

  private serializeValue(value: any): string {
    if (Array.isArray(value)) return value.sort().join(',');
    return String(value);
  }
}
`;
}

export function genAdaptersIndex(opts: GeneratorOptions): string {
  return `export * from './${kebab(opts.domain)}-cache-key-builder';\n`;
}

// ============================================================================
// Domain Config (factory + provider)
// ============================================================================

export function genDomainConfig(opts: GeneratorOptions, fields: ResolvedField[]): string {
  const Domain = pascalCase(opts.domain);
  const DOMAIN = opts.domain.toUpperCase().replace(/-/g, '_');
  const d = kebab(opts.domain);
  const chartable = chartableFields(fields);
  const kw = keywordFields(fields);

  const chartSourceImports = chartable
    .map(f => `  ${pascalCase(f.tsName)}ChartDataSource`)
    .join(',\n');

  const chartSourceMap = chartable
    .map(f => `    '${f.tsName}': new ${pascalCase(f.tsName)}ChartDataSource()`)
    .join(',\n');

  const highlightable = kw.length > 0;

  return `/**
 * ${Domain} Domain Configuration
 *
 * Generated from Elasticsearch index mapping.
 * Factory function + Angular DI provider.
 *
 * Review:
 * - Adjust feature flags
 * - Customize data/statistics transformers if API response differs
 * - Add picker configs if needed
 */

import { Injector, Provider } from '@angular/core';
import { DomainConfig, DOMAIN_CONFIG, GenericUrlMapper, GenericApiAdapter, generateTableConfig, generateTableFilterDefinitions } from '../../lib/config';
import { ApiService } from '../../lib/state-management';
import { environment } from '../../../environments/environment';
import { ${Domain}Filters, ${Domain}Result, ${Domain}Statistics } from './models';
import { ${Domain}CacheKeyBuilder } from './adapters';
import { ${DOMAIN}_QUERY_CONTROL_FILTERS, ${DOMAIN}_HIGHLIGHT_FILTERS, ${DOMAIN}_CHART_CONFIGS } from './configs';
import { ${DOMAIN}_RESOURCE } from './${d}.resource';
import {
${chartSourceImports}
} from './chart-sources';

export function create${Domain}DomainConfig(injector: Injector): DomainConfig<
  ${Domain}Filters,
  ${Domain}Result,
  ${Domain}Statistics
> {
  const apiService = injector.get(ApiService);
  const apiBaseUrl = environment.apiBaseUrl;

  return {
    domainName: '${opts.domain}',
    domainLabel: '${opts.label}',
    apiBaseUrl,
    filterModel: ${Domain}Filters,
    dataModel: ${Domain}Result,
    statisticsModel: ${Domain}Statistics,

    apiAdapter: new GenericApiAdapter<${Domain}Filters, ${Domain}Result, ${Domain}Statistics>(
      apiService,
      ${DOMAIN}_RESOURCE,
      {
        baseUrl: apiBaseUrl,
        dataTransformer: ${Domain}Result.fromApiResponse,
        statisticsTransformer: ${Domain}Statistics.fromApiResponse
      }
    ),
    urlMapper: new GenericUrlMapper<${Domain}Filters>(${DOMAIN}_RESOURCE),
    cacheKeyBuilder: new ${Domain}CacheKeyBuilder(),

    tableConfig: generateTableConfig<${Domain}Result>(${DOMAIN}_RESOURCE),
    pickers: [],  // TODO: Add picker configs if needed
    filters: generateTableFilterDefinitions(${DOMAIN}_RESOURCE),
    queryControlFilters: ${DOMAIN}_QUERY_CONTROL_FILTERS,
    highlightFilters: ${DOMAIN}_HIGHLIGHT_FILTERS,
    charts: ${DOMAIN}_CHART_CONFIGS,
    chartDataSources: {
${chartSourceMap}
    },

    features: {
      highlights: ${highlightable},
      popOuts: true,
      rowExpansion: false,
      statistics: true,
      export: true,
      columnManagement: true,
      statePersistence: true
    },

    metadata: {
      version: '1.0.0',
      description: '${opts.label}',
      createdAt: '${new Date().toISOString().split('T')[0]}'
    }
  };
}

export const DOMAIN_PROVIDER: Provider = {
  provide: DOMAIN_CONFIG,
  useFactory: create${Domain}DomainConfig,
  deps: [Injector]
};
`;
}

// ============================================================================
// Configs Index
// ============================================================================

export function genConfigsIndex(opts: GeneratorOptions): string {
  const d = kebab(opts.domain);
  return `export * from './${d}.query-control-filters';
export * from './${d}.highlight-filters';
export * from './${d}.chart-configs';
`;
}

// ============================================================================
// Root Index
// ============================================================================

export function genRootIndex(opts: GeneratorOptions): string {
  return `export * from './${kebab(opts.domain)}.domain-config';
`;
}
