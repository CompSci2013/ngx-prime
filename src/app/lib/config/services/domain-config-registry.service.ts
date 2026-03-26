import { Injectable, InjectionToken, Injector, Provider } from '@angular/core';
import { DomainConfig } from '../models/domain-config.interface';
import { DomainConfigValidator } from './domain-config-validator.service';

/**
 * Injection token for domain configuration
 *
 * Used to provide domain-specific configuration to the application
 *
 * @example
 * ```typescript
 * // In domain module
 * providers: [
 *   {
 *     provide: DOMAIN_CONFIG,
 *     useValue: AUTOMOBILE_DOMAIN_CONFIG
 *   }
 * ]
 *
 * // In component
 * constructor(
 *   @Inject(DOMAIN_CONFIG) private domainConfig: DomainConfig<any, any, any>
 * ) {}
 * ```
 */
export const DOMAIN_CONFIG = new InjectionToken<DomainConfig<any, any, any>>(
  'Domain Configuration'
);

/**
 * Domain configuration registry service
 *
 * Centralized registry for managing multiple domain configurations.
 * Supports registering, retrieving, and switching between domains.
 *
 * @example
 * ```typescript
 * // Register domain
 * registry.register(AUTOMOBILE_DOMAIN_CONFIG);
 * registry.register(AGRICULTURE_DOMAIN_CONFIG);
 *
 * // Get active domain
 * const config = registry.getActive();
 *
 * // Switch domain
 * registry.setActive('agriculture');
 *
 * // List all domains
 * const domains = registry.getAllDomainNames();
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class DomainConfigRegistry {
  /**
   * Registered domain configurations
   *
   * Maps domain name (e.g., 'automobile', 'agriculture') to their corresponding
   * DomainConfig instances. Allows runtime switching between different domain
   * contexts with different data models, filter definitions, and statistics.
   *
   * @private
   */
  private configs = new Map<string, DomainConfig<any, any, any>>();

  /**
   * Active domain name
   *
   * Tracks the currently active domain. When undefined, no domain is active.
   * Set automatically when first domain is registered or via setActive().
   *
   * @private
   */
  private activeDomainName?: string;

  /**
   * Constructor for dependency injection
   *
   * @param validator - DomainConfigValidator service for validating domain configurations
   */
  constructor(private validator: DomainConfigValidator) {}

  /**
   * Register a domain configuration
   *
   * @param config - Domain configuration to register
   * @param validate - Whether to validate configuration (default: true)
   * @throws Error if configuration is invalid (when validate=true)
   * @throws Error if domain name already registered
   */
  register<TFilters, TData, TStatistics>(
    config: DomainConfig<TFilters, TData, TStatistics>,
    validate: boolean = true
  ): void {
    // Validate if requested
    if (validate) {
      const sanitizedConfig = this.validator.validateAndSanitize(config);
      config = sanitizedConfig as DomainConfig<TFilters, TData, TStatistics>;
    }

    // Check for duplicate
    if (this.configs.has(config.domainName)) {
      console.warn(
        `Domain '${config.domainName}' already registered. Overwriting.`
      );
    }

    // Register
    this.configs.set(config.domainName, config);

    // Set as active if first domain
    if (!this.activeDomainName) {
      this.activeDomainName = config.domainName;
    }

    console.log(`Domain '${config.domainName}' registered successfully`);
  }

  /**
   * Register multiple domain configurations
   *
   * @param configs - Array of domain configurations
   * @param validate - Whether to validate configurations (default: true)
   */
  registerMultiple(
    configs: DomainConfig<any, any, any>[],
    validate: boolean = true
  ): void {
    configs.forEach((config) => this.register(config, validate));
  }

  /**
   * Register domain providers
   *
   * @param providers - Array of domain configuration providers
   * @param injector - Angular injector for resolving dependencies
   */
  registerDomainProviders(providers: Provider[], injector: Injector): void {
    providers.forEach(provider => {
      if ('useFactory' in provider && provider.deps) {
        const config = provider.useFactory(...provider.deps.map(dep => injector.get(dep)));
        this.register(config);
      }
    });
  }

  /**
   * Get domain configuration by name
   *
   * @param domainName - Domain name
   * @returns Domain configuration
   * @throws Error if domain not found
   */
  get<TFilters, TData, TStatistics>(
    domainName: string
  ): DomainConfig<TFilters, TData, TStatistics> {
    const config = this.configs.get(domainName);

    if (!config) {
      const available = this.getAllDomainNames().join(', ');
      throw new Error(
        `Domain '${domainName}' not found. Available domains: ${available}`
      );
    }

    return config as DomainConfig<TFilters, TData, TStatistics>;
  }

  /**
   * Get active domain configuration
   *
   * @returns Active domain configuration
   * @throws Error if no domain is active
   */
  getActive<TFilters, TData, TStatistics>(): DomainConfig<
    TFilters,
    TData,
    TStatistics
  > {
    if (!this.activeDomainName) {
      throw new Error('No active domain. Register a domain first.');
    }

    return this.get<TFilters, TData, TStatistics>(this.activeDomainName);
  }

  /**
   * Set active domain
   *
   * @param domainName - Domain name to activate
   * @throws Error if domain not found
   */
  setActive(domainName: string): void {
    if (!this.configs.has(domainName)) {
      const available = this.getAllDomainNames().join(', ');
      throw new Error(
        `Cannot activate domain '${domainName}'. Available domains: ${available}`
      );
    }

    this.activeDomainName = domainName;
    console.log(`Active domain set to '${domainName}'`);
  }

  /**
   * Get active domain name
   *
   * @returns Active domain name or undefined
   */
  getActiveDomainName(): string | undefined {
    return this.activeDomainName;
  }

  /**
   * Check if domain is registered
   *
   * @param domainName - Domain name to check
   * @returns True if domain is registered
   */
  has(domainName: string): boolean {
    return this.configs.has(domainName);
  }

  /**
   * Get all registered domain names
   *
   * @returns Array of domain names
   */
  getAllDomainNames(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Get all registered domain configurations
   *
   * @returns Array of domain configurations
   */
  getAll(): DomainConfig<any, any, any>[] {
    return Array.from(this.configs.values());
  }

  /**
   * Unregister a domain
   *
   * @param domainName - Domain name to unregister
   * @returns True if domain was unregistered, false if not found
   */
  unregister(domainName: string): boolean {
    const result = this.configs.delete(domainName);

    // Clear active if it was the active domain
    if (this.activeDomainName === domainName) {
      this.activeDomainName = undefined;

      // Set first remaining domain as active
      const remaining = this.getAllDomainNames();
      if (remaining.length > 0) {
        this.setActive(remaining[0]);
      }
    }

    if (result) {
      console.log(`Domain '${domainName}' unregistered`);
    }

    return result;
  }

  /**
   * Clear all registered domains
   */
  clear(): void {
    this.configs.clear();
    this.activeDomainName = undefined;
    console.log('All domains cleared');
  }

  /**
   * Get count of registered domains
   *
   * @returns Number of registered domains
   */
  getCount(): number {
    return this.configs.size;
  }

  /**
   * Validate a domain configuration without registering
   *
   * @param config - Domain configuration to validate
   * @returns Validation result
   */
  validate<TFilters, TData, TStatistics>(
    config: DomainConfig<TFilters, TData, TStatistics>
  ) {
    return this.validator.validate(config);
  }

  /**
   * Get validation summary for a domain
   *
   * @param domainName - Domain name
   * @returns Validation summary string
   */
  getValidationSummary(domainName: string): string {
    const config = this.get(domainName);
    const result = this.validator.validate(config);
    return this.validator.getValidationSummary(result);
  }
}
