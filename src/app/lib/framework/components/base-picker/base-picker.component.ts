import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  Output
} from '@angular/core';
import { Subject } from 'rxjs';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { ENVIRONMENT_CONFIG, EnvironmentConfig } from '../../../config/tokens/environment.token';
import {
  getDefaultPickerState,
  PickerApiParams,
  PickerConfig,
  PickerSelectionEvent,
  PickerState
} from '../../../config/models/picker-config.interface';
import { PickerConfigRegistry } from '../../../config/services/picker-config-registry.service';
import { ResourceManagementService } from '../../../state-management/services/resource-management.service';
import { UrlStateService } from '../../../state-management/services/url-state.service';

/**
 * Base Picker Component
 *
 * Configuration-driven multi-select table component.
 * Thin wrapper around PrimeNG Table with selection management and URL synchronization.
 *
 * @template T - The data model type
 *
 * @example
 * ```html
 * <!-- Using config ID from registry -->
 * <app-base-picker
 *   [configId]="'vehicle-picker'"
 *   (selectionChange)="onSelectionChange($event)">
 * </app-base-picker>
 *
 * <!-- Using direct config -->
 * <app-base-picker
 *   [config]="vehiclePickerConfig"
 *   (selectionChange)="onSelectionChange($event)">
 * </app-base-picker>
 * ```
 */
