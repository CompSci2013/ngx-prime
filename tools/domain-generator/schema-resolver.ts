/**
 * Resolves an Elasticsearch index mapping into a flat list of ResolvedFields.
 *
 * Handles:
 * - Nested objects (flattened with dot notation → camelCase)
 * - text+keyword multi-fields
 * - Type-based heuristics for filterable/sortable/aggregable
 */

import { ESFieldMapping, ResolvedField } from './types';

/** Fields that are typically internal/metadata and shouldn't be user-facing */
const INTERNAL_FIELD_PATTERNS = [
  /^metadata\.ingest/i,
  /^metadata\.last_updated/i,
  /^metadata\.source$/i,
  /^metadata\.source_id$/i,
  /^_/,
];

/**
 * Convert a dot-path ES field name to camelCase TypeScript name.
 * "location.state_province" → "locationStateProvince"
 */
export function toCamelCase(dotPath: string): string {
  return dotPath
    .split('.')
    .map((segment, i) => {
      const parts = segment.split('_');
      return parts
        .map((part, j) => {
          if (i === 0 && j === 0) return part.toLowerCase();
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join('');
    })
    .join('');
}

/**
 * Convert a dot-path ES field name to a human-readable label.
 * "location.state_province" → "State Province"
 * "manufacturer" → "Manufacturer"
 */
export function toLabel(dotPath: string): string {
  // Use the last segment for the label (skip parent object names)
  const lastSegment = dotPath.split('.').pop() || dotPath;
  return lastSegment
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Determine ResourceField type from ES type.
 */
function toResourceFieldType(esType: string, hasKeywordSubfield: boolean): ResolvedField['resourceFieldType'] {
  switch (esType) {
    case 'keyword': return 'string';
    case 'text': return hasKeywordSubfield ? 'string' : 'string';
    case 'integer':
    case 'long':
    case 'float':
    case 'double': return 'number';
    case 'date': return 'date';
    case 'boolean': return 'boolean';
    default: return 'string';
  }
}

/**
 * Determine filter type from ES type.
 */
function inferFilterType(esType: string, hasKeywordSubfield: boolean): ResolvedField['filterType'] {
  switch (esType) {
    case 'keyword': return 'multiselect';
    case 'text': return hasKeywordSubfield ? 'multiselect' : 'autocomplete';
    case 'integer':
    case 'long':
    case 'float':
    case 'double': return 'range';
    case 'date': return 'daterange';
    case 'boolean': return 'boolean';
    default: return null;
  }
}

/**
 * Check if a field is likely internal/metadata.
 */
function isInternalField(dotPath: string): boolean {
  return INTERNAL_FIELD_PATTERNS.some(pattern => pattern.test(dotPath));
}

/**
 * Recursively flatten an ES mapping into resolved fields.
 */
export function resolveMapping(
  properties: Record<string, ESFieldMapping>,
  parentPath: string = '',
  excludeFields: string[] = []
): ResolvedField[] {
  const fields: ResolvedField[] = [];

  for (const [fieldName, mapping] of Object.entries(properties)) {
    const dotPath = parentPath ? `${parentPath}.${fieldName}` : fieldName;

    // Skip excluded fields
    if (excludeFields.includes(dotPath) || excludeFields.includes(fieldName)) {
      continue;
    }

    // Nested object — recurse
    if (mapping.properties && !mapping.type) {
      fields.push(...resolveMapping(mapping.properties, dotPath, excludeFields));
      continue;
    }

    // Object type with no subproperties — skip
    if (mapping.type === 'object' && !mapping.properties) {
      continue;
    }

    // Object type with subproperties — recurse
    if (mapping.type === 'object' && mapping.properties) {
      fields.push(...resolveMapping(mapping.properties, dotPath, excludeFields));
      continue;
    }

    // Skip geo_point (not useful in table/filter UI)
    if (mapping.type === 'geo_point') {
      continue;
    }

    const esType = (mapping.type || 'text') as ResolvedField['esType'];
    const hasKeywordSubfield = !!(mapping.fields && mapping.fields['keyword']);
    const isInternal = isInternalField(dotPath);
    const isNumeric = ['integer', 'long', 'float', 'double'].includes(esType);
    const isKeyword = esType === 'keyword' || hasKeywordSubfield;

    fields.push({
      esPath: dotPath,
      tsName: toCamelCase(dotPath),
      label: toLabel(dotPath),
      esType,
      hasKeywordSubfield,
      filterable: !isInternal && esType !== 'geo_point',
      filterType: isInternal ? null : inferFilterType(esType, hasKeywordSubfield),
      visible: !isInternal,
      sortable: !isInternal && (isKeyword || isNumeric || esType === 'date'),
      aggregable: !isInternal && (isKeyword || isNumeric),
      highlightable: !isInternal && isKeyword,
      resourceFieldType: toResourceFieldType(esType, hasKeywordSubfield),
    });
  }

  return fields;
}
