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
import { ENVIRONMENT_CONFIG, EnvironmentConfig } from '../../../config/tokens/environment.token';
import { DomainConfig } from '../../../config/models/domain-config.interface';
import { ResourceManagementService } from '../../../state-management/services/resource-management.service';

/**
 * Basic Results Table Component - Angular 14 Architecture
 *
 * Pure display component for showing tabular data with pagination and sorting.
 * Uses RxJS BehaviorSubjects for reactive state management.
 *
 * @template TFilters - Domain-specific filter model type
 * @template TData - Domain-specific data model type
 * @template TStatistics - Domain-specific statistics model type
 */
@Component({
    selector: 'app-basic-results-table',
    templateUrl: './basic-results-table.component.html',
    styleUrls: ['./basic-results-table.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BasicResultsTableComponent<TFilters = any, TData = any, TStatistics = any>
  implements OnInit, AfterViewInit, OnDestroy {

  private readonly destroy$ = new Subject<void>();

  readonly environment: EnvironmentConfig;

  @Input() domainConfig!: DomainConfig<TFilters, TData, TStatistics>;

  /**
   * Emits when URL parameters should be updated (sort, page, size)
   */
  @Output() urlParamsChange = new EventEmitter<{ [key: string]: any }>();

  // ============================================================================
  // State Getters (from ResourceManagementService)
  // ============================================================================

  get filters(): TFilters {
    return this.resourceService.filters;
  }

  get results(): TData[] {
    return this.resourceService.results;
  }

  get totalResults(): number {
    return this.resourceService.totalResults;
  }

  get loading(): boolean {
    return this.resourceService.loading;
  }

  // ============================================================================
  // Component-Local State
  // ============================================================================

  expandedRows: { [key: string]: boolean } = {};
  Object = Object;

  // ============================================================================
  // Computed Properties
  // ============================================================================

  get paginatorFirst(): number {
    const filters = this.filters as Record<string, any>;
    const page = filters['page'] || 1;
    const size = filters['size'] || 20;
    return (page - 1) * size;
  }

  get currentFilters(): Record<string, any> {
    return this.filters as Record<string, any>;
  }

  constructor(
    private resourceService: ResourceManagementService<TFilters, TData, TStatistics>,
    private cdr: ChangeDetectorRef,
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
      throw new Error('BasicResultsTableComponent requires domainConfig input');
    }
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

    const currentFilters = this.filters as Record<string, any>;
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

    const currentFilters = this.filters as Record<string, any>;
    const newFilters = {
      ...currentFilters,
      sort,
      sortDirection
    } as unknown as TFilters;
    this.resourceService.updateFilters(newFilters);
  }

  /**
   * Refresh data
   */
  refresh(): void {
    this.resourceService.refresh();
  }

  // ============================================================================
  // Lifecycle - AfterViewInit
  // ============================================================================

  ngAfterViewInit(): void {
    // Initial sync of paginator width to table width
    this.syncPaginatorWidth();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

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
}
