/**
 * Config Generators
 *
 * Utility functions to generate TableConfig and TableFilterDefinitions
 * from a ResourceDefinition. This eliminates the need for manual
 * config files like automobile.table-config.ts and automobile.filter-definitions.ts.
 *
 * See docs/audit/refactor.md for the simplification roadmap.
 *
 * @example
 * ```typescript
 * import { AUTOMOBILE_RESOURCE } from '../domain-config/automobile/automobile.resource';
 *
 * // Generate table config
 * const tableConfig = generateTableConfig(AUTOMOBILE_RESOURCE, VehicleResult);
 *
 * // Generate filter definitions
 * const filterDefs = generateTableFilterDefinitions(AUTOMOBILE_RESOURCE);
 * ```
 */

import {
  ResourceDefinition,
  ResourceField,
  getVisibleFields,
  getFilterableFields,
  groupRangeFields
} from '../models/resource-definition.interface';
import {
  TableConfig,
  PrimeNGColumn,
  getDefaultTableConfig
} from '../models/table-config.interface';
import {
  TableFilterDefinition,
  TableFilterType
} from '../models/domain-config.interface';

/**
 * Generate TableConfig from ResourceDefinition
 *
 * Creates a complete TableConfig by extracting visible fields and
 * converting them to PrimeNG column definitions.
 *
 * @param definition - ResourceDefinition to generate from
 * @param options - Optional overrides for table settings
 * @returns Complete TableConfig
 *
 * @example
 * ```typescript
 * const tableConfig = generateTableConfig(AUTOMOBILE_RESOURCE, {
 *   tableId: 'custom-table-id',
 *   rows: 25
 * });
 * ```
 */
export function generateTableConfig<T>(
  definition: ResourceDefinition,
  options?: Partial<TableConfig<T>>
): TableConfig<T> {
  // Get visible fields for columns
  const visibleFields = getVisibleFields(definition);

  // Convert ResourceFields to PrimeNG columns
  const columns: PrimeNGColumn<T>[] = visibleFields.map(field => ({
    field: field.name as keyof T,
    header: field.label,
    sortable: field.sortable ?? false,
    filterable: field.filterable ?? false,
    filterMatchMode: getFilterMatchMode(field),
    reorderable: true,
    width: field.width,
    dataType: field.dataType
  }));

  // Build base config
  const baseConfig: TableConfig<T> = {
    tableId: `${definition.name}-table`,
    stateKey: `${definition.name}-state`,
    dataKey: (definition.dataKey ?? 'id') as keyof T,
    columns,
    expandable: false,
    selectable: false,
    paginator: true,
    rows: definition.pagination?.defaultSize ?? 20,
    rowsPerPageOptions: definition.pagination?.sizeOptions ?? [10, 20, 50, 100],
    lazy: true,
    stateStorage: 'local',
    styleClass: 'p-datatable-striped p-datatable-gridlines',
    responsiveLayout: 'scroll',
    gridlines: true,
    stripedRows: true,
    loading: false
  };

  // Apply overrides
  return {
    ...baseConfig,
    ...options
  };
}

/**
 * Get PrimeNG filter match mode from field type
 */
function getFilterMatchMode(field: ResourceField): 'startsWith' | 'contains' | 'equals' {
  switch (field.type) {
    case 'number':
      return 'equals';
    case 'boolean':
      return 'equals';
    case 'date':
      return 'equals';
    default:
      return 'contains';
  }
}

/**
 * Generate TableFilterDefinitions from ResourceDefinition
 *
 * Creates an array of TableFilterDefinition objects for the query panel
 * by extracting filterable fields and converting them to UI controls.
 *
 * Range fields (yearMin/yearMax) are automatically grouped into
 * a single range control.
 *
 * @param definition - ResourceDefinition to generate from
 * @returns Array of TableFilterDefinitions for query panel
 *
 * @example
 * ```typescript
 * const filterDefs = generateTableFilterDefinitions(AUTOMOBILE_RESOURCE);
 * // Returns: [
 * //   { id: 'manufacturer', label: 'Manufacturer', type: 'autocomplete', ... },
 * //   { id: 'year', label: 'Year Range', type: 'range', ... },
 * //   ...
 * // ]
 * ```
 */
export function generateTableFilterDefinitions(
  definition: ResourceDefinition
): TableFilterDefinition[] {
  const filterDefs: TableFilterDefinition[] = [];
  const processedRangeFields = new Set<string>();

  // Get range field groups
  const rangeGroups = groupRangeFields(definition);

  // Process filterable fields
  for (const field of getFilterableFields(definition)) {
    // Skip fields that are part of a range group (handled separately)
    if (field.rangeField) {
      if (processedRangeFields.has(field.rangeField)) {
        continue; // Already processed this range
      }

      // Process the range group
      const rangeGroup = rangeGroups.get(field.rangeField);
      if (rangeGroup) {
        filterDefs.push(generateRangeFilterDef(field.rangeField, rangeGroup));
        processedRangeFields.add(field.rangeField);
      }
      continue;
    }

    // Regular field
    filterDefs.push(generateFieldFilterDef(field));
  }

  return filterDefs;
}

/**
 * Generate TableFilterDefinition for a regular (non-range) field
 */
