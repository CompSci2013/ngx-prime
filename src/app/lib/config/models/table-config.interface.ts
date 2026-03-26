/**
 * Table Configuration Interfaces
 *
 * Configuration-driven approach for PrimeNG Table.
 * These interfaces provide type-safe table configuration without
 * requiring custom table wrapper components.
 *
 * @example
 * ```typescript
 * const vehicleTableConfig: TableConfig<Vehicle> = {
 *   tableId: 'vehicle-table',
 *   stateKey: 'vehicle-table-state',
 *   dataKey: 'id',
 *   columns: [
 *     { field: 'manufacturer', header: 'Manufacturer', sortable: true },
 *     { field: 'model', header: 'Model', sortable: true, filterable: true }
 *   ],
 *   expandable: true,
 *   selectable: false,
 *   paginator: true,
 *   rows: 20,
 *   lazy: true,
 *   stateStorage: 'local'
 * };
 * ```
 */

/**
 * PrimeNG column configuration
 *
 * Defines a single column in a PrimeNG Table with type-safe field reference.
 *
 * @template T - The data model type
 */
export interface PrimeNGColumn<T> {
  /**
   * Field name from data model (type-safe via keyof T)
   */
  field: keyof T;

  /**
   * Display header text
   */
  header: string;

  /**
   * Enable column sorting
   * @default false
   */
  sortable?: boolean;

  /**
   * Enable column filtering
   * @default false
   */
  filterable?: boolean;

  /**
   * Filter match mode for PrimeNG
   * @default 'contains'
   * @see https://primeng.org/table#filter
   */
  filterMatchMode?: 'startsWith' | 'contains' | 'notContains' | 'endsWith' | 'equals' | 'notEquals' | 'in' | 'lt' | 'lte' | 'gt' | 'gte' | 'between' | 'dateIs' | 'dateIsNot' | 'dateBefore' | 'dateAfter';

  /**
   * Enable column reordering
   * @default true
   */
  reorderable?: boolean;

  /**
   * Column width (CSS value: '100px', '20%', etc.)
   */
  width?: string;

  /**
   * Frozen column (stick to left/right during horizontal scroll)
   * @default false
   */
  frozen?: boolean;

  /**
   * Alignment of column content
   * @default 'left'
   */
  align?: 'left' | 'center' | 'right';

  /**
   * Custom CSS classes for column
   */
  styleClass?: string;

  /**
   * Data type for better filtering/sorting
   */
  dataType?: 'text' | 'numeric' | 'date' | 'boolean';
}

/**
 * Table configuration for PrimeNG Table
 *
 * Comprehensive configuration object that drives PrimeNG Table behavior.
 * Use this instead of creating custom table wrapper components.
 *
 * @template T - The data model type
 */
export interface TableConfig<T> {
  /**
   * Unique identifier for this table instance
   */
  tableId: string;

  /**
   * State storage key for PrimeNG's stateStorage feature
   * Used to persist column order, filters, etc. in local/session storage
   */
  stateKey: string;

  /**
   * Column definitions
   */
  columns: PrimeNGColumn<T>[];

  /**
   * Unique key field for row tracking (required for expandable/selectable)
   * Should be a unique identifier field like 'id' or 'vin'
   */
  dataKey: keyof T;

  /**
   * Enable row expansion
   * @default false
   */
  expandable?: boolean;

  /**
   * Enable row selection
   * @default false
   */
  selectable?: boolean;

  /**
   * Selection mode if selectable is true
   * @default 'multiple'
   */
  selectionMode?: 'single' | 'multiple';

  /**
   * Enable paginator
   * @default true
   */
  paginator?: boolean;

  /**
   * Number of rows per page
   * @default 20
   */
  rows?: number;

  /**
   * Rows per page options
   * @default [10, 20, 50, 100]
   */
  rowsPerPageOptions?: number[];

  /**
   * Enable lazy loading mode (server-side pagination/sorting/filtering)
   * @default true
   */
  lazy?: boolean;

  /**
   * State storage mode for persisting table state
   * - 'local': localStorage (persists across sessions)
   * - 'session': sessionStorage (cleared on browser close)
   * - null: no persistence
   * @default 'local'
   */
  stateStorage?: 'local' | 'session' | null;

  /**
   * Enable responsive mode
   * @default true
   */
  responsive?: boolean;

  /**
   * Responsive layout mode
   * @default 'scroll'
   */
  responsiveLayout?: 'scroll' | 'stack';

  /**
   * Enable column resizing
   * @default false
   */
  resizableColumns?: boolean;

