import { Observable } from 'rxjs';
import { PrimeNGColumn } from './table-config.interface';

/**
 * Picker Configuration Interfaces
 *
 * Configuration-driven approach for selection pickers (multi-select tables).
 * Pickers use PrimeNG Table with checkboxes for row selection.
 *
 * @example
 * ```typescript
 * const vehiclePickerConfig: PickerConfig<Vehicle> = {
 *   id: 'vehicle-picker',
 *   displayName: 'Vehicle Selection',
 *   columns: [
 *     { field: 'manufacturer', header: 'Manufacturer', sortable: true },
 *     { field: 'model', header: 'Model', sortable: true }
 *   ],
 *   api: {
 *     fetchData: (params) => this.apiService.get('/vehicles', { params }),
 *     responseTransformer: (r) => ({ results: r.results, total: r.total })
 *   },
 *   row: {
 *     keyGenerator: (row) => row.id,
 *     keyParser: (key) => ({ id: key })
 *   },
 *   selection: {
 *     mode: 'multiple',
 *     urlParam: 'selectedVehicles',
 *     serializer: (items) => items.map(i => i.id).join(','),
 *     deserializer: (url) => url.split(',').map(id => ({ id }))
 *   },
 *   pagination: {
 *     mode: 'server',
 *     defaultPageSize: 20
 *   }
 * };
 * ```
 */

/**
 * Picker API configuration
 *
 * Defines how picker fetches data from API.
 *
 * @template T - The data model type
 */
export interface PickerApiConfig<T> {
  /**
   * Function to fetch data
   * Receives pagination/filter params, returns Observable of results
   */
  fetchData: (params: PickerApiParams) => Observable<any>;

  /**
   * Transform API response to standard format
   * Required for consistency across different API shapes
   */
  responseTransformer: (response: any) => PickerApiResponse<T>;

  /**
   * Optional parameter mapper
   * Maps internal picker params to API-specific format
   */
  paramMapper?: (params: PickerApiParams) => any;
}

/**
 * Picker API request parameters
 */
export interface PickerApiParams {
  /** Current page (0-indexed) */
  page: number;

  /** Page size */
  size: number;

  /** Sort field */
  sortField?: string;

  /** Sort order (1 = asc, -1 = desc) */
  sortOrder?: 1 | -1;

  /** Search/filter term */
  search?: string;

  /** Additional filters */
  filters?: { [key: string]: any };
}

/**
 * Picker API response format
 *
 * @template T - The data model type
 */
export interface PickerApiResponse<T> {
  /** Array of result items */
  results: T[];

  /** Total number of items (for pagination) */
  total: number;

  /** Current page number (optional) */
  page?: number;

  /** Page size (optional) */
  size?: number;

  /** Total pages (optional) */
  totalPages?: number;
}

/**
 * Picker row configuration
 *
 * Defines how to generate unique keys for rows and parse them back.
 *
 * @template T - The data model type
 */
export interface PickerRowConfig<T> {
  /**
   * Generate unique key from row data
   * Used for selection tracking and URL serialization
   *
   * @example
   * keyGenerator: (row) => row.id
   * keyGenerator: (row) => `${row.manufacturer}|${row.model}`
   */
  keyGenerator: (row: T) => string;

  /**
   * Parse key back to partial row data
   * Used for URL hydration before data loads
   *
   * @example
   * keyParser: (key) => ({ id: key })
   * keyParser: (key) => {
   *   const [m, mo] = key.split('|');
   *   return { manufacturer: m, model: mo };
   * }
   */
  keyParser: (key: string) => Partial<T>;
}

/**
 * Picker selection configuration
 *
 * Defines selection behavior and URL synchronization.
 *
 * @template T - The data model type
 */
export interface PickerSelectionConfig<T> {
  /**
   * Selection mode
   * @default 'multiple'
   */
  mode: 'single' | 'multiple';

  /**
   * URL query parameter name for storing selections
   *
   * @example
   * urlParam: 'selectedVehicles'
   * URL: ?selectedVehicles=1,2,3
   */
  urlParam: string;

  /**
   * Serialize selected items to URL string
   *
   * @example
   * serializer: (items) => items.map(i => i.id).join(',')
   * → "1,2,3"
   *
   * serializer: (items) => items.map(i => `${i.manufacturer}:${i.model}`).join(',')
   * → "Ford:F-150,Chevrolet:Silverado"
   */
  serializer: (items: T[]) => string;

