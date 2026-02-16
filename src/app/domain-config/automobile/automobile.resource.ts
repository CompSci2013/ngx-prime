/**
 * Automobile Resource Definition
 *
 * The unified source of truth for the automobile domain.
 * This ResourceDefinition replaces the need for separate:
 * - automobile-url-mapper.ts (toUrlParams/fromUrlParams)
 * - automobile.table-config.ts (column definitions)
 * - automobile.filter-definitions.ts (filter UI controls)
 * - automobile-api.adapter.ts (filtersToApiParams)
 *
 * See docs/audit/refactor.md for the simplification roadmap.
 *
 * @example
 * ```typescript
 * // Generate URL mapper
 * const urlMapper = new GenericUrlMapper(AUTOMOBILE_RESOURCE);
 *
 * // Generate table config
 * const tableConfig = generateTableConfig(AUTOMOBILE_RESOURCE);
 *
 * // Generate filter definitions
 * const filterDefs = generateFilterDefinitions(AUTOMOBILE_RESOURCE);
 * ```
 */

import { ResourceDefinition, ResourceField } from '../../framework/models/resource-definition.interface';

/**
 * Automobile Resource Fields
 *
 * Each field definition drives:
 * - URL parameter parsing/serialization
 * - API parameter mapping
 * - Table column generation
 * - Filter control generation
 */

// ============================================
// Search Filter Fields
// ============================================

const manufacturerField: ResourceField = {
  name: 'manufacturer',
  label: 'Manufacturer',
  type: 'string',
  filterable: true,
  sortable: true,
  visible: true,
  highlightable: true,
  placeholder: 'Enter manufacturer name...',
  filterType: 'autocomplete',
  autocompleteEndpoint: 'filters/manufacturers',
  width: '150px',
  dataType: 'text'
};

const modelField: ResourceField = {
  name: 'model',
  label: 'Model',
  type: 'string',
  filterable: true,
  sortable: true,
  visible: true,
  placeholder: 'Type to search models...',
  filterType: 'autocomplete',
  autocompleteEndpoint: 'filters/models',
  width: '150px',
  dataType: 'text'
};

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

const yearMaxField: ResourceField = {
  name: 'yearMax',
  label: 'Year (Max)',
  type: 'number',
  filterable: true,
  highlightable: true,
  rangeField: 'year',
  rangeRole: 'max',
  min: 1900,
  max: new Date().getFullYear() + 1
};

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

const instanceCountMinField: ResourceField = {
  name: 'instanceCountMin',
  label: 'VIN Count (Min)',
  type: 'number',
  filterable: true,
  rangeField: 'instanceCount',
  rangeRole: 'min',
  min: 0
};

const instanceCountMaxField: ResourceField = {
  name: 'instanceCountMax',
  label: 'VIN Count (Max)',
  type: 'number',
  filterable: true,
  rangeField: 'instanceCount',
  rangeRole: 'max',
  min: 0
};

const searchField: ResourceField = {
  name: 'search',
  label: 'Search',
  type: 'string',
  filterable: true,
  placeholder: 'Search manufacturer, model, or body class...',
  filterType: 'text',
  maxLength: 200
};

/**
 * Model Combos Field
 *
 * Complex field from the picker component.
 * Format: "Ford:F-150,Toyota:Camry,Honda:Accord"
 *
 * Requires custom parsing/serialization due to the complex format.
 */
const modelCombosField: ResourceField = {
  name: 'modelCombos',
  label: 'Selected Models',
  type: 'string',
  filterable: true,
  highlightable: true,
  // Custom strategies for complex parsing
  customUrlParser: (value: string) => value, // Pass through as-is
  customUrlSerializer: (value: any) => String(value),
  customApiMapper: (value: any) => {
    // Parse "Ford:F-150,Toyota:Camry" into structured format for API
    // For now, pass through as-is - API handles the format
    return { modelCombos: value };
  }
};

// ============================================
// Pagination Fields
// ============================================

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

// ============================================
// Sort Fields
// ============================================

