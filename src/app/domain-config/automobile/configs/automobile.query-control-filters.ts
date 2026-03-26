/**
 * Automobile Domain - Query Control Filter Definitions
 *
 * Defines filter definitions for the Query Control component.
 * These filters allow users to manually add/remove/edit filters via dialogs.
 *
 * Domain: Automobile Discovery
 */

import { FilterDefinition, FilterOption } from '../../../lib/config';
import { AutoSearchFilters } from '../models/automobile.filters';
import { environment } from '../../../../environments/environment';

/**
 * Query Control filter definitions
 *
 * Each definition specifies:
 * - Which field it filters
 * - What type of UI control to display (multiselect, range, etc.)
 * - Where to fetch options from (API endpoint)
 * - How to transform API responses
 * - URL parameter names
 *
 * These are used by the QueryControlComponent to dynamically render filter dialogs.
 */
export const AUTOMOBILE_QUERY_CONTROL_FILTERS: FilterDefinition<AutoSearchFilters>[] = [
  /**
   * Manufacturer filter (Multiselect)
   */
  {
    field: 'manufacturer',
    label: 'Manufacturer',
    type: 'multiselect',
    optionsEndpoint: `${environment.apiBaseUrl}/filters/manufacturers`,
    optionsTransformer: (response: any): FilterOption[] => {
      if (response && response.manufacturers) {
        return response.manufacturers.map((m: string) => ({
          value: m,
          label: m
        }));
      }
      return [];
    },
    urlParams: 'manufacturer',
    searchPlaceholder: 'Type to search manufacturers...',
    dialogSubtitle: 'Select one or more manufacturers to filter results.'
  },

  /**
   * Model filter (Multiselect)
   */
  {
    field: 'model',
    label: 'Model',
    type: 'multiselect',
    optionsEndpoint: `${environment.apiBaseUrl}/filters/models`,
    optionsTransformer: (response: any): FilterOption[] => {
      if (response && response.models) {
        return response.models.map((m: string) => ({
          value: m,
          label: m
        }));
      }
      return [];
    },
    urlParams: 'model',
    searchPlaceholder: 'Type to search models...',
    dialogSubtitle: 'Select one or more models to filter results.'
  },

  /**
   * Body Class filter (Multiselect)
   */
  {
    field: 'bodyClass',
    label: 'Body Class',
    type: 'multiselect',
    optionsEndpoint: `${environment.apiBaseUrl}/filters/body-classes`,
    optionsTransformer: (response: any): FilterOption[] => {
      if (response && response.body_classes) {
        return response.body_classes.map((b: string) => ({
          value: b,
          label: b
        }));
      }
      return [];
    },
    urlParams: 'bodyClass',
    searchPlaceholder: 'Type to search body classes...',
    dialogSubtitle: 'Select one or more body classes to filter results.'
  },

  /**
   * Year Range filter (Range)
   *
   * Note: This uses yearMin as the field, but actually manages both yearMin and yearMax
   */
  {
    field: 'yearMin',
    label: 'Year',
    type: 'range',
    optionsEndpoint: `${environment.apiBaseUrl}/filters/year-range`,
    urlParams: { min: 'yearMin', max: 'yearMax' },
    dialogTitle: 'Select Year Range',
    dialogSubtitle: 'Select a year range to filter results. You can select just a start year, end year, or both.',
    rangeConfig: {
      valueType: 'integer',
      minLabel: 'Start Year',
      maxLabel: 'End Year',
      minPlaceholder: 'e.g., 1980',
      maxPlaceholder: 'e.g., 2023',
      step: 1,
      useGrouping: false,
      defaultRange: { min: 1900, max: new Date().getFullYear() }
    }
  },

  /**
   * Manufacturer-Model Combinations filter (Multiselect)
   *
   * Used to display chips when selections are made via Manufacturer-Model Picker
   * Format: "Manufacturer:Model" (e.g., "Ford:F-150")
   */
  {
    field: 'modelCombos',
    label: 'Manufacturer & Model',
    type: 'multiselect',
    optionsEndpoint: `${environment.apiBaseUrl}/manufacturer-model-combinations?page=1&size=100`,
    optionsTransformer: (response: any): FilterOption[] => {
      // Response structure: { total, data: [ { manufacturer, count, models: [ { model, count } ] } ] }
      if (response && response.data) {
        const options: FilterOption[] = [];
        for (const mfr of response.data) {
          for (const modelObj of mfr.models || []) {
            options.push({
              value: `${mfr.manufacturer}:${modelObj.model}`,
              label: `${mfr.manufacturer}: ${modelObj.model}`
            });
          }
        }
        return options;
      }
      return [];
    },
    urlParams: 'modelCombos',
    searchPlaceholder: 'Type to search manufacturer-model combinations...',
    dialogSubtitle: 'Select one or more manufacturer-model combinations. Tip: Use the Manufacturer-Model Picker panel for easier selection.'
  }
];
