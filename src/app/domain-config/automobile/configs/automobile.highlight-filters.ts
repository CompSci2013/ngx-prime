/**
 * Automobile Domain - Highlight Filter Definitions
 *
 * Defines highlight filter definitions for the Query Control component.
 * Highlight filters allow users to add h_* parameters to segment statistics
 * in charts (showing highlighted vs other data in stacked bars).
 *
 * Domain: Automobile Discovery
 */

import { FilterDefinition, FilterOption } from '../../../lib/config';
import { HighlightFilters } from '../models/automobile.filters';
import { environment } from '../../../../environments/environment';

/**
 * Highlight filter definitions
 *
 * Each definition specifies:
 * - Which highlight field it manages (h_manufacturer, h_modelCombos, etc.)
 * - What type of UI control to display (multiselect, range, etc.)
 * - Where to fetch options from (API endpoint)
 * - How to transform API responses
 * - URL parameter names (with h_ prefix)
 *
 * These are used by the QueryControlComponent to dynamically render highlight filter dialogs.
 *
 * @example
 * ```typescript
 * // User adds "Highlight Manufacturer: Ford" filter
 * // URL updates to: ?h_manufacturer=Ford
 * // API receives: GET /vehicles/details?h_manufacturer=Ford
 * // Returns segmented statistics: {"Ford": {"total": 665, "highlighted": 665}, ...}
 * // Charts render stacked bars showing highlighted (Ford) vs other manufacturers
 * ```
 */
export const AUTOMOBILE_HIGHLIGHT_FILTERS: FilterDefinition<HighlightFilters>[] = [
  /**
   * Highlight Manufacturer filter (Multiselect)
   * URL parameter: h_manufacturer
   */
  {
    field: 'manufacturer',
    label: 'Highlight Manufacturer',
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
    urlParams: 'h_manufacturer',
    searchPlaceholder: 'Type to search manufacturers...',
    dialogSubtitle: 'Select one or more manufacturers to highlight in charts.'
  },

  /**
   * Highlight Model Combinations filter (Multiselect)
   * URL parameter: h_modelCombos
   * Format: Manufacturer:Model,Manufacturer:Model (e.g., Ford:F-150,Toyota:Camry)
   */
  {
    field: 'modelCombos',
    label: 'Highlight Models',
    type: 'multiselect',
    optionsEndpoint: `${environment.apiBaseUrl}/manufacturer-model-combinations`,
    optionsTransformer: (response: any): FilterOption[] => {
      const options: FilterOption[] = [];
      if (response && response.data) {
        // Flatten nested structure: data[].manufacturer + data[].models[].model
        for (const manufacturerGroup of response.data) {
          const manufacturer = manufacturerGroup.manufacturer;
          if (manufacturerGroup.models) {
            for (const modelObj of manufacturerGroup.models) {
              const model = modelObj.model;
              options.push({
                value: `${manufacturer}:${model}`,
                label: `${manufacturer}:${model}`
              });
            }
          }
        }
      }
      return options;
    },
    urlParams: 'h_modelCombos',
    searchPlaceholder: 'Type to search model combinations...',
    dialogSubtitle: 'Select one or more model combinations to highlight in charts.'
  },

  /**
   * Highlight Body Class filter (Multiselect)
   * URL parameter: h_bodyClass
   */
  {
    field: 'bodyClass',
    label: 'Highlight Body Class',
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
    urlParams: 'h_bodyClass',
    searchPlaceholder: 'Type to search body classes...',
    dialogSubtitle: 'Select one or more body classes to highlight in charts.'
  },

  /**
   * Highlight Year Range filter (Range)
   * URL parameters: h_yearMin, h_yearMax
   *
   * Note: This uses yearMin as the field, but actually manages both yearMin and yearMax
   */
  {
    field: 'yearMin',
    label: 'Highlight Year',
    type: 'range',
    optionsEndpoint: `${environment.apiBaseUrl}/filters/year-range`,
    urlParams: { min: 'h_yearMin', max: 'h_yearMax' },
    dialogTitle: 'Highlight Year Range',
    dialogSubtitle: 'Select a year range to highlight in charts. You can select just a start year, end year, or both.',
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
  }
];
