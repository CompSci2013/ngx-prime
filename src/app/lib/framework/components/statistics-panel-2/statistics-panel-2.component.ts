/**
 * Statistics Panel 2 Component - CDK Mixed Orientation Chart Grid
 *
 * Domain-agnostic container for rendering statistical charts in a
 * draggable grid layout using CDK mixed orientation.
 *
 * Framework Component
 */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  Output
} from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ENVIRONMENT_CONFIG, EnvironmentConfig } from '../../../config/tokens/environment.token';
import { ChartConfig, DomainConfig } from '../../../config/models/domain-config.interface';
import { ResourceManagementService } from '../../../state-management/services/resource-management.service';
import { UrlStateService } from '../../../state-management/services/url-state.service';
import { ChartDataSource, BaseChartComponent } from '../base-chart/base-chart.component';


/**
 * Statistics Panel 2 Component
 *
 * Renders statistical charts in a CDK mixed orientation drag-drop grid.
 * Charts can be reordered by dragging.
 *
 * @example
 * ```html
 * <app-statistics-panel-2
 *   [domainConfig]="domainConfig"
 *   (chartPopOut)="onChartPopOut($event)"
 *   (chartClick)="onChartClick($event)">
 * </app-statistics-panel-2>
 * ```
 */
@Component({
    selector: 'app-statistics-panel-2',
    templateUrl: './statistics-panel-2.component.html',
    styleUrls: ['./statistics-panel-2.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatisticsPanel2Component implements OnInit, OnDestroy {

  private readonly destroy$ = new Subject<void>();

  // ============================================================================
  // Configuration
  // ============================================================================

  readonly environment: EnvironmentConfig;

  @Input() domainConfig!: DomainConfig<any, any, any>;

  /**
   * Function to check if a chart is popped out
   * Provided by parent component (DiscoverComponent)
   */
  @Input() isPanelPoppedOut: (panelId: string) => boolean = () => false;

  // ============================================================================
  // Outputs
  // ============================================================================

  @Output() chartPopOut = new EventEmitter<string>();
  @Output() chartClicked = new EventEmitter<{ event: { value: string; isHighlightMode: boolean }; dataSource: ChartDataSource }>();

  // ============================================================================
  // State Getters (from ResourceManagementService)
  // ============================================================================

  get statistics(): any | undefined {
    return this.resourceService.statistics;
  }

  get highlights(): any {
    return this.resourceService.highlights;
  }

  // ============================================================================
  // Component-Local State
  // ============================================================================

  /**
   * Ordered list of chart IDs for the grid
   */
  chartOrder: string[] = [];

  constructor(
    private resourceService: ResourceManagementService<any, any, any>,
    private urlState: UrlStateService,
    private cdr: ChangeDetectorRef,
    @Optional() @Inject(ENVIRONMENT_CONFIG) envConfig: EnvironmentConfig | null
  ) {
    this.environment = envConfig || { apiBaseUrl: '', production: false };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    if (!this.domainConfig) {
      console.error('StatisticsPanel2Component: domainConfig is required');
      return;
    }

    // Initialize chart order from domain config
    if (this.domainConfig.chartDataSources) {
      this.chartOrder = Object.keys(this.domainConfig.chartDataSources);
    }

    // Subscribe to statistics changes to trigger change detection
    this.resourceService.statistics$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cdr.markForCheck();
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
   * Handle chart drag-drop to reorder
   */
  onChartDrop(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.chartOrder, event.previousIndex, event.currentIndex);
    this.cdr.markForCheck();
  }

  /**
   * Handle chart pop-out request
   */
  onChartPopOut(chartId: string): void {
    this.chartPopOut.emit(chartId);
  }

  /**
   * Handle chart click
   */
  onChartClick(event: { value: string; isHighlightMode: boolean }, chartId: string): void {
    const dataSource = this.domainConfig.chartDataSources?.[chartId];
    if (!dataSource) return;

    // Delegate URL param generation to the data source
    const newParams = dataSource.toUrlParams(event.value, event.isHighlightMode);

    // Update URL state directly
    this.urlState.setParams(newParams);
  }

  /**
   * Get data source for a chart ID
   */
  getDataSource(chartId: string): ChartDataSource | undefined {
    return this.domainConfig.chartDataSources?.[chartId];
  }
}
