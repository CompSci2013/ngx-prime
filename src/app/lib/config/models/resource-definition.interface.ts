/**
 * Resource Definition Interface
 *
 * The unified schema for defining domain resources. A ResourceDefinition serves
 * as the single source of truth for a field's metadata, enabling automatic
 * generation of:
 * - URL mappers (toUrlParams/fromUrlParams)
 * - API adapters (filtersToApiParams)
 * - Table configurations (columns, sorting)
 * - Filter definitions (UI controls)
 *
 * This is part of the "Convention over Configuration" refactoring effort
 * documented in docs/audit/refactor.md.
 *
 * @example
 * ```typescript
 * const AUTOMOBILE_RESOURCE: ResourceDefinition = {
 *   name: 'automobile',
 *   label: 'Automobile Discovery',
 *   fields: [
 *     {
 *       name: 'manufacturer',
 *       label: 'Manufacturer',
 *       type: 'string',
 *       filterable: true,
 *       sortable: true,
 *       visible: true
 *     },
 *     {
 *       name: 'yearMin',
 *       label: 'Year (Min)',
 *       type: 'number',
 *       filterable: true,
 *       rangeField: 'year',
 *       rangeRole: 'min'
 *     }
 *   ],
 *   endpoints: {
 *     search: '/api/specs/v1/vehicles',
 *     stats: '/api/specs/v1/vehicles/details'
 *   },
 *   pagination: {
 *     defaultSize: 10,
 *     sizeOptions: [10, 20, 50, 100]
 *   }
 * };
 * ```
 */

/**
 * Field type for ResourceField
 *
 * Determines how the field is parsed from URLs and serialized to API calls.
 */
export type ResourceFieldType =
  | 'string'    // Plain text, passed as-is
  | 'number'    // Parsed as number, validated for numeric content
  | 'boolean'   // Parsed as boolean ('true'/'false')
  | 'date'      // Parsed as ISO date string
  | 'array'     // Comma-separated values in URL, array in filter object
  | 'select';   // Single value from predefined options

/**
 * Resource Field Definition
 *
 * Defines a single field in a resource. This metadata drives automatic
 * generation of URL mappers, API adapters, table columns, and filter controls.
 *
 * @example
 * ```typescript
 * // Simple string field
 * const manufacturerField: ResourceField = {
 *   name: 'manufacturer',
 *   label: 'Manufacturer',
 *   type: 'string',
 *   filterable: true,
 *   sortable: true,
 *   visible: true
 * };
 *
 * // Numeric range field (min)
 * const yearMinField: ResourceField = {
 *   name: 'yearMin',
 *   label: 'Year (Min)',
 *   type: 'number',
 *   filterable: true,
 *   rangeField: 'year',
 *   rangeRole: 'min'
 * };
 *
 * // Field with custom URL/API mapping
 * const sortField: ResourceField = {
 *   name: 'sort',
 *   label: 'Sort Field',
 *   type: 'string',
 *   urlParam: 'sortBy',
 *   apiParam: 'sort'
 * };
 * ```
 */
export interface ResourceField {
  /**
   * Property name in the filter object
   * Must match the property name in the TFilters type
   *
   * @example 'manufacturer', 'yearMin', 'bodyClass'
   */
  name: string;

  /**
   * Human-readable display label
   * Used in table headers, filter labels, etc.
   *
   * @example 'Manufacturer', 'Model Year', 'Body Class'
   */
  label: string;

  /**
   * Data type of the field
   * Determines parsing/serialization behavior
   */
  type: ResourceFieldType;

  // ========================================
  // Capability Flags
  // ========================================

  /**
   * Whether this field can be used as a filter
   * If true, generates FilterDefinition entry
   * @default false
   */
  filterable?: boolean;

  /**
   * Whether this field supports sorting
   * If true, adds sort capability to table column
   * @default false
   */
  sortable?: boolean;

