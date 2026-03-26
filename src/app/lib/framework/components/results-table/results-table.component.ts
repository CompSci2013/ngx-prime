import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Optional
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ENVIRONMENT_CONFIG, EnvironmentConfig } from '../../../config/tokens/environment.token';
import { DomainConfig, TableFilterOption } from '../../../config/models/domain-config.interface';
import { ResourceManagementService } from '../../../state-management/services/resource-management.service';

/**
 * Results Table Component - Angular 14 Architecture
 *
 * Configuration-driven data table with integrated filtering.
 * Uses RxJS BehaviorSubjects for reactive state management.
 *
 * @template TFilters - Domain-specific filter model type
 * @template TData - Domain-specific data model type
 * @template TStatistics - Domain-specific statistics model type
 */
@Component({
    selector: 'app-results-table',
    templateUrl: './results-table.component.html',
    styleUrls: ['./results-table.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultsTableComponent<TFilters = any, TData = any, TStatistics = any>
  implements OnInit, AfterViewInit, OnDestroy {

  private readonly destroy$ = new Subject<void>();

  /**
   * Environment configuration for conditional test-id rendering
   */
  readonly environment: EnvironmentConfig;

  /**
   * Domain configuration (required input)
   */
  @Input() domainConfig!: DomainConfig<TFilters, TData, TStatistics>;

  // ============================================================================
  // State Getters (from ResourceManagementService)
  // ============================================================================

  /**
   * Get current filters
   */
  get filters(): TFilters {
    return this.resourceService.filters;
  }

  /**
   * Get table data results
   */
  get results(): TData[] {
    return this.resourceService.results;
  }

  /**
   * Get total results count
   */
  get totalResults(): number {
    return this.resourceService.totalResults;
  }

  /**
   * Get loading state
   */
  get loading(): boolean {
    return this.resourceService.loading;
  }

  /**
   * Get error state
   */
  get error(): Error | null {
    return this.resourceService.error;
  }

  /**
   * Get statistics data
   */
  get statistics(): TStatistics | undefined {
    return this.resourceService.statistics;
  }

  // ============================================================================
  // Component-Local State
  // ============================================================================

  /**
   * Map of expanded row IDs for collapsible row details
   */
  expandedRows: { [key: string]: boolean } = {};

  /**
   * Whether the filter panel is currently collapsed
   */
  filterPanelCollapsed = false;

  /**
   * Dynamically loaded filter options from API endpoints
   */
  dynamicOptions: Record<string, TableFilterOption[]> = {};

  /**
   * Object reference for template use
   */
  Object = Object;

  // ============================================================================
  // Computed Properties
  // ============================================================================

  /**
   * Calculate the first index for the paginator
   */
  get paginatorFirst(): number {
    const filters = this.filters as Record<string, any>;
    const page = filters['page'] || 1;
    const size = filters['size'] || 20;
    return (page - 1) * size;
  }

  /**
   * Get current filters as Record for template access
   */
  get currentFilters(): Record<string, any> {
    return this.filters as Record<string, any>;
  }

  constructor(
    private resourceService: ResourceManagementService<TFilters, TData, TStatistics>,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private elementRef: ElementRef,
    @Optional() @Inject(ENVIRONMENT_CONFIG) envConfig: EnvironmentConfig | null
  ) {
    this.environment = envConfig || { apiBaseUrl: '', production: false };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    if (!this.domainConfig) {
      throw new Error('ResultsTableComponent requires domainConfig input');
    }

    // Load dynamic options for filters with optionsEndpoint
    this.loadDynamicFilterOptions();
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
    const currentFilters = this.filters as Record<string, any>;
    const newFilters = {
      ...currentFilters,
      page: event.first / event.rows + 1,
      size: event.rows
    } as unknown as TFilters;
    this.resourceService.updateFilters(newFilters);
  }

  /**
   * Handle sort events from PrimeNG Table
   */
  onSort(event: any): void {
    const currentFilters = this.filters as Record<string, any>;
    const newFilters = {
      ...currentFilters,
      sort: event.field,
      sortDirection: event.order === 1 ? 'asc' as const : 'desc' as const
    } as unknown as TFilters;
    this.resourceService.updateFilters(newFilters);
  }

  /**
   * Handle filter input changes
   */
  onFilterChange(field: string, value: any): void {
    const currentFilters = this.filters as Record<string, any>;
    const newFilters: Record<string, any> = {
      ...currentFilters,
      page: 1 // Reset to first page on filter change
    };

    const isEmpty = value === null ||
                    value === undefined ||
                    value === '' ||
                    (Array.isArray(value) && value.length === 0);

    if (isEmpty) {
      newFilters[field] = undefined;
    } else {
      newFilters[field] = value;
    }

    this.resourceService.updateFilters(newFilters as unknown as TFilters);
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    const currentFilters = this.filters as Record<string, any>;
    this.resourceService.updateFilters({
      page: 1,
      size: currentFilters['size'] || 20
    } as unknown as TFilters);
  }

  /**
   * Toggle filter panel collapse state
   */
  toggleFilterPanel(): void {
    this.filterPanelCollapsed = !this.filterPanelCollapsed;
    this.cdr.markForCheck();
  }

  /**
   * Refresh data
   */
  refresh(): void {
    this.resourceService.refresh();
  }

  /**
   * Get options for a filter
   */
  getFilterOptions(filterId: string): TableFilterOption[] {
    if (this.dynamicOptions[filterId]) {
      return this.dynamicOptions[filterId];
    }

    const filterDef = this.domainConfig.filters.find(f => f.id === filterId);
    return filterDef?.options || [];
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Load dynamic options for filters that specify an optionsEndpoint
   */
  private loadDynamicFilterOptions(): void {
    const filtersWithEndpoint = this.domainConfig.filters.filter(f => f.optionsEndpoint);

    filtersWithEndpoint.forEach(filterDef => {
      const endpoint = `${this.domainConfig.apiBaseUrl}/agg/${filterDef.optionsEndpoint}`;

      this.http.get<{ field: string; values: Array<{ value: string; count: number }> }>(endpoint)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.dynamicOptions[filterDef.id] = response.values.map(item => ({
              value: item.value,
              label: item.value
            }));
            this.cdr.markForCheck();
          },
          error: (err) => {
            console.error(`Failed to load options for ${filterDef.id}:`, err);
          }
        });
    });
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

  // ============================================================================
  // Lifecycle - AfterViewInit
  // ============================================================================

  ngAfterViewInit(): void {
    // Initial sync of paginator width to table width
    this.syncPaginatorWidth();
  }
}
