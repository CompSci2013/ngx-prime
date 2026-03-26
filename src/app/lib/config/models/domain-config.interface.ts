import { Type } from '@angular/core';
import { IApiAdapter, IFilterUrlMapper, ICacheKeyBuilder } from '../../state-management/models/resource-management.interface';
import { TableConfig } from './table-config.interface';
import { PickerConfig } from './picker-config.interface';
import type { FilterDefinition } from './filter-definition.interface';

/**
 * Domain configuration interface
 *
 * Complete configuration schema for a domain-specific implementation.
 * Defines all adapters, UI configurations, and feature flags required
 * for the framework to operate with domain-specific data.
 *
 * @template TFilters - Domain-specific filter model type
 * @template TData - Domain-specific data model type
 * @template TStatistics - Domain-specific statistics model type (optional)
 *
 * @example
 * ```typescript
 * const AUTOMOBILE_DOMAIN_CONFIG: DomainConfig<
 *   AutoSearchFilters,
 *   VehicleResult,
 *   VehicleStatistics
 * > = {
 *   domainName: 'automobile',
 *   domainLabel: 'Automobile Discovery',
 *   apiBaseUrl: 'http://auto-discovery.minilab/api/v1',
 *   filterModel: AutoSearchFilters,
 *   dataModel: VehicleResult,
 *   statisticsModel: VehicleStatistics,
 *   apiAdapter: new AutomobileApiAdapter(),
 *   urlMapper: new AutomobileUrlMapper(),
 *   cacheKeyBuilder: new DefaultCacheKeyBuilder(),
 *   tableConfig: AUTOMOBILE_TABLE_CONFIG,
 *   pickers: AUTOMOBILE_PICKER_CONFIGS,
 *   filters: AUTOMOBILE_FILTER_DEFINITIONS,
 *   queryControlFilters: AUTOMOBILE_QUERY_CONTROL_FILTERS,
 *   charts: AUTOMOBILE_CHART_CONFIGS,
 *   features: {
 *     highlights: true,
 *     popOuts: true,
 *     rowExpansion: true
 *   }
 * };
 * ```
 */
export interface DomainConfig<TFilters, TData, TStatistics = any> {
  /**
   * Unique domain identifier (lowercase, no spaces)
   * Used for routing, storage keys, and internal identification
   *
   * @example 'automobile', 'agriculture', 'real-estate'
   */
  domainName: string;

  /**
   * Human-readable domain label
   * Used for display in UI (page titles, navigation, etc.)
   *
   * @example 'Automobile Discovery', 'Agricultural Data', 'Real Estate Listings'
   */
  domainLabel: string;

  /**
   * Base URL for domain-specific API
   * All API requests will be prefixed with this URL
   *
   * @example 'http://auto-discovery.minilab/api/v1'
   */
  apiBaseUrl: string;

  /**
   * Filter model class/constructor
   * Used for type checking and instantiation
   */
  filterModel: Type<TFilters>;

  /**
   * Data model class/constructor
   * Used for type checking and instantiation
   */
  dataModel: Type<TData>;

  /**
   * Statistics model class/constructor (optional)
   * Used for type checking and instantiation
   */
  statisticsModel?: Type<TStatistics>;

  /**
   * API adapter for data fetching
   * Implements domain-specific API calls and response transformation
   */
  apiAdapter: IApiAdapter<TFilters, TData, TStatistics>;

  /**
   * URL mapper for filter serialization
   * Converts between filter objects and URL parameters
   */
  urlMapper: IFilterUrlMapper<TFilters>;

  /**
   * Cache key builder for request coordination
   * Generates unique cache keys from filter objects
   */
  cacheKeyBuilder: ICacheKeyBuilder<TFilters>;

  /**
   * Table configuration for main data display
   * Defines columns, pagination, sorting, etc.
   */
  tableConfig: TableConfig<TData>;

  /**
   * Picker configurations
   * Array of picker configs for multi-select data pickers
   */
  pickers: PickerConfig<any>[];

  /**
   * Inline filter definitions for results table
   * Defines inline filter controls displayed above the results table
   */
  filters: TableFilterDefinition[];

  /**
   * Query Control filter definitions
   * Defines filters available in the Query Control component dialogs
   */
  queryControlFilters: FilterDefinition<TFilters>[];

  /**
   * Highlight filter definitions (optional)
   * Defines highlight filters available in the Query Control component
   * These filters add h_* URL parameters for segmented statistics in charts
   *
   * @example
   * ```typescript
   * highlightFilters: [
   *   { field: 'manufacturer', label: 'Highlight Manufacturer', type: 'multiselect', urlParams: 'h_manufacturer', ... },
   *   { field: 'yearMin', label: 'Highlight Year', type: 'range', urlParams: { min: 'h_yearMin', max: 'h_yearMax' }, ... }
   * ]
   * ```
   */
  highlightFilters?: FilterDefinition<any>[];

