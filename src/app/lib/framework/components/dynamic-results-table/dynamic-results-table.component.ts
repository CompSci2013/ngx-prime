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
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ENVIRONMENT_CONFIG, EnvironmentConfig } from '../../../config/tokens/environment.token';
import { DomainConfig } from '../../../config/models/domain-config.interface';
import { ResourceManagementService } from '../../../state-management/services/resource-management.service';

/**
 * Dynamic Results Table Component
 *
 * Enhanced table component with drag-drop column reordering and resizable column widths.
 * Based on BasicResultsTableComponent but adds interactive column manipulation.
 *
 * **Features**:
 * - Drag-drop column reordering (PrimeNG reorderableColumns)
 * - Resizable column widths by dragging borders (PrimeNG resizableColumns)
 * - Pagination with lazy loading
 * - Sortable columns
 * - Row expansion support
 *
 * **Fix from golden-extension**:
 * Uses Observable streams (results$, loading$, totalResults$) with async pipe
 * instead of synchronous getters. This is required for OnPush change detection
 * to properly react to state changes from ResourceManagementService.
 *
 * @template TFilters - Domain-specific filter model type
 * @template TData - Domain-specific data model type
 * @template TStatistics - Domain-specific statistics model type
 */
@Component({
  selector: 'app-dynamic-results-table',
  templateUrl: './dynamic-results-table.component.html',
  styleUrls: ['./dynamic-results-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DynamicResultsTableComponent<TFilters = any, TData = any, TStatistics = any>
  implements OnInit, AfterViewInit, OnDestroy {

  private readonly destroy$ = new Subject<void>();

  readonly environment: EnvironmentConfig;

  @Input() domainConfig!: DomainConfig<TFilters, TData, TStatistics>;

  /**
   * Emits when URL parameters should be updated (sort, page, size)
   */
  @Output() urlParamsChange = new EventEmitter<{ [key: string]: any }>();

  // ============================================================================
  // Observable Streams (from ResourceManagementService)
  // These are used with async pipe in the template for OnPush change detection
  // ============================================================================

  get filters$(): Observable<TFilters> {
    return this.resourceService.filters$;
  }

  get results$(): Observable<TData[]> {
    return this.resourceService.results$;
  }

  get totalResults$(): Observable<number> {
    return this.resourceService.totalResults$;
  }

  get loading$(): Observable<boolean> {
    return this.resourceService.loading$;
  }

  // ============================================================================
  // Component-Local State
  // ============================================================================

  expandedRows: { [key: string]: boolean } = {};
  Object = Object;

  /**
   * Current column order - initialized from domainConfig, can be reordered by user
   */
  columns: any[] = [];

  /**
   * VIN data cache - stores fetched VINs by vehicle_id
   */
  vinCache: { [vehicleId: string]: any[] } = {};

  /**
   * VIN loading state - tracks which vehicles are currently loading VINs
   */
  vinLoading: { [vehicleId: string]: boolean } = {};

  /**
   * VIN columns for the sub-table
   */
  vinColumns = [
    { field: 'vin', header: 'VIN', width: '180px' },
    { field: 'exterior_color', header: 'Color', width: '100px' },
    { field: 'mileage', header: 'Mileage', width: '100px' },
    { field: 'condition_description', header: 'Condition', width: '100px' },
    { field: 'estimated_value', header: 'Est. Value', width: '100px' },
    { field: 'registered_state', header: 'State', width: '80px' },
    { field: 'title_status', header: 'Title', width: '100px' }
  ];

  // ============================================================================
  // Computed Properties
  // ============================================================================

  get paginatorFirst(): number {
    const filters = this.resourceService.getCurrentFilters() as Record<string, any>;
    const page = filters['page'] || 1;
    const size = filters['size'] || 20;
    return (page - 1) * size;
  }

  get currentFilters(): Record<string, any> {
    return this.resourceService.getCurrentFilters() as Record<string, any>;
  }

  // ============================================================================
  // Template Helpers
  // ============================================================================

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  trackByField(index: number, col: any): string {
    return col.field;
  }

  constructor(
    private resourceService: ResourceManagementService<TFilters, TData, TStatistics>,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef,
    private http: HttpClient,
    @Optional() @Inject(ENVIRONMENT_CONFIG) envConfig: EnvironmentConfig | null
  ) {
    this.environment = envConfig || { apiBaseUrl: '', production: false };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    if (!this.domainConfig) {
      throw new Error('DynamicResultsTableComponent requires domainConfig input');
    }

    // Initialize columns from domain config
    this.columns = [...this.domainConfig.tableConfig.columns];
  }

  ngAfterViewInit(): void {
    // Initial sync of paginator width to table width
    this.syncPaginatorWidth();

    // Sync paginator width whenever results change (table might resize)
    this.results$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.syncPaginatorWidth();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle pagination events from PrimeNG Table
   */
  onPageChange(event: any): void {
    const page = event.first / event.rows + 1;
    const size = event.rows;

    const currentFilters = this.resourceService.getCurrentFilters() as Record<string, any>;
    const newFilters = {
      ...currentFilters,
      page,
      size
    } as unknown as TFilters;
    this.resourceService.updateFilters(newFilters);
  }

  /**
   * Handle sort events from PrimeNG Table
   */
  onSort(event: any): void {
    const sort = event.field;
    const sortDirection = event.order === 1 ? 'asc' : 'desc';

    const currentFilters = this.resourceService.getCurrentFilters() as Record<string, any>;
    const newFilters = {
      ...currentFilters,
      sort,
      sortDirection
    } as unknown as TFilters;
    this.resourceService.updateFilters(newFilters);
  }

  /**
   * Handle column reorder events from PrimeNG Table
   */
  onColReorder(event: any): void {
    // event.columns contains the new column order
    // Could persist this to user preferences in the future
    this.columns = event.columns;
  }

  /**
   * Handle column resize events from PrimeNG Table
   */
  onColResize(event: any): void {
    // event.element is the resized column header
    // event.delta is the width change in pixels
    // Sync paginator width to match table width after resize
    this.syncPaginatorWidth();
    // Could persist column widths to user preferences in the future
  }

  /**
   * Handle row expansion toggle - fetch VINs when expanded
   */
  onRowExpand(event: { data: any }): void {
    const row = event.data;
    const vehicleId = row.vehicle_id;

    if (!vehicleId) {
      return;
    }

    // Skip if already cached
    if (this.vinCache[vehicleId]) {
      return;
    }

    // Fetch VINs from API
    this.vinLoading[vehicleId] = true;
    this.cdr.markForCheck();

    const url = `${this.environment.apiBaseUrl}/vehicles/${encodeURIComponent(vehicleId)}/vins?size=100`;

    this.http.get<any>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.vinCache[vehicleId] = response.results || [];
          this.vinLoading[vehicleId] = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error fetching VINs:', err);
          this.vinCache[vehicleId] = [];
          this.vinLoading[vehicleId] = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Get VINs for a vehicle (from cache)
   */
  getVinsForVehicle(vehicleId: string): any[] {
    return this.vinCache[vehicleId] || [];
  }

  /**
   * Check if VINs are loading for a vehicle
   */
  isVinLoading(vehicleId: string): boolean {
    return this.vinLoading[vehicleId] || false;
  }

  /**
   * Sync paginator width to match table width
   * This ensures the paginator stays aligned with the table when columns are resized
   */
  private syncPaginatorWidth(): void {
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      const nativeEl = this.elementRef.nativeElement;
      const table = nativeEl.querySelector('.p-datatable-table') as HTMLElement;
      const paginator = nativeEl.querySelector('.p-paginator') as HTMLElement;

      if (table && paginator) {
        const tableWidth = table.offsetWidth;
        paginator.style.minWidth = `${tableWidth}px`;
      }
    });
  }

  /**
   * Refresh data
   */
  refresh(): void {
    this.resourceService.refresh();
  }
}
