/**
 * Automobile Domain Configuration
 *
 * Complete domain configuration combining all models, adapters, and UI configs
 * from milestones D1-D4.
 *
 * REFACTORED: Now uses generic implementations from the framework layer:
 * - GenericUrlMapper replaces AutomobileUrlMapper
 * - GenericApiAdapter replaces AutomobileApiAdapter
 * - generateTableConfig() replaces AUTOMOBILE_TABLE_CONFIG
 * - generateTableFilterDefinitions() replaces AUTOMOBILE_FILTER_DEFINITIONS
 *
 * See docs/audit/refactor.md for the simplification roadmap.
 */

import { Injector } from '@angular/core';
import { DomainConfig } from '../../lib/config';
import { ApiService } from '../../lib/state-management';
import { environment } from '../../../environments/environment';
import {
  AutoSearchFilters,
  VehicleResult,
  VehicleStatistics
} from './models';
import { AutomobileCacheKeyBuilder } from './adapters';
import {
  AUTOMOBILE_QUERY_CONTROL_FILTERS,
  AUTOMOBILE_HIGHLIGHT_FILTERS,
  AUTOMOBILE_CHART_CONFIGS,
  AUTOMOBILE_PICKER_CONFIGS
} from './configs';

// Generic implementations from framework layer
import { GenericUrlMapper, GenericApiAdapter, generateTableConfig, generateTableFilterDefinitions } from '../../lib/config';
import { AUTOMOBILE_RESOURCE } from './automobile.resource';
import {
  ManufacturerChartDataSource,
  TopModelsChartDataSource,
  BodyClassChartDataSource,
  YearChartDataSource
} from './chart-sources';
import { Provider } from '@angular/core';
import { DOMAIN_CONFIG } from '../../lib/config';

/**
 * Factory function to create Automobile Domain Configuration
 *
 * This factory creates the domain configuration with properly injected dependencies.
 * Must be called with Angular's Injector to resolve service dependencies.
 *
 * @param injector - Angular injector for resolving dependencies
 * @returns Complete automobile domain configuration
 *
 * @example
 * // In app module
 * providers: [
 *   {
 *     provide: DOMAIN_CONFIG,
 *     useFactory: createAutomobileDomainConfig,
 *     deps: [Injector]
 *   }
 * ]
 */
export function createAutomobileDomainConfig(injector: Injector): DomainConfig<
  AutoSearchFilters,
  VehicleResult,
  VehicleStatistics
> {
  const apiService = injector.get(ApiService);
  const apiBaseUrl = environment.apiBaseUrl;

  return {
    // ==================== Identity ====================
    domainName: 'automobile',
    domainLabel: 'Vvroom Discovery',
    apiBaseUrl: apiBaseUrl,

    // ==================== Type Models ====================
    filterModel: AutoSearchFilters,
    dataModel: VehicleResult,
    statisticsModel: VehicleStatistics,

    // ==================== Adapters ====================
    // REFACTORED: Using generic implementations driven by AUTOMOBILE_RESOURCE
    apiAdapter: new GenericApiAdapter<AutoSearchFilters, VehicleResult, VehicleStatistics>(
      apiService,
      AUTOMOBILE_RESOURCE,
      {
        baseUrl: apiBaseUrl,
        dataTransformer: VehicleResult.fromApiResponse,
        statisticsTransformer: VehicleStatistics.fromApiResponse
      }
    ),
    urlMapper: new GenericUrlMapper<AutoSearchFilters>(AUTOMOBILE_RESOURCE),
    cacheKeyBuilder: new AutomobileCacheKeyBuilder(),

    // ==================== UI Configuration ====================
    // REFACTORED: Configs generated from AUTOMOBILE_RESOURCE
    tableConfig: generateTableConfig<VehicleResult>(AUTOMOBILE_RESOURCE),
    pickers: AUTOMOBILE_PICKER_CONFIGS,
    filters: generateTableFilterDefinitions(AUTOMOBILE_RESOURCE),
  queryControlFilters: AUTOMOBILE_QUERY_CONTROL_FILTERS,
  highlightFilters: AUTOMOBILE_HIGHLIGHT_FILTERS,
  charts: AUTOMOBILE_CHART_CONFIGS,
  chartDataSources: {
    'manufacturer': new ManufacturerChartDataSource(),
    'top-models': new TopModelsChartDataSource(),
    'body-class': new BodyClassChartDataSource(),
    'year': new YearChartDataSource()
  },

  // ==================== Feature Flags ====================
  features: {
    // Required features
    highlights: true,
    popOuts: true,
    rowExpansion: true,

    // Optional features
    statistics: true,
    export: true,
    columnManagement: true,
    statePersistence: true
  },

    // ==================== Metadata ====================
    metadata: {
      version: '1.0.0',
      description: 'Automobile vehicle discovery and analysis',
      author: 'Generic Discovery Framework Team',
      createdAt: '2025-11-20',
      updatedAt: '2025-11-20'
    }
  };
}

/**
 * Angular dependency injection provider for Automobile Domain Configuration
 *
 * Pre-configured provider that can be used directly in Angular module declarations
 * to register the automobile domain configuration with the dependency injection container.
 *
 * @constant {Provider} DOMAIN_PROVIDER
 * @remarks
 * This is an Angular Provider object that:
 * - Provides the DOMAIN_CONFIG injection token
 * - Uses a factory function to create the configuration instance
 * - Automatically resolves the Injector dependency
 *
 * **Usage in Module**:
 * ```typescript
 * @NgModule({
 *   providers: [DOMAIN_PROVIDER] // Add to any module
 * })
 * export class AppModule { }
 * ```
 *
 * **Internally**:
 * - provide: Points to the DOMAIN_CONFIG injection token
 * - useFactory: References createAutomobileDomainConfig function
 * - deps: Specifies that Injector should be injected into the factory
 *
 * @see createAutomobileDomainConfig - The factory function that creates the configuration
 * @see DomainConfig - The interface describing configuration structure
 * @see DOMAIN_CONFIG - The injection token this provider uses
 */
export const DOMAIN_PROVIDER: Provider = {
  provide: DOMAIN_CONFIG,
  useFactory: createAutomobileDomainConfig,
  deps: [Injector],
};