@Component({
    selector: 'app-base-picker',
    templateUrl: './base-picker.component.html',
    styleUrls: ['./base-picker.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BasePickerComponent<T> implements OnInit, OnDestroy, AfterViewInit {
  /**
   * Environment configuration for conditional test-id rendering
   */
  readonly environment: EnvironmentConfig;

  /**
   * Picker configuration ID (loads from PickerConfigRegistry). Either configId or config must be provided.
   */
  @Input() configId?: string;

  /**
   * Direct picker configuration object. Either configId or config must be provided.
   */
  @Input() config?: PickerConfig<T>;

  /**
   * Emits when the user selection changes in the picker table
   */
  @Output() selectionChange = new EventEmitter<PickerSelectionEvent<T>>();

  /**
   * Current picker state including loaded data, pagination, and selection
   */
  state: PickerState<T> = getDefaultPickerState();

  /**
   * Active picker configuration resolved from either configId or config input
   */
  activeConfig?: PickerConfig<T>;

  /**
   * RxJS Subject to signal component destruction and unsubscribe from observables
   */
  private destroy$ = new Subject<void>();

  constructor(
    private registry: PickerConfigRegistry,
    private urlState: UrlStateService,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef,
    @Optional() private resourceService?: ResourceManagementService<any, any, any>,
    @Optional() @Inject(ENVIRONMENT_CONFIG) envConfig?: EnvironmentConfig | null
  ) {
    this.environment = envConfig || { apiBaseUrl: '', production: false };
  }

  ngOnInit(): void {
    // Load configuration
    this.loadConfiguration();

    if (!this.activeConfig) {
      throw new Error(
        'BasePickerComponent requires either configId or config input'
      );
    }

    // Initialize state
    this.initializeState();

    // Subscribe to URL changes
    this.subscribeToUrlChanges();

    // Load initial data
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    // Initial sync of paginator width to table width
    this.syncPaginatorWidth();
  }

  /**
   * Sync paginator width to match table width
   * This ensures the paginator stays aligned with the table when columns are resized
   */
  private syncPaginatorWidth(): void {
    const nativeEl = this.elementRef.nativeElement;
    const table = nativeEl.querySelector('.p-datatable-table') as HTMLElement;
    const paginator = nativeEl.querySelector('.p-paginator') as HTMLElement;

    if (table && paginator) {
      const tableWidth = table.offsetWidth;
      paginator.style.width = `${tableWidth}px`;
    }
  }

  /**
   * Load configuration from registry or direct input
   */
  private loadConfiguration(): void {
    if (this.config) {
      this.activeConfig = this.config;
    } else if (this.configId) {
      this.activeConfig = this.registry.get<T>(this.configId);
    }
  }

  /**
   * Initialize picker state
   */
  private initializeState(): void {
    const pageSize = this.activeConfig!.pagination.defaultPageSize || 20;
    this.state = getDefaultPickerState<T>(pageSize);
  }

  /**
   * Subscribe to filter changes for selection hydration
   *
   * Architecture: Works in both main window and pop-out
   * - Main window: URL → ResourceManagementService.filters$ → picker hydration
   * - Pop-out: BroadcastChannel → ResourceManagementService.filters$ → picker hydration
   * - Single subscription works for both cases!
   */
  private subscribeToUrlChanges(): void {
    const urlParam = this.activeConfig!.selection.urlParam;

    // If ResourceManagementService is available, watch filters$ (works in both windows)
    if (this.resourceService) {
      this.resourceService.filters$
        .pipe(
          map(filters => {
            // Extract the relevant filter value for this picker
            // The urlParam might map to a filter field (e.g., 'modelCombos' → filters.modelCombos)
            return (filters as any)[urlParam] || null;
          }),
          distinctUntilChanged(),
          takeUntil(this.destroy$)
        )
        .subscribe(filterValue => {
          if (filterValue) {
            // Filter value is already in URL string format (e.g., "Ford:F-150,RAM:OEM Trailer")
            // No conversion needed - pass directly to hydration
            const urlValue = String(filterValue);
            this.hydrateFromUrl(urlValue);
          } else {
            // Clear selections if filter value is removed
            // Bug #7 fix: Use detectChanges() for pop-out windows where zone boundary
            // prevents markForCheck() from triggering UI update
            this.state.selectedKeys = new Set<string>();
            this.state.selectedItems = [];
            this.state.pendingHydration = [];
            this.state.data = [...this.state.data];
            this.cdr.detectChanges();
          }
        });
    } else {
      // Fallback: watch URL params directly (legacy mode)
      this.urlState
        .watchParam(urlParam)
        .pipe(takeUntil(this.destroy$))
        .subscribe(urlValue => {
          if (urlValue) {
            this.hydrateFromUrl(urlValue);
          } else {
            // Bug #7 fix: Use detectChanges() for pop-out windows
            this.state.selectedKeys = new Set<string>();
            this.state.selectedItems = [];
            this.state.pendingHydration = [];
            this.state.data = [...this.state.data];
            this.cdr.detectChanges();
          }
        });
    }
  }

  /**
   * Hydrate selections from URL parameter value
   */
  private hydrateFromUrl(urlValue: string): void {
    const config = this.activeConfig!;

    // Deserialize URL to partial items
    const partialItems = config.selection.deserializer(urlValue);

    // Generate keys from partial items
    const keyGenerator =
      config.selection.keyGenerator || config.row.keyGenerator;
    const keys = partialItems.map(item => keyGenerator(item as T));

    if (this.state.dataLoaded) {
      // Data already loaded, hydrate immediately
      this.hydrateSelections(keys);
    } else {
      // Data not loaded yet, store for pending hydration
      this.state.pendingHydration = keys;
    }

    this.cdr.markForCheck();
  }

  /**
   * Hydrate selections with loaded data
   *
   * Preserves selections from other pages during pagination.
   * When hydrating "A,B,C,D" but current page only has D:
   * - Searches current page for D (fresh data)
   * - Preserves A,B,C from cache (previous pages)
   * - Result: selectedItems = [A, B, C, D]
   */
  private hydrateSelections(keys: string[]): void {
    const config = this.activeConfig!;

    // Update selectedKeys with all keys from URL
    this.state.selectedKeys = new Set<string>(keys);

    // Build a map of existing selected items by key (to preserve items not on current page)
    const existingItemsByKey = new Map<string, T>();
    this.state.selectedItems.forEach(item => {
      const key = config.row.keyGenerator(item);
      existingItemsByKey.set(key, item);
    });

    // Build new selectedItems array
    const newSelectedItems: T[] = [];
    keys.forEach(key => {
      // First try to find in current page data
      const itemInCurrentPage = this.state.data.find(
        row => config.row.keyGenerator(row) === key
      );

      if (itemInCurrentPage) {
        // Item is on current page, use fresh data
        newSelectedItems.push(itemInCurrentPage);
      } else if (existingItemsByKey.has(key)) {
        // Item not on current page, but we have it cached from previous page
        newSelectedItems.push(existingItemsByKey.get(key)!);
      }
      // else: Key exists in URL but we don't have the item data
      // Keep in selectedKeys but not in selectedItems
    });

    this.state.selectedItems = newSelectedItems;
    this.cdr.markForCheck();
  }

  /**
   * Load data from API
   */
  private loadData(): void {
    const config = this.activeConfig!;
    this.state.loading = true;
    this.state.error = null;
    this.cdr.markForCheck();

    const params: PickerApiParams = {
      page: this.state.currentPage,
      size: this.state.pageSize,
      search: this.state.searchTerm || undefined,
      sortField: this.state.sortField,
      sortOrder: this.state.sortOrder
    };

    // Apply param mapper if provided
    const apiParams = config.api.paramMapper
      ? config.api.paramMapper(params)
      : params;

    config.api
      .fetchData(apiParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          const transformed = config.api.responseTransformer(response);

          this.state.data = transformed.results;
          this.state.totalCount = transformed.total;
          this.state.loading = false;
          this.state.dataLoaded = true;

          // Hydrate pending selections
          if (this.state.pendingHydration.length > 0) {
            this.hydrateSelections(this.state.pendingHydration);
            this.state.pendingHydration = [];
          }

          this.cdr.markForCheck();
        },
        error: error => {
          this.state.loading = false;
          this.state.error = error;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Handle row selection change
   */
  onRowSelectionChange(row: T, checked: boolean): void {
    const key = this.activeConfig!.row.keyGenerator(row);

    if (checked) {
      this.state.selectedKeys.add(key);
      this.state.selectedItems.push(row);
    } else {
      this.state.selectedKeys.delete(key);
      this.state.selectedItems = this.state.selectedItems.filter(
        item => this.activeConfig!.row.keyGenerator(item) !== key
      );
    }

    this.cdr.markForCheck();
    // Don't emit on every checkbox click - wait for "Apply" button
    // This prevents layout shifts from Query Control expanding with Active Filters
  }

  /**
   * Handle "select all" checkbox
   */
  onSelectAll(checked: boolean): void {
    if (checked) {
      // Add all visible rows to selection
      this.state.data.forEach(row => {
        const key = this.activeConfig!.row.keyGenerator(row);
        if (!this.state.selectedKeys.has(key)) {
          this.state.selectedKeys.add(key);
          this.state.selectedItems.push(row);
        }
      });
    } else {
      // Remove all visible rows from selection
      this.state.data.forEach(row => {
        const key = this.activeConfig!.row.keyGenerator(row);
        this.state.selectedKeys.delete(key);
      });

      // Update selectedItems
      this.state.selectedItems = this.state.selectedItems.filter(item => {
        const key = this.activeConfig!.row.keyGenerator(item);
        return this.state.selectedKeys.has(key);
      });
    }

    this.cdr.markForCheck();
    // Don't emit on every checkbox click - wait for "Apply" button
    // This prevents layout shifts from Query Control expanding with Active Filters
  }

  /**
   * Handle lazy load event (pagination + sorting combined)
   * PrimeNG fires this instead of separate onPage/onSort when [lazy]="true"
   */
  onLazyLoad(event: any): void {
    // Ignore lazy load events while already loading to prevent race conditions
    if (this.state.loading) {
      console.debug('[BasePickerComponent] Ignoring lazy load while loading', event);
      return;
    }

    // Update pagination state
    this.state.currentPage = event.first / event.rows;
    this.state.pageSize = event.rows;

    // Update sort state
    this.state.sortField = event.sortField || undefined;
    this.state.sortOrder = event.sortOrder || 1;

    this.loadData();
  }

  /**
   * Handle pagination change (for non-lazy mode)
   */
  onPageChange(event: any): void {
    // Ignore page changes while loading to prevent race conditions
    // (e.g., hydration updating selectedItems might trigger PrimeNG pagination event)
    if (this.state.loading) {
      console.debug('[BasePickerComponent] Ignoring page change while loading', event);
      return;
    }

    this.state.currentPage = event.first / event.rows;
    this.state.pageSize = event.rows;

    // Only reload data for server-side pagination
    // For client-side, PrimeNG handles pagination internally
    if (this.activeConfig?.pagination.mode === 'server') {
      this.loadData();
    }
  }

  /**
   * Handle search input
   */
  onSearch(term: string): void {
    this.state.searchTerm = term;
    this.state.currentPage = 0; // Reset to first page
    this.loadData();
  }

  /**
   * Handle sort change (for non-lazy mode)
   */
  onSort(event: any): void {
    this.state.sortField = event.sortField;
    this.state.sortOrder = event.sortOrder;
    this.loadData();
  }

  /**
   * Check if row is selected
   */
  isRowSelected(row: T): boolean {
    const key = this.activeConfig!.row.keyGenerator(row);
    return this.state.selectedKeys.has(key);
  }

  /**
   * Check if all visible rows are selected
   */
  get allVisibleSelected(): boolean {
    if (this.state.data.length === 0) {
      return false;
    }

    return this.state.data.every(row => this.isRowSelected(row));
  }

  /**
   * Emit selection change event
   */
  private emitSelectionChange(): void {
    const config = this.activeConfig!;
    const urlValue = config.selection.serializer(this.state.selectedItems);

    const event: PickerSelectionEvent<T> = {
      pickerId: config.id,
      selections: this.state.selectedItems,
      selectedKeys: Array.from(this.state.selectedKeys),
      urlValue
    };

    this.selectionChange.emit(event);
  }

  /**
   * Apply selections (emit event for parent to handle)
   */
  applySelections(): void {
    // Emit selection change event - parent will handle URL update
    this.emitSelectionChange();
  }

  /**
   * Clear all selections
   */
  clearSelections(): void {
    this.state.selectedKeys = new Set<string>();
    this.state.selectedItems = [];
    this.state.data = [...this.state.data];
    this.cdr.markForCheck();
    this.emitSelectionChange();
  }

  /**
   * Convert field key to string for PrimeNG bindings
   *
   * PrimeNG expects string field names, but TypeScript's keyof T
   * can be string | number | symbol. This helper ensures proper type.
   */
  fieldToString(field: keyof T): string {
    return String(field);
  }
}