const sortField: ResourceField = {
  name: 'sort',
  label: 'Sort Field',
  type: 'string',
  urlParam: 'sortBy',  // URL uses 'sortBy'
  apiParam: 'sort'     // API uses 'sort'
};

const sortDirectionField: ResourceField = {
  name: 'sortDirection',
  label: 'Sort Direction',
  type: 'string',
  urlParam: 'sortOrder',  // URL uses 'sortOrder'
  apiParam: 'sortDirection'
};

// ============================================
// Table Display Fields (not filters)
// ============================================

const vehicleIdField: ResourceField = {
  name: 'vehicle_id',
  label: 'Vehicle ID',
  type: 'string',
  visible: false,  // Hidden but used as dataKey
  dataType: 'text'
};

const yearField: ResourceField = {
  name: 'year',
  label: 'Year',
  type: 'number',
  sortable: true,
  visible: true,
  width: '100px',
  dataType: 'numeric'
};

const instanceCountField: ResourceField = {
  name: 'instance_count',
  label: 'VIN Count',
  type: 'number',
  sortable: true,
  visible: true,
  width: '100px',
  dataType: 'numeric'
};

// ============================================
// Resource Definition
// ============================================

/**
 * Automobile Resource Definition
 *
 * The single source of truth for the automobile domain.
 * All mappers, adapters, and configs can be generated from this definition.
 */
export const AUTOMOBILE_RESOURCE: ResourceDefinition = {
  name: 'automobile',
  label: 'Automobile Discovery',

  /**
   * All fields in the domain
   *
   * Order matters for filter UI display (filterable fields shown in order)
   */
  fields: [
    // Search filters
    manufacturerField,
    modelField,
    yearMinField,
    yearMaxField,
    bodyClassField,
    instanceCountMinField,
    instanceCountMaxField,
    searchField,
    modelCombosField,

    // Pagination
    pageField,
    sizeField,

    // Sorting
    sortField,
    sortDirectionField,

    // Table display (not URL filters but needed for table generation)
    vehicleIdField,
    yearField,
    instanceCountField
  ],

  /**
   * API Endpoints
   * NOTE: These are relative to apiBaseUrl from environment
   */
  endpoints: {
    search: '/vehicles/details',
    stats: '/statistics'
  },

  /**
   * Pagination Configuration
   */
  pagination: {
    defaultSize: 10,
    sizeOptions: [10, 20, 50, 100],
    pageParam: 'page',
    sizeParam: 'size',
    zeroIndexed: false
  },

  /**
   * Sorting Configuration
   */
  sorting: {
    defaultField: 'manufacturer',
    defaultDirection: 'asc',
    sortFieldParam: 'sortBy',
    sortDirectionParam: 'sortOrder'
  },

  /**
   * Highlight Configuration
   */
  highlights: {
    prefix: 'h_',
    valueSeparator: ',',
    normalizePipes: true
  },

  /**
   * Data Key for Table
   */
  dataKey: 'vehicle_id'
};

// ============================================
// Convenience Exports
// ============================================

/**
 * Get all filter fields (for query panel)
 */
export function getAutomobileFilterFields(): ResourceField[] {
  return AUTOMOBILE_RESOURCE.fields.filter(f => f.filterable);
}

/**
 * Get all table column fields
 */
export function getAutomobileTableFields(): ResourceField[] {
  return AUTOMOBILE_RESOURCE.fields.filter(f => f.visible);
}

/**
 * Get all highlightable fields
 */
export function getAutomobileHighlightFields(): ResourceField[] {
  return AUTOMOBILE_RESOURCE.fields.filter(f => f.highlightable);
}

/**
 * Get range field groups (year, instanceCount)
 */
export function getAutomobileRangeGroups(): Map<string, { min?: ResourceField; max?: ResourceField }> {
  const rangeGroups = new Map<string, { min?: ResourceField; max?: ResourceField }>();

  for (const field of AUTOMOBILE_RESOURCE.fields) {
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