  /**
   * Column resize mode
   * @default 'fit'
   */
  columnResizeMode?: 'fit' | 'expand';

  /**
   * Enable column reordering
   * @default true
   */
  reorderableColumns?: boolean;

  /**
   * CSS style classes for table
   */
  styleClass?: string;

  /**
   * Show gridlines
   * @default true
   */
  gridlines?: boolean;

  /**
   * Striped rows
   * @default true
   */
  stripedRows?: boolean;

  /**
   * Show caption/header
   */
  showCaption?: boolean;

  /**
   * Caption text
   */
  caption?: string;

  /**
   * Enable virtual scrolling for large datasets
   * @default false
   */
  virtualScroll?: boolean;

  /**
   * Virtual scroll item size (height in pixels)
   * Required if virtualScroll is true
   */
  virtualScrollItemSize?: number;

  /**
   * Loading indicator
   * @default false
   */
  loading?: boolean;
}

/**
 * Table state for managing table UI state
 *
 * Represents the runtime state of a table instance.
 */
export interface TableState<T> {
  /**
   * Currently selected rows
   */
  selection: T[];

  /**
   * Expanded row keys
   */
  expandedRowKeys: { [key: string]: boolean };

  /**
   * Current page (0-indexed)
   */
  first: number;

  /**
   * Rows per page
   */
  rows: number;

  /**
   * Total records (for pagination)
   */
  totalRecords: number;

  /**
   * Sort field
   */
  sortField?: keyof T;

  /**
   * Sort order (1 = asc, -1 = desc)
   */
  sortOrder?: 1 | -1;

  /**
   * Active filters
   */
  filters?: { [key: string]: any };
}

/**
 * Utility function to get default table configuration
 *
 * @template T - The data model type
 * @param tableId - Unique table identifier
 * @param dataKey - Unique key field
 * @param columns - Column definitions
 * @returns Complete TableConfig with defaults applied
 */
export function getDefaultTableConfig<T>(
  tableId: string,
  dataKey: keyof T,
  columns: PrimeNGColumn<T>[]
): TableConfig<T> {
  return {
    tableId,
    stateKey: `${tableId}-state`,
    columns,
    dataKey,
    expandable: false,
    selectable: false,
    selectionMode: 'multiple',
    paginator: true,
    rows: 20,
    rowsPerPageOptions: [10, 20, 50, 100],
    lazy: true,
    stateStorage: 'local',
    responsive: true,
    responsiveLayout: 'scroll',
    resizableColumns: false,
    columnResizeMode: 'fit',
    reorderableColumns: true,
    styleClass: 'p-datatable-striped p-datatable-gridlines',
    gridlines: true,
    stripedRows: true,
    showCaption: false,
    virtualScroll: false,
    loading: false
  };
}

/**
 * Utility function to get visible columns from configuration
 *
 * Filters out hidden columns and returns array suitable for template iteration.
 *
 * @template T - The data model type
 * @param config - Table configuration
 * @returns Array of visible columns
 */
export function getVisibleColumns<T>(
  config: TableConfig<T>
): PrimeNGColumn<T>[] {
  return config.columns;
}

/**
 * Utility function to build PrimeNG Table bindings from config
 *
 * Converts TableConfig to object suitable for PrimeNG Table attribute binding.
 *
 * @template T - The data model type
 * @param config - Table configuration
 * @returns Object with PrimeNG Table bindings
 */
export function getTableBindings<T>(config: TableConfig<T>): {
  dataKey: keyof T;
  stateStorage: 'local' | 'session' | null;
  stateKey: string;
  paginator: boolean;
  rows: number;
  rowsPerPageOptions: number[];
  lazy: boolean;
  reorderableColumns: boolean;
  resizableColumns: boolean;
  columnResizeMode: 'fit' | 'expand';
  responsive: boolean;
  responsiveLayout: 'scroll' | 'stack';
  styleClass: string;
} {
  return {
    dataKey: config.dataKey,
    stateStorage: config.stateStorage ?? 'local',
    stateKey: config.stateKey,
    paginator: config.paginator ?? true,
    rows: config.rows ?? 20,
    rowsPerPageOptions: config.rowsPerPageOptions ?? [10, 20, 50, 100],
    lazy: config.lazy ?? true,
    reorderableColumns: config.reorderableColumns ?? true,
    resizableColumns: config.resizableColumns ?? false,
    columnResizeMode: config.columnResizeMode ?? 'fit',
    responsive: config.responsive ?? true,
    responsiveLayout: config.responsiveLayout ?? 'scroll',
    styleClass: config.styleClass ?? 'p-datatable-striped p-datatable-gridlines'
  };
}