  /**
   * Whether this field is visible as a table column by default
   * @default false
   */
  visible?: boolean;

  /**
   * Whether this field supports highlighting (h_* URL params)
   * @default false
   */
  highlightable?: boolean;

  // ========================================
  // Parameter Name Overrides
  // ========================================

  /**
   * URL parameter name (defaults to field name)
   * Use when URL param differs from property name
   *
   * @example
   * name: 'sort', urlParam: 'sortBy'
   * // Filter: { sort: 'year' } → URL: ?sortBy=year
   */
  urlParam?: string;

  /**
   * API parameter name (defaults to field name)
   * Use when API param differs from property name
   *
   * @example
   * name: 'sort', apiParam: 'orderBy'
   * // Filter: { sort: 'year' } → API: ?orderBy=year
   */
  apiParam?: string;

  // ========================================
  // Range Field Configuration
  // ========================================

  /**
   * For min/max fields: the base field name they belong to
   * Used to group yearMin/yearMax into a 'year' range control
   *
   * @example
   * name: 'yearMin', rangeField: 'year', rangeRole: 'min'
   * name: 'yearMax', rangeField: 'year', rangeRole: 'max'
   */
  rangeField?: string;

  /**
   * Whether this is the min or max of a range
   */
  rangeRole?: 'min' | 'max';

  // ========================================
  // Validation
  // ========================================

  /**
   * Minimum value (for number/date types)
   */
  min?: number | string;

  /**
   * Maximum value (for number/date types)
   */
  max?: number | string;

  /**
   * Regular expression pattern for validation
   */
  pattern?: string;

  /**
   * Maximum length for string fields
   */
  maxLength?: number;

  // ========================================
  // UI Configuration
  // ========================================

  /**
   * Placeholder text for input controls
   */
  placeholder?: string;

  /**
   * Filter control type (overrides automatic detection from 'type')
   * Use when you need a specific UI control
   *
   * @example
   * type: 'string', filterType: 'autocomplete'
   * type: 'array', filterType: 'multiselect'
   */
  filterType?: 'text' | 'number' | 'select' | 'multiselect' | 'autocomplete' | 'range' | 'date' | 'daterange' | 'boolean';

  /**
   * API endpoint for autocomplete suggestions
   * @example 'filters/manufacturers'
   */
  autocompleteEndpoint?: string;

  /**
   * API endpoint for loading select/multiselect options
   * @example 'body_class'
   */
  optionsEndpoint?: string;

  /**
   * Static options for select/multiselect
   */
  options?: Array<{ value: any; label: string }>;

  /**
   * Column width for table display (CSS value)
   * @example '100px', '20%'
   */
  width?: string;

  /**
   * Data type hint for table column (affects sorting/filtering behavior)
   */
  dataType?: 'text' | 'numeric' | 'date' | 'boolean';

  // ========================================
  // Custom Strategies (Escape Hatches)
  // ========================================

  /**
   * Custom URL parser function
   * Called when parsing this field from URL params
   * Use for complex parsing logic that can't be expressed declaratively
   *
   * @param value - Raw URL parameter value (string)
   * @returns Parsed value for filter object
   *
   * @example
   * // Parse modelCombos: "Ford:F-150,Toyota:Camry" → structured data
   * customUrlParser: (value) => parseModelCombos(value)
   */
  customUrlParser?: (value: string) => any;

  /**
   * Custom URL serializer function
   * Called when serializing this field to URL params
   *
   * @param value - Filter object value
   * @returns URL parameter value (string)
   *
   * @example
   * customUrlSerializer: (value) => serializeModelCombos(value)
   */
  customUrlSerializer?: (value: any) => string;

