/**
 * Filter Definition Interface
 *
 * Defines the structure for filterable fields in the Query Control component.
 * This is domain-agnostic and works with any domain configuration.
 */

/**
 * Configuration for range-type filters
 *
 * Supports integer, decimal, and datetime ranges with flexible formatting.
 *
 * @interface RangeConfig
 *
 * @property {('integer'|'decimal'|'datetime')} valueType - The type of values in the range.
 *           - 'integer': Whole numbers (years, counts, etc.)
 *           - 'decimal': Floating point numbers (prices, measurements, etc.)
 *           - 'datetime': Date/time values (ISO 8601 format)
 *
 * @property {string} minLabel - Label for the minimum value input (e.g., "Start Year", "Min Price")
 *
 * @property {string} maxLabel - Label for the maximum value input (e.g., "End Year", "Max Price")
 *
 * @property {string} [minPlaceholder] - Optional placeholder text for min input (e.g., "e.g., 1980")
 *
 * @property {string} [maxPlaceholder] - Optional placeholder text for max input (e.g., "e.g., 2023")
 *
 * @property {number} [step] - Step increment for numeric inputs (default: 1 for integer, 0.01 for decimal)
 *
 * @property {number} [decimalPlaces] - Number of decimal places for 'decimal' type (default: 2)
 *
 * @property {boolean} [useGrouping] - Whether to use thousand separators (default: false)
 *
 * @property {Object} [defaultRange] - Default min/max values when API doesn't provide them
 *
 * @example
 * ```typescript
 * // Year range (integer)
 * rangeConfig: {
 *   valueType: 'integer',
 *   minLabel: 'Start Year',
 *   maxLabel: 'End Year',
 *   minPlaceholder: 'e.g., 1980',
 *   maxPlaceholder: 'e.g., 2023',
 *   step: 1,
 *   defaultRange: { min: 1900, max: new Date().getFullYear() }
 * }
 *
 * // Price range (decimal)
 * rangeConfig: {
 *   valueType: 'decimal',
 *   minLabel: 'Min Price',
 *   maxLabel: 'Max Price',
 *   minPlaceholder: 'e.g., 0.00',
 *   maxPlaceholder: 'e.g., 100000.00',
 *   step: 0.01,
 *   decimalPlaces: 2,
 *   useGrouping: true,
 *   defaultRange: { min: 0, max: 1000000 }
 * }
 * ```
 */
export interface RangeConfig {
  /**
   * The type of values in the range
   */
  valueType: 'integer' | 'decimal' | 'datetime';

  /**
   * Label for the minimum value input
   */
  minLabel: string;

  /**
   * Label for the maximum value input
   */
  maxLabel: string;

  /**
   * Optional placeholder text for min input
   */
  minPlaceholder?: string;

  /**
   * Optional placeholder text for max input
   */
  maxPlaceholder?: string;

  /**
   * Step increment for numeric inputs (default: 1 for integer, 0.01 for decimal)
   */
  step?: number;

  /**
   * Number of decimal places for 'decimal' type (default: 2)
   */
  decimalPlaces?: number;

  /**
   * Whether to use thousand separators (default: false)
   */
  useGrouping?: boolean;

  /**
   * Default min/max values when API doesn't provide them
   */
  defaultRange?: { min: number; max: number };
}

/**
 * Defines a filterable field in the domain
 *
 * @interface FilterDefinition
 * @template T - The filter model type that contains these fields
 *
 * @property {keyof T} field - Unique field identifier matching a property in the filter model (T).
 *
 * @property {string} label - Display label for the filter field shown in the Query Control component.
 *
 * @property {('multiselect'|'range'|'text'|'date')} type - Filter type determines the UI component rendered.
 *
 * @property {string} [optionsEndpoint] - Optional API endpoint URL for fetching multiselect filter options.
 *
 * @property {Function} [optionsTransformer] - Optional transformer function to convert API response to FilterOption[].
 *
 * @property {(string|{min:string, max:string})} urlParams - URL parameter name(s) for state synchronization.
 *
 * @property {string} [searchPlaceholder] - Optional placeholder text displayed in the search box.
 *
 * @property {string} [dialogSubtitle] - Optional subtitle text shown in the filter dialog/modal.
 *
 * @property {string} [dialogTitle] - Optional title for the filter dialog (default: "Select {label}")
 *
 * @property {RangeConfig} [rangeConfig] - Required configuration for type='range' filters.
 *
 * @remarks
 * **Usage in Domain Config**:
 * FilterDefinition is used in DomainConfig.filters array to define all available filters for a domain.
 * Each filter is rendered by QueryControlComponent with appropriate UI based on the type.
 *
 * **Example**:
 * ```typescript
 * const manufacturerFilter: FilterDefinition<AutoSearchFilters> = {
 *   field: 'manufacturer',
 *   label: 'Manufacturer',
 *   type: 'multiselect',
 *   optionsEndpoint: '/agg/manufacturers',
 *   urlParams: 'manufacturer',
 *   searchPlaceholder: 'Search manufacturers...'
 * };
 * ```
 */
export interface FilterDefinition<T = any> {
  /**
   * Unique field identifier matching a property in the filter model
   */
  field: keyof T;

  /**
   * Display label for the filter field shown in the Query Control component
   */
  label: string;

  /**
   * Filter type determines the UI component rendered
   */
  type: 'multiselect' | 'range' | 'text' | 'date';

  /**
   * Optional API endpoint URL for fetching multiselect filter options
   */
  optionsEndpoint?: string;

  /**
   * Optional transformer function to convert API response to FilterOption[]
   */
  optionsTransformer?: (response: any) => FilterOption[];

  /**
   * URL parameter name(s) for state synchronization
   */
  urlParams: string | { min: string; max: string };

  /**
   * Optional placeholder text displayed in the search box
   */
  searchPlaceholder?: string;

  /**
   * Optional subtitle text shown in the filter dialog/modal
   */
  dialogSubtitle?: string;

  /**
   * Optional title for the filter dialog (default: "Select {label}")
   */
  dialogTitle?: string;

  /**
   * Configuration for type='range' filters
   * Required when type is 'range'
   */
  rangeConfig?: RangeConfig;
}

/**
 * Option for multiselect filters
 *
 * @interface FilterOption
 *
 * @property {(string|number)} value - The actual value for this option. Used as the data value when selected.
 *
 * @property {string} label - Display text shown to the user in the multiselect dropdown.
 *
 * @property {number} [count] - Optional count of items matching this option value.
 *
 * @remarks
 * **Usage**:
 * FilterOption arrays are returned from API endpoints specified in FilterDefinition.optionsEndpoint
 * and rendered as options in multiselect dropdown filters by the QueryControlComponent.
 *
 * **Example Response**:
 * ```typescript
 * // API endpoint returns aggregation of field values with counts
 * {
 *   field: "manufacturer",
 *   values: [
 *     { value: "Toyota", label: "Toyota", count: 150 },
 *     { value: "Honda", label: "Honda", count: 120 },
 *     { value: "BMW", label: "BMW", count: 89 }
 *   ]
 * }
 * ```
 */
export interface FilterOption {
  /**
   * The actual value for this option. Used as the data value when selected
   */
  value: string | number;

  /**
   * Display text shown to the user in the multiselect dropdown
   */
  label: string;

  /**
   * Optional count of items matching this option value
   */
  count?: number;
}
