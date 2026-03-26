/**
 * Generic URL Mapper
 *
 * A configuration-driven URL mapper that reads from a ResourceDefinition
 * to convert between filter objects and URL query parameters.
 *
 * This replaces domain-specific URL mappers like AutomobileUrlMapper,
 * reducing boilerplate by ~70% as documented in docs/audit/refactor.md.
 *
 * @example
 * ```typescript
 * const mapper = new GenericUrlMapper(AUTOMOBILE_RESOURCE);
 *
 * // To URL params
 * const params = mapper.toUrlParams({ manufacturer: 'Ford', yearMin: 2020 });
 * // { manufacturer: 'Ford', yearMin: '2020' }
 *
 * // From URL params
 * const filters = mapper.fromUrlParams({ manufacturer: 'Ford', yearMin: '2020' });
 * // { manufacturer: 'Ford', yearMin: 2020 }
 * ```
 */

import { Params } from '@angular/router';
import { IFilterUrlMapper } from '../../state-management/models/resource-management.interface';
import {
  ResourceDefinition,
  ResourceField,
  getUrlParamName,
  findFieldByUrlParam,
  DEFAULT_HIGHLIGHTS
} from '../models/resource-definition.interface';

/**
 * Generic URL Mapper
 *
 * Implements IFilterUrlMapper using a ResourceDefinition as the configuration source.
 * Automatically handles:
 * - Type coercion (string → number, string → boolean, string → array)
 * - URL parameter name mapping (field.name → field.urlParam)
 * - Custom parsing/serialization via escape hatches
 * - Highlight parameter extraction (h_* prefix)
 *
 * NOTE: Not @Injectable() - instantiate directly with a ResourceDefinition.
 *
 * @template TFilters - The filter object type
 */
export class GenericUrlMapper<TFilters extends Record<string, any>> implements IFilterUrlMapper<TFilters> {
  private readonly definition: ResourceDefinition;
  private readonly fieldsByUrlParam: Map<string, ResourceField>;
  private readonly highlightPrefix: string;
  private readonly highlightSeparator: string;
  private readonly normalizePipes: boolean;

  constructor(definition: ResourceDefinition) {
    this.definition = definition;
    this.fieldsByUrlParam = this.buildUrlParamMap();

    // Highlight configuration with defaults
    const highlights = definition.highlights ?? DEFAULT_HIGHLIGHTS;
    this.highlightPrefix = highlights.prefix;
    this.highlightSeparator = highlights.valueSeparator;
    this.normalizePipes = highlights.normalizePipes ?? true;
  }

  /**
   * Build a map of URL param name → ResourceField for fast lookup
   */
  private buildUrlParamMap(): Map<string, ResourceField> {
    const map = new Map<string, ResourceField>();
    for (const field of this.definition.fields) {
      const urlParam = getUrlParamName(field);
      map.set(urlParam, field);
    }
    return map;
  }

  /**
   * Convert filter object to URL query parameters
   *
   * @param filters - Filter object
   * @returns URL query parameters (all values as strings)
   */
  toUrlParams(filters: TFilters): Params {
    const params: Params = {};

    for (const field of this.definition.fields) {
      const value = filters[field.name as keyof TFilters];

      // Skip undefined/null values
      if (value === undefined || value === null) {
        continue;
      }

      const urlParam = getUrlParamName(field);

      // Use custom serializer if provided
      if (field.customUrlSerializer) {
        const serialized = field.customUrlSerializer(value);
        if (serialized !== undefined && serialized !== null && serialized !== '') {
          params[urlParam] = serialized;
        }
        continue;
      }

      // Type-specific serialization
      const serialized = this.serializeValue(value, field);
      if (serialized !== undefined && serialized !== null && serialized !== '') {
        params[urlParam] = serialized;
      }
    }

    return params;
  }