  /**
   * Custom API mapper function
   * Called when converting this field for API requests
   * Can return multiple key-value pairs for complex mappings
   *
   * @param value - Filter object value
   * @returns Object with API parameter(s)
   *
   * @example
   * // Expand modelCombos into manufacturer and model arrays
   * customApiMapper: (value) => ({
   *   manufacturers: extractManufacturers(value),
   *   models: extractModels(value)
   * })
   */
  customApiMapper?: (value: any) => Record<string, any>;
}

/**
 * Pagination Configuration
 */
export interface ResourcePagination {
  /**
   * Default page size
   * @default 10
   */
  defaultSize: number;

  /**
   * Available page size options
   * @default [10, 20, 50, 100]
   */
  sizeOptions: number[];

  /**
   * URL parameter name for page number
   * @default 'page'
   */
  pageParam?: string;

  /**
   * URL parameter name for page size
   * @default 'size'
   */
  sizeParam?: string;

  /**
   * Whether pagination is 0-indexed or 1-indexed
   * @default false (1-indexed)
   */
  zeroIndexed?: boolean;
}

/**
 * Sorting Configuration
 */
export interface ResourceSorting {
  /**
   * Default sort field
   */
  defaultField?: string;

  /**
   * Default sort direction
   * @default 'asc'
   */
  defaultDirection?: 'asc' | 'desc';

  /**
   * URL parameter name for sort field
   * @default 'sortBy'
   */
  sortFieldParam?: string;

  /**
   * URL parameter name for sort direction
   * @default 'sortOrder'
   */
  sortDirectionParam?: string;
}

/**
 * API Endpoints Configuration
 */
export interface ResourceEndpoints {
  /**
   * Search/list endpoint (required)
   * @example '/api/specs/v1/vehicles'
   */
  search: string;

  /**
   * Statistics endpoint (optional)
   * @example '/api/specs/v1/vehicles/details'
   */
  stats?: string;

  /**
   * Single item endpoint (optional, with :id placeholder)
   * @example '/api/specs/v1/vehicles/:id'
   */
  single?: string;
}

/**
 * Highlight Configuration
 */
export interface ResourceHighlights {
  /**
   * URL parameter prefix for highlight params
   * @default 'h_'
   */
  prefix: string;

  /**
   * Separator for multiple highlight values
   * @default ','
   */
  valueSeparator: string;

  /**
   * Whether to normalize pipe (|) to comma (,) in highlight values
   * @default true
   */
  normalizePipes?: boolean;
}

/**
 * Resource Definition
 *
 * The master configuration schema for a domain resource.
 * Serves as the single source of truth for generating:
 * - URL mappers
 * - API adapters
 * - Table configurations
 * - Filter definitions
 *
 * @example
 * ```typescript
 * const AUTOMOBILE_RESOURCE: ResourceDefinition = {
 *   name: 'automobile',
 *   label: 'Automobile Discovery',
 *   fields: [...],
 *   endpoints: {
 *     search: '/api/specs/v1/vehicles',
 *     stats: '/api/specs/v1/vehicles/details'
 *   },
 *   pagination: {
 *     defaultSize: 10,
 *     sizeOptions: [10, 20, 50, 100]
 *   },
 *   sorting: {
 *     defaultField: 'manufacturer',
 *     defaultDirection: 'asc'
 *   }
 * };
 * ```
 */
export interface ResourceDefinition {
  /**
   * Unique resource identifier (lowercase, no spaces)
   * @example 'automobile', 'real-estate', 'agriculture'
   */
  name: string;

  /**
   * Human-readable resource label
   * @example 'Automobile Discovery', 'Real Estate Listings'
   */
  label: string;

  /**
   * Field definitions
   * Each field generates URL/API mappings, table columns, and filter controls
   */
  fields: ResourceField[];

  /**
   * API endpoints
   */
  endpoints: ResourceEndpoints;

  /**
   * Pagination configuration
   */
  pagination?: ResourcePagination;

  /**
   * Sorting configuration
   */
  sorting?: ResourceSorting;

  /**
   * Highlight configuration
   */
  highlights?: ResourceHighlights;