  /**
   * Chart configurations
   * Defines available charts and their data sources
   */
  charts: ChartConfig[];

  /**
   * Chart data sources map
   * Maps dataSourceId to ChartDataSource instances
   * Used by StatisticsPanelComponent to instantiate charts
   *
   * @example
   * ```typescript
   * chartDataSources: {
   *   'manufacturer': new ManufacturerChartDataSource(),
   *   'top-models': new TopModelsChartDataSource()
   * }
   * ```
   */
  chartDataSources?: Record<string, any>;

  /**
   * Feature flags
   * Controls which framework features are enabled for this domain
   */
  features: DomainFeatures;

  /**
   * Optional metadata
   * Additional domain-specific information
   */
  metadata?: DomainMetadata;

  /**
   * Default filters for the domain (optional)
   * These filters are applied when the application first loads or when filters are cleared.
   */
  defaultFilters?: Partial<TFilters>;
}

/**
 * Domain feature flags
 *
 * Controls which framework features are enabled/disabled for a specific domain
 */
export interface DomainFeatures {
  /**
   * Enable/disable highlight system
   * Allows users to highlight specific data subsets
   */
  highlights: boolean;

  /**
   * Enable/disable pop-out window system
   * Allows panels to be moved to separate browser windows
   */
  popOuts: boolean;

  /**
   * Enable/disable row expansion in tables
   * Allows rows to be expanded to show additional details
   */
  rowExpansion: boolean;

  /**
   * Enable/disable statistics panel
   * Shows aggregated statistics and charts
   */
  statistics?: boolean;

  /**
   * Enable/disable export functionality
   * Allows users to export data to CSV, Excel, etc.
   */
  export?: boolean;

  /**
   * Enable/disable column management
   * Allows users to show/hide and reorder columns
   */
  columnManagement?: boolean;

  /**
   * Enable/disable state persistence
   * Saves user preferences to local storage
   */
  statePersistence?: boolean;
}

/**
 * Domain metadata
 *
 * Additional information about the domain
 */
export interface DomainMetadata {
  /**
   * Domain version (semantic versioning)
   */
  version?: string;

  /**
   * Domain description
   */
  description?: string;

  /**
   * Domain author/maintainer
   */
  author?: string;

  /**
   * Creation date
   */
  createdAt?: string;

  /**
   * Last update date
   */
  updatedAt?: string;

  /**
   * Custom metadata fields
   */
  [key: string]: any;
}

/**
 * Filter format configuration
 *
 * Controls how filter values are displayed and processed.
 * Allows domain-specific customization of filter behavior on a per-filter basis.
 *
 * @example
 * ```typescript
 * // Year filter without thousand separators
 * format: {
 *   number: { useGrouping: false }
 * }
 *
 * // Case-insensitive text matching
 * format: {
 *   caseSensitive: false,
 *   transform: 'lowercase'
 * }
 *
 * // Custom date format
 * format: {
 *   date: { pattern: 'MM/DD/YYYY' }
 * }
 * ```
 */
export interface FilterFormat {
  /**
   * Number formatting options
   * Controls decimal places, thousand separators, etc.
   */
  number?: FilterNumberFormat;

  /**
   * Date formatting options
   * Controls date display pattern
   */
  date?: FilterDateFormat;

  /**
   * Whether string matching is case-sensitive
   * @default true
   */
  caseSensitive?: boolean;

  /**
   * Text transformation to apply before sending to API
   * Applied to filter values before URL/API submission
   */
  transform?: 'lowercase' | 'uppercase' | 'titlecase' | 'trim' | 'none';

  /**
   * Custom formatting function
   * Takes raw value and returns formatted value for display
   *
   * @param value - Raw filter value
   * @returns Formatted value for display
   */
  displayFormatter?: (value: any) => string;

  /**
   * Custom parsing function
   * Takes user input and returns parsed value for storage/API
   *
   * @param input - User input string
   * @returns Parsed value
   */
  valueParser?: (input: string) => any;
}

/**
 * Number formatting options
 *
 * Based on Intl.NumberFormat options for consistency with browser standards
 *
 * @example
 * ```typescript
 * // Year: no commas, no decimals
 * { useGrouping: false, minimumFractionDigits: 0, maximumFractionDigits: 0 }
 *
 * // Currency: 2 decimals, with commas
 * { useGrouping: true, minimumFractionDigits: 2, maximumFractionDigits: 2 }
 *
 * // VIN count: commas, no decimals
 * { useGrouping: true, minimumFractionDigits: 0, maximumFractionDigits: 0 }
 * ```
 */