  /**
   * Convert URL query parameters to filter object
   *
   * @param params - URL query parameters
   * @returns Filter object with proper types
   */
  fromUrlParams(params: Params): TFilters {
    const filters: Record<string, any> = {};

    for (const [urlParam, rawValue] of Object.entries(params)) {
      // Skip highlight params (handled separately)
      if (urlParam.startsWith(this.highlightPrefix)) {
        continue;
      }

      // Find the field definition for this URL param
      const field = this.fieldsByUrlParam.get(urlParam);
      if (!field) {
        // Unknown param - skip (don't break on unknown params)
        continue;
      }

      // Skip empty values
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        continue;
      }

      // Use custom parser if provided
      if (field.customUrlParser) {
        const parsed = field.customUrlParser(String(rawValue));
        if (parsed !== undefined && parsed !== null) {
          filters[field.name] = parsed;
        }
        continue;
      }

      // Type-specific parsing
      const parsed = this.parseValue(String(rawValue), field);
      if (parsed !== undefined && parsed !== null) {
        filters[field.name] = parsed;
      }
    }

    return filters as TFilters;
  }

  /**
   * Extract highlight filters from URL parameters
   *
   * Looks for parameters with the highlight prefix (default: 'h_')
   * and returns them as a separate object.
   *
   * @param params - URL query parameters
   * @returns Highlight filters object
   */
  extractHighlights(params: Params): Record<string, any> {
    const highlights: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (key.startsWith(this.highlightPrefix)) {
        const highlightKey = key.substring(this.highlightPrefix.length);
        let processedValue = value;

        // Normalize pipe separators to commas if configured
        if (this.normalizePipes && typeof processedValue === 'string' && processedValue.includes('|')) {
          processedValue = processedValue.replace(/\|/g, this.highlightSeparator);
        }

        highlights[highlightKey] = processedValue;
      }
    }

    return highlights;
  }

  /**
   * Serialize a value to URL parameter string
   */
  private serializeValue(value: any, field: ResourceField): string | undefined {
    switch (field.type) {
      case 'string':
        return String(value);

      case 'number':
        return String(value);

      case 'boolean':
        return value ? 'true' : 'false';

      case 'date':
        if (value instanceof Date) {
          return value.toISOString().split('T')[0]; // YYYY-MM-DD
        }
        return String(value);

      case 'array':
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return undefined;
          }
          return value.join(',');
        }
        // Single value - return as-is
        return String(value);

      case 'select':
        return String(value);

      default:
        return String(value);
    }
  }

  /**
   * Parse a URL parameter string to typed value
   */
  private parseValue(rawValue: string, field: ResourceField): any {
    switch (field.type) {
      case 'string':
        return rawValue;

      case 'number':
        return this.parseNumber(rawValue);

      case 'boolean':
        return rawValue.toLowerCase() === 'true';

      case 'date':
        // Validate date format
        const date = new Date(rawValue);
        if (isNaN(date.getTime())) {
          return undefined; // Invalid date
        }
        return rawValue; // Keep as string for API compatibility

      case 'array':
        // Split comma-separated values
        if (rawValue.includes(',')) {
          return rawValue.split(',').map(v => v.trim());
        }
        // Single value - return as array for consistency
        return [rawValue];

      case 'select':
        return rawValue;

      default:
        return rawValue;
    }
  }

  /**
   * Parse number from URL parameter value
   * Returns null for invalid numbers (matches AutomobileUrlMapper behavior)
   */
  private parseNumber(value: string): number | null {
    if (value === '') {
      return null;
    }
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  /**
   * Get parameter name mapping (for debugging/documentation)
   */
  getParameterMapping(): Record<string, string> {
    const mapping: Record<string, string> = {};
    for (const field of this.definition.fields) {
      mapping[field.name] = getUrlParamName(field);
    }
    return mapping;
  }

  /**
   * Get URL parameter name for a filter field
   */
  getUrlParamName(filterField: string): string | undefined {
    const field = this.definition.fields.find(f => f.name === filterField);
    return field ? getUrlParamName(field) : undefined;
  }

  /**
   * Build a shareable URL from filters
   */
  buildShareableUrl(baseUrl: string, filters: TFilters): string {
    const params = this.toUrlParams(filters);
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Validate URL parameters
   *
   * @param params - URL query parameters
   * @returns Validation result with errors
   */
  validateUrlParams(params: Params): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [urlParam, rawValue] of Object.entries(params)) {
      // Skip highlight params
      if (urlParam.startsWith(this.highlightPrefix)) {
        continue;
      }

      const field = this.fieldsByUrlParam.get(urlParam);
      if (!field) {
        // Unknown param - not an error (matches AutomobileUrlMapper)
        continue;
      }

      // Validate numeric fields
      if (field.type === 'number' && rawValue !== undefined && rawValue !== null && rawValue !== '') {
        const parsed = this.parseNumber(String(rawValue));
        if (parsed === null) {
          errors.push(`Invalid numeric value for ${urlParam}: ${rawValue}`);
        }
      }
    }

    // Validate ranges (min <= max)
    this.validateRanges(params, errors);

    // Validate sort direction
    const sortDirParam = this.definition.sorting?.sortDirectionParam ?? 'sortOrder';
    if (params[sortDirParam]) {
      const direction = String(params[sortDirParam]);
      if (direction !== 'asc' && direction !== 'desc') {
        errors.push(`Invalid sort direction: ${direction}. Must be 'asc' or 'desc'.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate that min values don't exceed max values
   */
  private validateRanges(params: Params, errors: string[]): void {
    // Group fields by rangeField
    const rangeGroups = new Map<string, { min?: ResourceField; max?: ResourceField }>();

    for (const field of this.definition.fields) {
      if (field.rangeField && field.rangeRole) {
        if (!rangeGroups.has(field.rangeField)) {
          rangeGroups.set(field.rangeField, {});
        }
        const group = rangeGroups.get(field.rangeField)!;
        group[field.rangeRole] = field;
      }
    }

    // Validate each range group
    for (const [rangeName, group] of rangeGroups) {
      if (group.min && group.max) {
        const minParam = getUrlParamName(group.min);
        const maxParam = getUrlParamName(group.max);

        if (params[minParam] && params[maxParam]) {
          const min = this.parseNumber(String(params[minParam]));
          const max = this.parseNumber(String(params[maxParam]));

          if (min !== null && max !== null && min > max) {
            errors.push(`${rangeName} minimum (${min}) cannot be greater than maximum (${max})`);
          }
        }
      }
    }
  }

  /**
   * Sanitize URL parameters
   *
   * Removes invalid parameters and corrects invalid values.
   *
   * @param params - URL query parameters
   * @returns Sanitized parameters
   */
  sanitizeUrlParams(params: Params): Params {
    const sanitized: Params = {};

    for (const [urlParam, rawValue] of Object.entries(params)) {
      // Keep highlight params as-is
      if (urlParam.startsWith(this.highlightPrefix)) {
        sanitized[urlParam] = rawValue;
        continue;
      }

      const field = this.fieldsByUrlParam.get(urlParam);
      if (!field) {
        // Unknown param - skip
        continue;
      }

      // Validate and sanitize numeric fields
      if (field.type === 'number' && rawValue !== undefined && rawValue !== null && rawValue !== '') {
        const parsed = this.parseNumber(String(rawValue));
        if (parsed === null) {
          // Invalid numeric - skip
          continue;
        }
      }

      // Validate sort direction
      const sortDirParam = this.definition.sorting?.sortDirectionParam ?? 'sortOrder';
      if (urlParam === sortDirParam) {
        const direction = String(rawValue);
        if (direction !== 'asc' && direction !== 'desc') {
          continue; // Invalid sort direction - skip
        }
      }

      sanitized[urlParam] = rawValue;
    }

    return sanitized;
  }
}

/**
 * Factory function to create a GenericUrlMapper
 *
 * @param definition - ResourceDefinition to use
 * @returns Configured GenericUrlMapper instance
 */
export function createUrlMapper<TFilters extends Record<string, any>>(
  definition: ResourceDefinition
): GenericUrlMapper<TFilters> {
  return new GenericUrlMapper<TFilters>(definition);
}