  /**
   * Unique identifier field for data records
   * Used for table dataKey, row tracking, etc.
   * @example 'id', 'vin'
   */
  dataKey?: string;
}

// ============================================
// Utility Types
// ============================================

/**
 * Extract filter field names from ResourceDefinition
 */
export type FilterableFields<T extends ResourceDefinition> =
  T['fields'][number] extends { filterable: true } ? T['fields'][number]['name'] : never;

/**
 * Extract sortable field names from ResourceDefinition
 */
export type SortableFields<T extends ResourceDefinition> =
  T['fields'][number] extends { sortable: true } ? T['fields'][number]['name'] : never;

/**
 * Extract visible (table column) field names from ResourceDefinition
 */
export type VisibleFields<T extends ResourceDefinition> =
  T['fields'][number] extends { visible: true } ? T['fields'][number]['name'] : never;

// ============================================
// Default Values
// ============================================

/**
 * Default pagination configuration
 */
export const DEFAULT_PAGINATION: ResourcePagination = {
  defaultSize: 10,
  sizeOptions: [10, 20, 50, 100],
  pageParam: 'page',
  sizeParam: 'size',
  zeroIndexed: false
};

/**
 * Default sorting configuration
 */
export const DEFAULT_SORTING: ResourceSorting = {
  defaultDirection: 'asc',
  sortFieldParam: 'sortBy',
  sortDirectionParam: 'sortOrder'
};

/**
 * Default highlight configuration
 */
export const DEFAULT_HIGHLIGHTS: ResourceHighlights = {
  prefix: 'h_',
  valueSeparator: ',',
  normalizePipes: true
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get all filterable fields from a ResourceDefinition
 */
export function getFilterableFields(definition: ResourceDefinition): ResourceField[] {
  return definition.fields.filter(f => f.filterable);
}

/**
 * Get all sortable fields from a ResourceDefinition
 */
export function getSortableFields(definition: ResourceDefinition): ResourceField[] {
  return definition.fields.filter(f => f.sortable);
}

/**
 * Get all visible (table column) fields from a ResourceDefinition
 */
export function getVisibleFields(definition: ResourceDefinition): ResourceField[] {
  return definition.fields.filter(f => f.visible);
}

/**
 * Get all highlightable fields from a ResourceDefinition
 */
export function getHighlightableFields(definition: ResourceDefinition): ResourceField[] {
  return definition.fields.filter(f => f.highlightable);
}

/**
 * Get the URL parameter name for a field
 */
export function getUrlParamName(field: ResourceField): string {
  return field.urlParam ?? field.name;
}

/**
 * Get the API parameter name for a field
 */
export function getApiParamName(field: ResourceField): string {
  return field.apiParam ?? field.name;
}

/**
 * Group range fields by their rangeField property
 * Returns a map of rangeField → { min?: ResourceField, max?: ResourceField }
 */
export function groupRangeFields(
  definition: ResourceDefinition
): Map<string, { min?: ResourceField; max?: ResourceField }> {
  const rangeGroups = new Map<string, { min?: ResourceField; max?: ResourceField }>();

  for (const field of definition.fields) {
    if (field.rangeField && field.rangeRole) {
      if (!rangeGroups.has(field.rangeField)) {
        rangeGroups.set(field.rangeField, {});
      }
      const group = rangeGroups.get(field.rangeField)!;
      group[field.rangeRole] = field;
    }
  }

  return rangeGroups;
}

/**
 * Find a field by name in a ResourceDefinition
 */
export function findField(definition: ResourceDefinition, name: string): ResourceField | undefined {
  return definition.fields.find(f => f.name === name);
}

/**
 * Find a field by URL parameter name in a ResourceDefinition
 */
export function findFieldByUrlParam(definition: ResourceDefinition, urlParam: string): ResourceField | undefined {
  return definition.fields.find(f => getUrlParamName(f) === urlParam);
}