export interface FilterNumberFormat {
  /**
   * Use thousand separators (commas)
   * @default true (browser default)
   */
  useGrouping?: boolean;

  /**
   * Minimum decimal places
   * @default 0
   */
  minimumFractionDigits?: number;

  /**
   * Maximum decimal places
   * @default 0 for integers, 2 for decimals
   */
  maximumFractionDigits?: number;

  /**
   * Locale for number formatting
   * @default 'en-US'
   */
  locale?: string;

  /**
   * Custom format pattern (alternative to Intl options)
   * Examples: '#,##0', '#,##0.00', '0000' (zero-padded)
   */
  pattern?: string;
}

/**
 * Date formatting options
 *
 * @example
 * ```typescript
 * // US format
 * { pattern: 'MM/DD/YYYY', locale: 'en-US' }
 *
 * // ISO format
 * { pattern: 'YYYY-MM-DD' }
 *
 * // European format
 * { pattern: 'DD.MM.YYYY', locale: 'de-DE' }
 * ```
 */
export interface FilterDateFormat {
  /**
   * Date format pattern
   * Supports common tokens: YYYY, MM, DD, HH, mm, ss
   * @default 'YYYY-MM-DD'
   */
  pattern?: string;

  /**
   * Locale for date formatting
   * @default 'en-US'
   */
  locale?: string;

  /**
   * Whether to show time component
   * @default false
   */
  includeTime?: boolean;
}

/**
 * Filter definition interface
 *
 * Defines a single filter control in the query UI
 *
 * @example
 * ```typescript
 * // Basic text filter
 * const MANUFACTURER_FILTER: FilterDefinition = {
 *   id: 'manufacturer',
 *   label: 'Manufacturer',
 *   type: 'text',
 *   placeholder: 'Enter manufacturer name...',
 *   operators: ['equals', 'contains', 'startsWith']
 * };
 *
 * // Year range filter without thousand separators
 * const YEAR_FILTER: FilterDefinition = {
 *   id: 'yearRange',
 *   label: 'Year Range',
 *   type: 'range',
 *   min: 1900,
 *   max: 2025,
 *   format: {
 *     number: { useGrouping: false }
 *   }
 * };
 *
 * // Case-insensitive body class filter
 * const BODY_CLASS_FILTER: FilterDefinition = {
 *   id: 'bodyClass',
 *   label: 'Body Class',
 *   type: 'select',
 *   format: {
 *     caseSensitive: false,
 *     transform: 'titlecase'
 *   },
 *   options: [
 *     { value: 'Sedan', label: 'Sedan' },
 *     { value: 'SUV', label: 'SUV' }
 *   ]
 * };
 * ```
 */
export interface TableFilterDefinition {
  /**
   * Unique filter identifier
   */
  id: string;

  /**
   * Display label
   */
  label: string;

  /**
   * Filter control type
   */
  type: TableFilterType;

  /**
   * Placeholder text for input controls
   */
  placeholder?: string;

  /**
   * Available filter operators
   */
  operators?: TableFilterOperator[];

  /**
   * Default operator
   */
  defaultOperator?: TableFilterOperator;

  /**
   * Options for select/multiselect controls
   * Use this for static options that don't change
   */
  options?: TableFilterOption[];

  /**
   * API endpoint for loading options dynamically
   * The endpoint should return: { field: string, values: Array<{value: string, count: number}> }
   *
   * @example
   * optionsEndpoint: 'body_class'
   * // Fetches from: {apiBaseUrl}/agg/body_class
   * // Response: { field: "body_class", values: [{value: "Sedan", count: 100}, ...] }
   */
  optionsEndpoint?: string;

  /**
   * API endpoint for autocomplete search
   * Used with type: 'autocomplete' for progressive refinement search
   * The endpoint should accept ?search= and ?limit= query parameters
   *
   * @example
   * autocompleteEndpoint: 'filters/models'
   * // Fetches from: {apiBaseUrl}/filters/models?search=cam&limit=10
   * // Response: { models: ["Camaro", "Camry", "Canyon", ...] }
   */
  autocompleteEndpoint?: string;

  /**
   * Minimum characters required before autocomplete triggers
   * @default 2
   */
  autocompleteMinChars?: number;

  /**
   * Minimum value (for numeric/date filters)
   */
  min?: number | string;

  /**
   * Maximum value (for numeric/date filters)
   */
  max?: number | string;

  /**
   * Step value (for numeric filters)
   */
  step?: number;