function generateFieldFilterDef(field: ResourceField): TableFilterDefinition {
  const filterType = getTableFilterType(field);

  const def: TableFilterDefinition = {
    id: field.name,
    label: field.label,
    type: filterType,
    placeholder: field.placeholder
  };

  // Add type-specific properties
  switch (filterType) {
    case 'autocomplete':
      def.autocompleteEndpoint = field.autocompleteEndpoint;
      def.autocompleteMinChars = 1;
      def.operators = ['contains', 'equals', 'startsWith'];
      def.defaultOperator = 'contains';
      break;

    case 'multiselect':
      def.optionsEndpoint = field.optionsEndpoint;
      def.options = field.options;
      break;

    case 'select':
      def.options = field.options;
      break;

    case 'text':
      def.operators = ['contains'];
      def.defaultOperator = 'contains';
      if (field.maxLength) {
        def.validation = { maxLength: field.maxLength };
      }
      break;

    case 'number':
      if (field.min !== undefined) def.min = field.min;
      if (field.max !== undefined) def.max = field.max;
      break;
  }

  return def;
}

/**
 * Generate TableFilterDefinition for a range field group (min/max pair)
 */
function generateRangeFilterDef(
  rangeFieldName: string,
  group: { min?: ResourceField; max?: ResourceField }
): TableFilterDefinition {
  const minField = group.min;
  const maxField = group.max;

  // Use label from first available field, or generate from name
  const label = minField?.label?.replace(' (Min)', '').replace('Min', '').trim()
    || maxField?.label?.replace(' (Max)', '').replace('Max', '').trim()
    || toTitleCase(rangeFieldName);

  const def: TableFilterDefinition = {
    id: rangeFieldName,
    label: `${label} Range`,
    type: 'range'
  };

  // Set min/max bounds
  if (minField?.min !== undefined) def.min = minField.min;
  if (maxField?.max !== undefined) def.max = maxField.max;
  if (minField?.max !== undefined && def.max === undefined) def.max = minField.max;

  // For year fields, disable thousand separators
  if (rangeFieldName.toLowerCase().includes('year')) {
    def.format = {
      number: {
        useGrouping: false,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }
    };
    def.step = 1;
  }

  return def;
}

/**
 * Convert ResourceField type to TableFilterType
 */
function getTableFilterType(field: ResourceField): TableFilterType {
  // Use explicit filterType if provided
  if (field.filterType) {
    return field.filterType;
  }

  // Infer from field properties
  if (field.autocompleteEndpoint) {
    return 'autocomplete';
  }

  if (field.optionsEndpoint || (field.options && field.options.length > 0)) {
    return field.type === 'array' ? 'multiselect' : 'select';
  }

  // Infer from field type
  switch (field.type) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'date';
    case 'array':
      return 'multiselect';
    default:
      return 'text';
  }
}

/**
 * Convert string to Title Case
 */
function toTitleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1') // Add space before capitals
    .replace(/^./, s => s.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Generate highlight filter definitions from ResourceDefinition
 *
 * Creates TableFilterDefinitions for fields marked as highlightable.
 * These are used in the Query Control component for h_* URL parameters.
 *
 * @param definition - ResourceDefinition to generate from
 * @returns Array of TableFilterDefinitions for highlight controls
 */
export function generateHighlightTableFilterDefinitions(
  definition: ResourceDefinition
): TableFilterDefinition[] {
  const highlightDefs: TableFilterDefinition[] = [];
  const processedRangeFields = new Set<string>();
  const rangeGroups = groupRangeFields(definition);

  for (const field of definition.fields) {
    if (!field.highlightable) continue;

    // Handle range fields
    if (field.rangeField) {
      if (processedRangeFields.has(field.rangeField)) continue;

      const rangeGroup = rangeGroups.get(field.rangeField);
      if (rangeGroup && (rangeGroup.min?.highlightable || rangeGroup.max?.highlightable)) {
        const rangeDef = generateRangeFilterDef(field.rangeField, rangeGroup);
        rangeDef.id = `h_${field.rangeField}`;
        rangeDef.label = `Highlight ${rangeDef.label.replace(' Range', '')}`;
        highlightDefs.push(rangeDef);
        processedRangeFields.add(field.rangeField);
      }
      continue;
    }

    // Regular highlightable field
    const fieldDef = generateFieldFilterDef(field);
    fieldDef.id = `h_${field.name}`;
    fieldDef.label = `Highlight ${field.label}`;
    highlightDefs.push(fieldDef);
  }

  return highlightDefs;
}

/**
 * Validate generated config matches expected structure
 *
 * Utility for testing that generated configs match legacy manual configs.
 *
 * @param generated - Generated config
 * @param expected - Expected config
 * @returns Validation result with differences
 */
export function validateConfigParity<T>(
  generated: T,
  expected: T
): { match: boolean; differences: string[] } {
  const differences: string[] = [];

  function compare(genVal: any, expVal: any, path: string): void {
    if (typeof genVal !== typeof expVal) {
      differences.push(`${path}: type mismatch (${typeof genVal} vs ${typeof expVal})`);
      return;
    }

    if (Array.isArray(genVal) && Array.isArray(expVal)) {
      if (genVal.length !== expVal.length) {
        differences.push(`${path}: array length mismatch (${genVal.length} vs ${expVal.length})`);
      }
      const minLen = Math.min(genVal.length, expVal.length);
      for (let i = 0; i < minLen; i++) {
        compare(genVal[i], expVal[i], `${path}[${i}]`);
      }
      return;
    }

    if (typeof genVal === 'object' && genVal !== null) {
      const allKeys = new Set([...Object.keys(genVal), ...Object.keys(expVal)]);
      for (const key of allKeys) {
        compare(genVal[key], expVal[key], `${path}.${key}`);
      }
      return;
    }

    if (genVal !== expVal) {
      differences.push(`${path}: value mismatch (${genVal} vs ${expVal})`);
    }
  }

  compare(generated, expected, 'root');

  return {
    match: differences.length === 0,
    differences
  };
}