  /**
   * Deserialize URL string to partial item data
   *
   * @example
   * deserializer: (url) => url.split(',').map(id => ({ id }))
   * "1,2,3" → [{id: '1'}, {id: '2'}, {id: '3'}]
   *
   * deserializer: (url) => url.split(',').map(pair => {
   *   const [m, mo] = pair.split(':');
   *   return { manufacturer: m, model: mo };
   * })
   * "Ford:F-150" → [{manufacturer: 'Ford', model: 'F-150'}]
   */
  deserializer: (urlString: string) => Partial<T>[];

  /**
   * Generate key from partial item (from deserializer)
   * If not provided, uses row.keyGenerator
   */
  keyGenerator?: (item: Partial<T>) => string;
}

/**
 * Picker pagination configuration
 */
export interface PickerPaginationConfig {
  /**
   * Pagination mode
   * - 'server': Server-side pagination (API handles paging)
   * - 'client': Client-side pagination (load all data, page locally)
   * @default 'server'
   */
  mode: 'server' | 'client';

  /**
   * Default page size
   * @default 20
   */
  defaultPageSize?: number;

  /**
   * Page size options
   * @default [10, 20, 50, 100]
   */
  pageSizeOptions?: number[];
}

/**
 * Picker caching configuration
 */
export interface PickerCachingConfig {
  /**
   * Enable caching
   * @default false
   */
  enabled: boolean;

  /**
   * Cache TTL in milliseconds
   * @default 300000 (5 minutes)
   */
  ttl?: number;
}

/**
 * Complete picker configuration
 *
 * @template T - The data model type
 */
export interface PickerConfig<T> {
  /**
   * Unique identifier for this picker
   * Used for registry lookup and state management
   */
  id: string;

  /**
   * Display name for picker (shown in UI)
   */
  displayName: string;

  /**
   * Column definitions
   * Reuses PrimeNGColumn from table config for consistency
   */
  columns: PrimeNGColumn<T>[];

  /**
   * API configuration
   */
  api: PickerApiConfig<T>;

  /**
   * Row key configuration
   */
  row: PickerRowConfig<T>;

  /**
   * Selection configuration
   */
  selection: PickerSelectionConfig<T>;

  /**
   * Pagination configuration
   */
  pagination: PickerPaginationConfig;

  /**
   * Optional caching configuration
   */
  caching?: PickerCachingConfig;

  /**
   * Optional description/help text
   */
  description?: string;

  /**
   * Show search box
   * @default true
   */
  showSearch?: boolean;

  /**
   * Search placeholder text
   * @default 'Search...'
   */
  searchPlaceholder?: string;
}

/**
 * Picker selection event
 *
 * Emitted when user changes selection.
 *
 * @template T - The data model type
 */
export interface PickerSelectionEvent<T> {
  /** Picker ID that emitted the event */
  pickerId: string;

  /** Selected item objects */
  selections: T[];

  /** Selected item keys (from keyGenerator) */
  selectedKeys: string[];

  /** Serialized URL parameter value */
  urlValue: string;
}

/**
 * Picker state
 *
 * Internal state tracking for picker component.
 *
 * @template T - The data model type
 */
export interface PickerState<T> {
  /** All loaded data */
  data: T[];

  /** Total count (for pagination) */
  totalCount: number;

  /** Selected row keys */
  selectedKeys: Set<string>;

  /** Selected row objects */
  selectedItems: T[];

  /** Loading state */
  loading: boolean;

  /** Error state */
  error: Error | null;

  /** Current page (0-indexed) */
  currentPage: number;

  /** Page size */
  pageSize: number;

  /** Search term */
  searchTerm: string;

  /** Sort field */
  sortField?: string;

  /** Sort order */
  sortOrder?: 1 | -1;

  /** Pending hydration keys (from URL, before data loads) */
  pendingHydration: string[];

  /** Data loaded flag */
  dataLoaded: boolean;
}

/**
 * Utility function to create default picker state
 *
 * @template T - The data model type
 * @param pageSize - Initial page size
 * @returns Default PickerState
 */
export function getDefaultPickerState<T>(pageSize: number = 20): PickerState<T> {
  return {
    data: [],
    totalCount: 0,
    selectedKeys: new Set<string>(),
    selectedItems: [],
    loading: false,
    error: null,
    currentPage: 0,
    pageSize,
    searchTerm: '',
    sortField: undefined,
    sortOrder: undefined,
    pendingHydration: [],
    dataLoaded: false
  };
}