  /**
   * Whether filter is required
   */
  required?: boolean;

  /**
   * Whether filter is disabled
   */
  disabled?: boolean;

  /**
   * Format configuration
   * Controls how filter values are displayed and processed.
   * Allows per-filter customization of display and matching behavior.
   *
   * @example
   * ```typescript
   * // Year without commas
   * format: { number: { useGrouping: false } }
   *
   * // Case-insensitive matching
   * format: { caseSensitive: false, transform: 'titlecase' }
   * ```
   */
  format?: FilterFormat;

  /**
   * Validation rules
   */
  validation?: FilterValidation;
}

/**
 * Filter control types
 */
export type TableFilterType =
  | 'text'
  | 'number'
  | 'date'
  | 'daterange'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'range'
  | 'autocomplete';

/**
 * Filter operators
 */
export type TableFilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'in'
  | 'notIn'
  | 'between';

/**
 * Filter option for select/multiselect
 */
export interface TableFilterOption {
  /**
   * Option value
   */
  value: any;

  /**
   * Display label
   */
  label: string;

  /**
   * Optional icon
   */
  icon?: string;

  /**
   * Whether option is disabled
   */
  disabled?: boolean;
}

/**
 * Filter validation rules
 */
export interface FilterValidation {
  /**
   * Minimum length (for text)
   */
  minLength?: number;

  /**
   * Maximum length (for text)
   */
  maxLength?: number;

  /**
   * Regular expression pattern
   */
  pattern?: RegExp | string;

  /**
   * Custom validation function
   */
  custom?: (value: any) => boolean | string;
}

/**
 * Chart configuration interface
 *
 * Defines a chart component and its data source
 *
 * @example
 * ```typescript
 * const MANUFACTURER_CHART: ChartConfig = {
 *   id: 'manufacturer-distribution',
 *   title: 'Vehicles by Manufacturer',
 *   type: 'bar',
 *   dataSourceId: 'manufacturer-stats',
 *   options: {
 *     responsive: true,
 *     maintainAspectRatio: false
 *   }
 * };
 * ```
 */
export interface ChartConfig {
  /**
   * Unique chart identifier
   */
  id: string;

  /**
   * Chart title
   */
  title: string;

  /**
   * Chart type
   */
  type: ChartType;

  /**
   * Data source identifier
   * References a data transformation function
   */
  dataSourceId: string;

  /**
   * Chart-specific options
   * Passed to the charting library (Plotly, Chart.js, etc.)
   */
  options?: any;

  /**
   * Chart height in pixels
   */
  height?: number;

  /**
   * Chart width in pixels or percentage
   */
  width?: number | string;

  /**
   * Whether chart is visible by default
   */
  visible?: boolean;

  /**
   * Whether chart is collapsible
   */
  collapsible?: boolean;
}

/**
 * Chart types
 */
export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'doughnut'
  | 'scatter'
  | 'histogram'
  | 'heatmap'
  | 'treemap'
  | 'sunburst';

/**
 * Configuration validation error
 */
export interface ConfigValidationError {
  /**
   * Error type
   */
  type: ConfigErrorType;

  /**
   * Field that failed validation
   */
  field: string;

  /**
   * Error message
   */
  message: string;

  /**
   * Expected value or type
   */
  expected?: string;

  /**
   * Actual value received
   */
  actual?: any;
}

/**
 * Configuration error types
 */
export enum ConfigErrorType {
  MISSING_REQUIRED = 'MISSING_REQUIRED',
  INVALID_TYPE = 'INVALID_TYPE',
  INVALID_VALUE = 'INVALID_VALUE',
  EMPTY_ARRAY = 'EMPTY_ARRAY',
  DUPLICATE_ID = 'DUPLICATE_ID'
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  /**
   * Whether configuration is valid
   */
  valid: boolean;

  /**
   * Validation errors (if any)
   */
  errors: ConfigValidationError[];

  /**
   * Validation warnings (non-critical issues)
   */
  warnings?: ConfigValidationError[];
}

/**
 * Default domain features
 * Used when features object is not fully specified
 */
export const DEFAULT_DOMAIN_FEATURES: DomainFeatures = {
  highlights: true,
  popOuts: true,
  rowExpansion: true,
  statistics: true,
  export: true,
  columnManagement: true,
  statePersistence: true
};

/**
 * Merge partial domain features with defaults
 *
 * @param features - Partial feature configuration
 * @returns Complete feature configuration
 */
export function mergeDomainFeatures(
  features: Partial<DomainFeatures>
): DomainFeatures {
  return {
    ...DEFAULT_DOMAIN_FEATURES,
    ...features
  };
}
