import { Injectable } from '@angular/core';
import {
  DomainConfig,
  ConfigValidationError,
  ConfigValidationResult,
  ConfigErrorType,
  mergeDomainFeatures
} from '../models/domain-config.interface';

/**
 * Domain configuration validator service
 *
 * Validates domain configurations to ensure they meet all requirements
 * before being used by the framework. Catches missing fields, invalid types,
 * and other configuration errors at runtime.
 *
 * @example
 * ```typescript
 * const validator = new DomainConfigValidator();
 * const result = validator.validate(AUTOMOBILE_DOMAIN_CONFIG);
 *
 * if (!result.valid) {
 *   console.error('Configuration errors:', result.errors);
 *   result.errors.forEach(error => {
 *     console.error(`${error.field}: ${error.message}`);
 *   });
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class DomainConfigValidator {
  /**
   * Constructor for dependency injection
   *
   * Service is stateless and relies on Angular's singleton scope.
   */
  constructor() {}

  /**
   * Validate domain configuration
   *
   * @param config - Domain configuration to validate
   * @returns Validation result with errors and warnings
   */
  validate<TFilters, TData, TStatistics>(
    config: DomainConfig<TFilters, TData, TStatistics>
  ): ConfigValidationResult {
    const errors: ConfigValidationError[] = [];
    const warnings: ConfigValidationError[] = [];

    // Validate required string fields
    this.validateRequiredString(config, 'domainName', errors);
    this.validateRequiredString(config, 'domainLabel', errors);
    this.validateRequiredString(config, 'apiBaseUrl', errors);

    // Validate domain name format
    this.validateDomainNameFormat(config.domainName, errors);

    // Validate API base URL format
    this.validateApiBaseUrl(config.apiBaseUrl, errors);

    // Validate type models
    this.validateRequiredField(config, 'filterModel', errors);
    this.validateRequiredField(config, 'dataModel', errors);

    // Validate adapters
    this.validateRequiredField(config, 'apiAdapter', errors);
    this.validateRequiredField(config, 'urlMapper', errors);
    this.validateRequiredField(config, 'cacheKeyBuilder', errors);

    // Validate adapter interfaces
    this.validateApiAdapter(config.apiAdapter, errors);
    this.validateUrlMapper(config.urlMapper, errors);
    this.validateCacheKeyBuilder(config.cacheKeyBuilder, errors);

    // Validate UI configuration
    this.validateRequiredField(config, 'tableConfig', errors);
    this.validateTableConfig(config.tableConfig, errors);

    // Validate arrays
    this.validateArray(config, 'pickers', errors, warnings);
    this.validateArray(config, 'filters', errors, warnings);
    this.validateArray(config, 'charts', errors, warnings);

    // Validate pickers
    if (config.pickers && config.pickers.length > 0) {
      this.validatePickers(config.pickers, errors);
    }

    // Validate filters
    if (config.filters && config.filters.length > 0) {
      this.validateFilters(config.filters, errors);
    }

    // Validate charts
    if (config.charts && config.charts.length > 0) {
      this.validateCharts(config.charts, errors);
    }

    // Validate features
    this.validateRequiredField(config, 'features', errors);
    this.validateFeatures(config.features, errors);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate and sanitize domain configuration
   *
   * Validates configuration and applies defaults for optional fields
   *
   * @param config - Domain configuration to validate
   * @returns Sanitized configuration or throws error if invalid
   * @throws Error if configuration is invalid
   */
  validateAndSanitize<TFilters, TData, TStatistics>(
    config: DomainConfig<TFilters, TData, TStatistics>
  ): DomainConfig<TFilters, TData, TStatistics> {
    const result = this.validate(config);

    if (!result.valid) {
      const errorMessages = result.errors
        .map((e) => `${e.field}: ${e.message}`)
        .join('\n');
      throw new Error(
        `Domain configuration validation failed:\n${errorMessages}`
      );
    }

    // Apply defaults
    return {
      ...config,
      features: mergeDomainFeatures(config.features),
      pickers: config.pickers || [],
      filters: config.filters || [],
      charts: config.charts || []
    };
  }

  /**
   * Validate required string field
   */
  private validateRequiredString(
    config: any,
    field: string,
    errors: ConfigValidationError[]
  ): void {
    if (!config[field]) {
      errors.push({
        type: ConfigErrorType.MISSING_REQUIRED,
        field,
        message: `Required field '${field}' is missing`,
        expected: 'string'
      });
    } else if (typeof config[field] !== 'string') {
      errors.push({
        type: ConfigErrorType.INVALID_TYPE,
        field,
        message: `Field '${field}' must be a string`,
        expected: 'string',
        actual: typeof config[field]
      });
    } else if (config[field].trim().length === 0) {
      errors.push({
        type: ConfigErrorType.INVALID_VALUE,
        field,
        message: `Field '${field}' cannot be empty`,
        expected: 'non-empty string',
        actual: config[field]
      });
    }
  }

  /**
   * Validate required field exists
   */
  private validateRequiredField(
    config: any,
    field: string,
    errors: ConfigValidationError[]
  ): void {
    if (!config[field]) {
      errors.push({
        type: ConfigErrorType.MISSING_REQUIRED,
        field,
        message: `Required field '${field}' is missing`
      });
    }
  }

  /**
   * Validate domain name format
   */
  private validateDomainNameFormat(
    domainName: string,
    errors: ConfigValidationError[]
  ): void {
    if (!domainName) return;

    // Domain name should be lowercase, alphanumeric, with hyphens allowed
    const validPattern = /^[a-z][a-z0-9-]*$/;
    if (!validPattern.test(domainName)) {
      errors.push({
        type: ConfigErrorType.INVALID_VALUE,
        field: 'domainName',
        message:
          "Domain name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens",
        expected: 'lowercase alphanumeric with hyphens (e.g., "automobile")',
        actual: domainName
      });
    }
  }

  /**
   * Validate API base URL format
   */
  private validateApiBaseUrl(
    apiBaseUrl: string,
    errors: ConfigValidationError[]
  ): void {
    if (!apiBaseUrl) return;

    try {
      new URL(apiBaseUrl);
    } catch (e) {
      errors.push({
        type: ConfigErrorType.INVALID_VALUE,
        field: 'apiBaseUrl',
        message: 'API base URL is not a valid URL',
        expected: 'valid URL (e.g., "http://api.example.com")',
        actual: apiBaseUrl
      });
    }
  }

  /**
   * Validate API adapter interface
   */
  private validateApiAdapter(
    adapter: any,
    errors: ConfigValidationError[]
  ): void {
    if (!adapter) return;

    if (typeof adapter.fetchData !== 'function') {
      errors.push({
        type: ConfigErrorType.INVALID_TYPE,
        field: 'apiAdapter.fetchData',
        message: 'API adapter must implement fetchData method',
        expected: 'function'
      });
    }
  }

  /**
   * Validate URL mapper interface
   */
  private validateUrlMapper(
    mapper: any,
    errors: ConfigValidationError[]
  ): void {
    if (!mapper) return;

    if (typeof mapper.toUrlParams !== 'function') {
      errors.push({
        type: ConfigErrorType.INVALID_TYPE,
        field: 'urlMapper.toUrlParams',
        message: 'URL mapper must implement toUrlParams method',
        expected: 'function'
      });
    }

    if (typeof mapper.fromUrlParams !== 'function') {
      errors.push({
        type: ConfigErrorType.INVALID_TYPE,
        field: 'urlMapper.fromUrlParams',
        message: 'URL mapper must implement fromUrlParams method',
        expected: 'function'
      });
    }
  }

  /**
   * Validate cache key builder interface
   */
  private validateCacheKeyBuilder(
    builder: any,
    errors: ConfigValidationError[]
  ): void {
    if (!builder) return;

    if (typeof builder.buildKey !== 'function') {
      errors.push({
        type: ConfigErrorType.INVALID_TYPE,
        field: 'cacheKeyBuilder.buildKey',
        message: 'Cache key builder must implement buildKey method',
        expected: 'function'
      });
    }
  }

  /**
   * Validate table configuration
   */
  private validateTableConfig(
    tableConfig: any,
    errors: ConfigValidationError[]
  ): void {
    if (!tableConfig) return;

    if (!tableConfig.tableId) {
      errors.push({
        type: ConfigErrorType.MISSING_REQUIRED,
        field: 'tableConfig.tableId',
        message: 'Table config must have tableId'
      });
    }

    if (!tableConfig.dataKey) {
      errors.push({
        type: ConfigErrorType.MISSING_REQUIRED,
        field: 'tableConfig.dataKey',
        message: 'Table config must have dataKey'
      });
    }

    if (!tableConfig.columns || !Array.isArray(tableConfig.columns)) {
      errors.push({
        type: ConfigErrorType.INVALID_TYPE,
        field: 'tableConfig.columns',
        message: 'Table config must have columns array',
        expected: 'array'
      });
    } else if (tableConfig.columns.length === 0) {
      errors.push({
        type: ConfigErrorType.EMPTY_ARRAY,
        field: 'tableConfig.columns',
        message: 'Table config must have at least one column'
      });
    }
  }

  /**
   * Validate array field
   */
  private validateArray(
    config: any,
    field: string,
    errors: ConfigValidationError[],
    warnings: ConfigValidationError[]
  ): void {
    if (config[field] === undefined || config[field] === null) {
      warnings.push({
        type: ConfigErrorType.MISSING_REQUIRED,
        field,
        message: `Field '${field}' is missing, will default to empty array`,
        expected: 'array'
      });
    } else if (!Array.isArray(config[field])) {
      errors.push({
        type: ConfigErrorType.INVALID_TYPE,
        field,
        message: `Field '${field}' must be an array`,
        expected: 'array',
        actual: typeof config[field]
      });
    }
  }

  /**
   * Validate pickers array
   */
  private validatePickers(
    pickers: any[],
    errors: ConfigValidationError[]
  ): void {
    const ids = new Set<string>();

    pickers.forEach((picker, index) => {
      if (!picker.id) {
        errors.push({
          type: ConfigErrorType.MISSING_REQUIRED,
          field: `pickers[${index}].id`,
          message: `Picker at index ${index} must have id`
        });
      } else {
        if (ids.has(picker.id)) {
          errors.push({
            type: ConfigErrorType.DUPLICATE_ID,
            field: `pickers[${index}].id`,
            message: `Duplicate picker id: ${picker.id}`,
            actual: picker.id
          });
        }
        ids.add(picker.id);
      }
    });
  }

  /**
   * Validate filters array
   */
  private validateFilters(
    filters: any[],
    errors: ConfigValidationError[]
  ): void {
    const ids = new Set<string>();

    filters.forEach((filter, index) => {
      if (!filter.id) {
        errors.push({
          type: ConfigErrorType.MISSING_REQUIRED,
          field: `filters[${index}].id`,
          message: `Filter at index ${index} must have id`
        });
      } else {
        if (ids.has(filter.id)) {
          errors.push({
            type: ConfigErrorType.DUPLICATE_ID,
            field: `filters[${index}].id`,
            message: `Duplicate filter id: ${filter.id}`,
            actual: filter.id
          });
        }
        ids.add(filter.id);
      }

      if (!filter.type) {
        errors.push({
          type: ConfigErrorType.MISSING_REQUIRED,
          field: `filters[${index}].type`,
          message: `Filter at index ${index} must have type`
        });
      }
    });
  }

  /**
   * Validate charts array
   */
  private validateCharts(
    charts: any[],
    errors: ConfigValidationError[]
  ): void {
    const ids = new Set<string>();

    charts.forEach((chart, index) => {
      if (!chart.id) {
        errors.push({
          type: ConfigErrorType.MISSING_REQUIRED,
          field: `charts[${index}].id`,
          message: `Chart at index ${index} must have id`
        });
      } else {
        if (ids.has(chart.id)) {
          errors.push({
            type: ConfigErrorType.DUPLICATE_ID,
            field: `charts[${index}].id`,
            message: `Duplicate chart id: ${chart.id}`,
            actual: chart.id
          });
        }
        ids.add(chart.id);
      }

      if (!chart.type) {
        errors.push({
          type: ConfigErrorType.MISSING_REQUIRED,
          field: `charts[${index}].type`,
          message: `Chart at index ${index} must have type`
        });
      }

      if (!chart.dataSourceId) {
        errors.push({
          type: ConfigErrorType.MISSING_REQUIRED,
          field: `charts[${index}].dataSourceId`,
          message: `Chart at index ${index} must have dataSourceId`
        });
      }
    });
  }

  /**
   * Validate features object
   */
  private validateFeatures(
    features: any,
    errors: ConfigValidationError[]
  ): void {
    if (!features) return;

    const requiredFeatures = ['highlights', 'popOuts', 'rowExpansion'];

    requiredFeatures.forEach((feature) => {
      if (typeof features[feature] !== 'boolean') {
        errors.push({
          type: ConfigErrorType.INVALID_TYPE,
          field: `features.${feature}`,
          message: `Feature '${feature}' must be a boolean`,
          expected: 'boolean',
          actual: typeof features[feature]
        });
      }
    });
  }

  /**
   * Get human-readable validation summary
   *
   * Formats validation result into human-readable multi-line string
   * that includes both errors and warnings with line numbers and error types.
   *
   * @param result - Validation result from validate() or validateAndSanitize()
   * @returns Formatted summary string with errors and warnings listed
   *
   * @example
   * ```typescript
   * const result = validator.validate(config);
   * const summary = validator.getValidationSummary(result);
   * console.log(summary);
   * // Output:
   * // Configuration validation failed:
   * //
   * // Errors (2):
   * //   1. [MISSING_REQUIRED] domainName: Required field 'domainName' is missing
   * //   2. [INVALID_TYPE] apiBaseUrl: Field 'apiBaseUrl' must be a string
   * ```
   */
  getValidationSummary(result: ConfigValidationResult): string {
    if (result.valid) {
      return 'Configuration is valid';
    }

    const lines: string[] = ['Configuration validation failed:'];

    if (result.errors.length > 0) {
      lines.push(`\nErrors (${result.errors.length}):`);
      result.errors.forEach((error, index) => {
        lines.push(
          `  ${index + 1}. [${error.type}] ${error.field}: ${error.message}`
        );
      });
    }

    if (result.warnings && result.warnings.length > 0) {
      lines.push(`\nWarnings (${result.warnings.length}):`);
      result.warnings.forEach((warning, index) => {
        lines.push(
          `  ${index + 1}. [${warning.type}] ${warning.field}: ${warning.message}`
        );
      });
    }

    return lines.join('\n');
  }
}
