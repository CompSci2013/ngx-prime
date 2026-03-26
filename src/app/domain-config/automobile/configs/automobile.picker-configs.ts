/**
 * Automobile Domain - Picker Configurations
 *
 * Defines picker components for selecting related data.
 * Pickers are searchable tables with multi-select capabilities.
 *
 * Domain: Automobile Discovery
 */

import { PickerConfig } from '../../../lib/config';
import { Injector } from '@angular/core';
import { ApiService } from '../../../lib/state-management';
import { environment } from '../../../../environments/environment';

/**
 * Manufacturer/Model row data type
 *
 * Represents a manufacturer-model combination with count
 */
export interface ManufacturerModelRow {
  /**
   * Manufacturer name (e.g., "Toyota", "Honda", "BMW")
   */
  manufacturer: string;

  /**
   * Vehicle model name (e.g., "Camry", "Civic", "X5")
   */
  model: string;

  /**
   * Number of vehicles matching this manufacturer-model combination
   */
  count: number;
}

/**
 * Create Manufacturer-Model Picker Configuration
 *
 * Factory function that creates picker config with injected dependencies.
 * Allows selection of manufacturer-model combinations for filtering.
 *
 * @param apiService - Injected API service
 * @returns Configured picker
 */
export function createManufacturerModelPickerConfig(
  apiService: ApiService
): PickerConfig<ManufacturerModelRow> {
  return {
    id: 'manufacturer-model-picker',
    displayName: 'Select Manufacturer & Model',

    // Column definitions (PrimeNGColumn format)
    columns: [
      {
        field: 'manufacturer',
        header: 'Manufacturer',
        sortable: true,
        filterable: true,
        width: '40%'
      },
      {
        field: 'model',
        header: 'Model',
        sortable: true,
        filterable: true,
        width: '40%'
      },
      {
        field: 'count',
        header: 'Count',
        sortable: true,
        filterable: false,
        width: '20%'
      }
    ],

    // API configuration
    // Server-side pagination: API returns { data, total, page, size, totalPages }
    api: {
      fetchData: (params) => {
        const endpoint = `${environment.apiBaseUrl}/manufacturer-model-combinations`;
        return apiService.get<any>(endpoint, {
          params: {
            page: params.page + 1, // API is 1-indexed, picker is 0-indexed
            size: params.size,
            search: params.search || undefined,
            sortBy: params.sortField || 'manufacturer',
            sortOrder: params.sortOrder === -1 ? 'desc' : 'asc'
          }
        });
      },

      responseTransformer: (response) => {
        return {
          results: response.data || [],
          total: response.total || 0,
          page: response.page,
          size: response.size,
          totalPages: response.totalPages
        };
      }
    },

    // Row key configuration
    row: {
      keyGenerator: (row) => `${row.manufacturer}:${row.model}`,
      keyParser: (key) => {
        const [manufacturer, model] = key.split(':');
        return { manufacturer, model } as Partial<ManufacturerModelRow>;
      }
    },

    // Selection configuration
    selection: {
      mode: 'multiple',
      urlParam: 'modelCombos',

      // Serialize selected items to URL
      serializer: (items) => {
        if (!items || items.length === 0) return '';
        return items.map(item => `${item.manufacturer}:${item.model}`).join(',');
      },

      // Deserialize URL to partial items (for hydration)
      deserializer: (urlValue) => {
        if (!urlValue) return [];
        return urlValue.split(',').map(combo => {
          const [manufacturer, model] = combo.split(':');
          return { manufacturer, model } as Partial<ManufacturerModelRow>;
        });
      },

      // Optional: Custom key generator (defaults to row.keyGenerator)
      keyGenerator: (item) => `${item.manufacturer}:${item.model}`
    },

    // Pagination configuration
    // Server-side pagination: fetches only current page from API
    pagination: {
      mode: 'server',
      defaultPageSize: 20,
      pageSizeOptions: [10, 20, 50, 100]
    },

    // Search configuration
    showSearch: true,
    searchPlaceholder: 'Search manufacturer or model...'
  };
}

/**
 * Register all automobile picker configurations
 *
 * @param injector - Angular injector for dependency resolution
 * @returns Array of picker configurations
 */
export function createAutomobilePickerConfigs(injector: Injector): PickerConfig<any>[] {
  const apiService = injector.get(ApiService);

  return [
    createManufacturerModelPickerConfig(apiService)
    // Add more pickers here as needed
  ];
}

/**
 * Static export for backwards compatibility
 * Populated dynamically by domain config factory
 */
export const AUTOMOBILE_PICKER_CONFIGS: PickerConfig<any>[] = [];
