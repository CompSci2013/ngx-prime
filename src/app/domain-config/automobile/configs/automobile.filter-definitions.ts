/**
 * Automobile Domain - Filter Definitions
 *
 * Defines query control filters for the automobile discovery interface.
 * These are UI filters that users can interact with to refine their search.
 *
 * Domain: Automobile Discovery
 */

import { FilterDefinition } from '../../../framework/models/domain-config.interface';

/**
 * Automobile filter definitions
 *
 * Array of filter controls for the query panel.
 * Users can combine these filters to search for specific vehicles.
 *
 * @example
 * ```typescript
 * <div class="filter-panel">
 *   <app-filter-control
 *     *ngFor="let filter of AUTOMOBILE_FILTER_DEFINITIONS"
 *     [definition]="filter"
 *     [(value)]="filterValues[filter.id]">
 *   </app-filter-control>
 * </div>
 * ```
 */
export const AUTOMOBILE_FILTER_DEFINITIONS: FilterDefinition[] = [
  /**
   * Manufacturer filter
   */
  {
    id: 'manufacturer',
    label: 'Manufacturer',
    type: 'autocomplete',
    placeholder: 'Enter manufacturer name...',
    autocompleteEndpoint: 'filters/manufacturers',
    autocompleteMinChars: 1,
    operators: ['contains', 'equals', 'startsWith'],
    defaultOperator: 'contains',
    validation: {
      minLength: 1,
      maxLength: 100
    }
  },

  /**
   * Model filter
   *
   * Uses autocomplete with progressive refinement:
   * - User types 2+ characters
   * - Backend returns top 10 matching models
   * - Results narrow as user types more
   */
  {
    id: 'model',
    label: 'Model',
    type: 'autocomplete',
    placeholder: 'Type to search models...',
    autocompleteEndpoint: 'filters/models',
    autocompleteMinChars: 1,
    operators: ['contains', 'equals', 'startsWith'],
    defaultOperator: 'contains',
    validation: {
      minLength: 1,
      maxLength: 100
    }
  },

  /**
   * Year range filter
   *
   * Uses format.number.useGrouping: false to prevent thousand separators
   * (displays "1980" instead of "1,980")
   *
   * Note: id is 'year' so Query Panel looks for 'yearMin'/'yearMax' in currentFilters,
   * which matches the actual filter model field names (AutoSearchFilters.yearMin/yearMax)
   */
  {
    id: 'year',
    label: 'Year Range',
    type: 'range',
    min: 1900,
    max: new Date().getFullYear() + 1, // Include next year for upcoming models
    step: 1,
    format: {
      number: {
        useGrouping: false, // No commas in years
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }
    }
  },

  /**
   * Body class filter (multi-select)
   *
   * Uses optionsEndpoint to load options dynamically from the backend.
   * This ensures all body classes in the data are available as options.
   * Allows selecting multiple body classes with checkboxes.
   */
  {
    id: 'bodyClass',
    label: 'Body Class',
    type: 'multiselect',
    placeholder: 'Select body classes...',
    format: {
      caseSensitive: false, // Match "Coupe", "coupe", "COUPE" equally
      transform: 'titlecase' // Normalize to "Coupe" format
    },
    optionsEndpoint: 'body_class' // Loads from /api/specs/v1/agg/body_class
  },

  /**
   * Global search filter
   */
  {
    id: 'search',
    label: 'Search',
    type: 'text',
    placeholder: 'Search manufacturer, model, or body class...',
    operators: ['contains'],
    defaultOperator: 'contains',
    validation: {
      minLength: 1,
      maxLength: 200
    }
  }
];

/**
 * Quick filter presets
 *
 * Predefined filter combinations for common searches
 */
export const AUTOMOBILE_QUICK_FILTERS = {
  /**
   * Recent vehicles (last 5 years)
   */
  recent: {
    label: 'Recent Vehicles',
    filters: {
      yearMin: new Date().getFullYear() - 5,
      yearMax: new Date().getFullYear()
    }
  },

  /**
   * Popular vehicles (high instance count)
   */
  popular: {
    label: 'Popular Vehicles',
    filters: {
      instanceCountMin: 100
    }
  },

  /**
   * Classic vehicles (pre-2000)
   */
  classic: {
    label: 'Classic Vehicles',
    filters: {
      yearMax: 2000
    }
  },

  /**
   * SUVs only
   */
  suvs: {
    label: 'SUVs',
    filters: {
      bodyClass: 'SUV'
    }
  },

  /**
   * Trucks only
   */
  trucks: {
    label: 'Trucks',
    filters: {
      bodyClass: 'Truck'
    }
  },

  /**
   * Sedans only
   */
  sedans: {
    label: 'Sedans',
    filters: {
      bodyClass: 'Sedan'
    }
  }
};

/**
 * Filter groups
 *
 * Organize filters into logical groups for better UX
 */
export const AUTOMOBILE_FILTER_GROUPS = {
  /**
   * Vehicle identification filters
   */
  identification: {
    label: 'Vehicle Identification',
    filters: ['manufacturer', 'model', 'bodyClass']
  },

  /**
   * Time-based filters
   */
  temporal: {
    label: 'Year',
    filters: ['year']
  },

  /**
   * General search
   */
  general: {
    label: 'General Search',
    filters: ['search']
  }
};

/**
 * Filter validation rules
 *
 * Additional validation beyond basic type validation
 */
export const AUTOMOBILE_FILTER_VALIDATION = {
  /**
   * Validate year range
   */
  yearRange: (min: number, max: number): boolean => {
    if (min && max && min > max) {
      return false; // Min cannot be greater than max
    }
    const currentYear = new Date().getFullYear();
    if (min && (min < 1900 || min > currentYear + 1)) {
      return false; // Year out of valid range
    }
    if (max && (max < 1900 || max > currentYear + 1)) {
      return false; // Year out of valid range
    }
    return true;
  }
};
