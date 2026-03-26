/**
 * Base Chart Component
 *
 * Generic Plotly.js chart container with data source pattern.
 * Domain-agnostic component that renders charts based on ChartDataSource transformations.
 *
 * Framework Component
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  AfterViewInit,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  HostListener,
  Optional,
  Inject
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PopOutContextService } from '../../../popout/popout-context.service';
import { ResourceManagementService } from '../../../state-management/services/resource-management.service';


/**
 * Plotly.js graph visualization library
 *
 * Open-source data visualization library for JavaScript.
 * Provides declarative charting for creating statistical charts with support for
 * interactive features like click events, box selection, lasso selection, and hover tooltips.
 *
 * @remarks
 * Using plotly.js-dist-min (minified distribution) for reduced bundle size.
 * Used in BaseChartComponent for rendering reactive charts based on statistics data.
 *
 * Features:
 * - Multiple chart types (scatter, bar, line, histogram, etc.)
 * - Interactive features (zoom, pan, box select, lasso select)
 * - Event handling (plotly_click, plotly_selected, plotly_hover)
 * - Responsive resizing
 * - Export to PNG
 *
 * @see {@link https://plotly.com/javascript/} Official Plotly.js documentation
 * @see BaseChartComponent - Component that uses Plotly
 */
import * as Plotly from 'plotly.js-dist-min';

/**
 * Extended HTMLElement interface for Plotly charts
 *
 * Extends HTMLElement with Plotly-specific methods and properties required
 * for chart event handling and data access after a chart has been rendered
 * by Plotly.newPlot() or Plotly.react().
 *
 * @interface PlotlyHTMLElement
 * @extends HTMLElement
 * @property {Function} on - Attach event listener to Plotly chart
 * @property {any[]} [data] - Array of Plotly data traces (read-only after render)
 * @property {any} [layout] - Plotly layout configuration object (read-only after render)
 *
 * @remarks
 * **Event Listeners**:
 * - 'plotly_click': User clicks on a data point
 * - 'plotly_selected': User completes a box or lasso selection
 * - 'plotly_hover': User hovers over a data point
 * - 'plotly_unhover': User moves mouse away from data point
 *
 * **Data Access**:
 * After Plotly.newPlot() or Plotly.react() completes, the element becomes a
 * PlotlyHTMLElement and you can read its data and layout properties to inspect
 * the rendered chart's configuration.
 *
 * @example
 * ```typescript
 * Plotly.newPlot(element, traces, layout).then((gd: PlotlyHTMLElement) => {
 *   // gd is now a PlotlyHTMLElement with data, layout, and on() method
 *   gd.on('plotly_click', (data) => {
 *     console.log('Clicked:', data.points[0]);
 *   });
 *   console.log('Chart traces:', gd.data);
 * });
 * ```
 *
 * @see Plotly - The library that creates these elements
 * @see BaseChartComponent.attachEventHandlers - Example usage
 */
interface PlotlyHTMLElement extends HTMLElement {
  /**
   * Attach event listener to Plotly chart (supports 'plotly_click', 'plotly_selected', 'plotly_hover', etc.)
   */
  on(event: string, callback: (data: any) => void): void;

  /**
   * Array of Plotly data traces (read-only after render)
   */
  data?: any[];

  /**
   * Plotly layout configuration object (read-only after render)
   */
  layout?: any;
}

/**
 * Chart data structure for Plotly.js
 */
export interface ChartData {
  /**
   * Array of Plotly data traces (each trace represents a data series or element)
   */
  traces: any[];

  /**
   * Plotly layout configuration object controlling chart appearance, axes, titles, etc.
   */
  layout: Partial<any>;

  /**
   * Optional click event data from the last chart interaction
   */
  clickData?: any;
}

/**
 * Abstract chart data source
 *
 * Transforms domain statistics into Plotly-ready chart data.
 * Implemented by domain-specific chart sources.
 *
 * @template TStatistics - Domain-specific statistics type
 */
export abstract class ChartDataSource<TStatistics = any> {
  /**
   * Transform statistics into chart data
   *
   * @param statistics - Domain statistics
   * @param highlights - Highlight filters (optional)
   * @param selectedValue - Currently selected value (optional)
   * @param containerWidth - Container width for responsive sizing
   * @returns Chart data or null if no data available
   */
  abstract transform(
    statistics: TStatistics | null,
    highlights: any,
    selectedValue: string | null,
    containerWidth: number
  ): ChartData | null;

  /**
   * Get chart title
   */
  abstract getTitle(): string;

  /**
   * Handle chart click event
   *
   * @param event - Plotly click event
   * @returns Clicked value or null
   */
  abstract handleClick(event: any): string | null;

  /**
   * Convert clicked value to URL parameters
   *
   * Maps the chart's clicked value to the appropriate URL query parameters.
   * Handles both filter mode (regular params) and highlight mode (h_* params).
   *
   * @param value - The clicked value from handleClick()
   * @param isHighlightMode - Whether highlight mode is active (h key held)
   * @returns URL parameters object to merge into the query string
   *
   * @example
   * // ManufacturerChartDataSource
   * toUrlParams('Toyota', false) // { manufacturer: 'Toyota' }
   * toUrlParams('Toyota', true)  // { h_manufacturer: 'Toyota' }
   *
   * // YearChartDataSource (range selection)
   * toUrlParams('1990|2000', false) // { yearMin: '1990', yearMax: '2000' }
   */
  abstract toUrlParams(value: string, isHighlightMode: boolean): Record<string, any>;
}

/**
 * Base Chart Component
 *
 * Reusable Plotly.js chart container.
 * Works with any ChartDataSource implementation.
 *
 * @example
 * ```html
 * <app-base-chart
 *   [dataSource]="manufacturerChartSource"
 *   [statistics]="statistics$ | async"
 *   [highlights]="highlights"
 *   [selectedValue]="selectedManufacturer"
 *   (chartClick)="onChartClick($event)">
 * </app-base-chart>
 * ```
 */
@Component({
    selector: 'app-base-chart',
    templateUrl: './base-chart.component.html',
    styleUrls: ['./base-chart.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BaseChartComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  /**
   * Reference to the chart container HTML div element where Plotly chart is rendered
   */
  @ViewChild('chartContainer', { static: false })
  chartContainer!: ElementRef<HTMLDivElement>;

  /**
   * Chart data source implementation (required input) that transforms statistics into Plotly-ready data
   */
  @Input() dataSource!: ChartDataSource;

  /**
   * Statistics data to be visualized by the chart via the dataSource
   */
  @Input() statistics: any | null = null;

  /**
   * Highlight filters applied to the data for filtering or emphasis in the visualization
   */
  @Input() highlights: any = {};

  /**
   * Currently selected value to be highlighted or emphasized in the chart
   */
  @Input() selectedValue: string | null = null;

  /**
   * Whether to hide the chart title (useful when embedding in containers with their own headers)
   */
  @Input() hideTitle = false;

  /**
   * Whether to show pop-out button in the mode bar
   */
  @Input() canPopOut = false;

  /**
   * Emits when user clicks on a data point or completes a selection (box/lasso) in the chart
   */
  @Output() chartClick = new EventEmitter<{
    value: string;
    isHighlightMode: boolean;
  }>();

  /**
   * Emits when user clicks the pop-out button in the mode bar
   */
  @Output() popOutClick = new EventEmitter<void>();

  /**
   * Flag indicating whether highlight mode is currently active (toggled by 'h' key)
   */
  isHighlightModeActive = false;

  /**
   * Chart title obtained from the data source, displayed at the top of the chart
   */
  chartTitle = '';

  /**
   * Error boundary state flag indicating whether an error occurred during chart rendering
   */
  hasError = false;

  /**
   * User-friendly error message displayed when chart rendering fails
   */
  errorMessage = '';

  /**
   * RxJS Subject to signal component destruction and cleanup of subscriptions
   */
  private destroy$ = new Subject<void>();

  /**
   * Reference to the rendered Plotly chart element after Plotly.newPlot() completes
   */
  private plotlyElement: PlotlyHTMLElement | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    @Optional() @Inject(PopOutContextService) private popOutContext: PopOutContextService | null,
    @Optional() private resourceService: ResourceManagementService<any, any, any> | null
  ) {}

  /**
   * Angular lifecycle hook - Component initialization
   *
   * Called once when the component is created. Validates that required inputs
   * are provided and initializes chart title from data source.
   *
   * @lifecycle
   * Executes: After constructor, before ngAfterViewInit
   * Change Detection: Safe to trigger
   * DOM Access: Not yet available
   *
   * @remarks
   * **Validation**:
   * - Logs error to console if dataSource is not provided
   * - BaseChartComponent requires a ChartDataSource instance
   *
   * **Initialization**:
   * - Sets chartTitle from dataSource.getTitle()
   * - Falls back to 'Chart' if dataSource is not available
   */
  ngOnInit(): void {
    if (!this.dataSource) {
      console.error('BaseChartComponent: dataSource is required');
    }
    this.chartTitle = this.dataSource?.getTitle() || 'Chart';

    // In pop-out windows, subscribe to live state via shared DI context.
    // The portal inherits the host's ResourceManagementService, so statistics$
    // and highlights$ emit the same values as the main window.
    if (this.popOutContext && this.resourceService) {
      this.resourceService.statistics$
        .pipe(takeUntil(this.destroy$))
        .subscribe(stats => {
          this.statistics = stats ?? null;
          this.renderChart();
        });

      this.resourceService.highlights$
        .pipe(takeUntil(this.destroy$))
        .subscribe(h => {
          this.highlights = h;
          this.renderChart();
        });
    }
  }

  /**
   * Angular lifecycle hook - View initialization completion
   *
   * Called once after the component's view and child views are initialized.
   * This is where the Plotly chart is first rendered into the DOM.
   *
   * @lifecycle
   * Executes: After ngOnInit, after DOM is fully rendered
   * Change Detection: Can be triggered
   * DOM Access: ViewChild references now available
   *
   * @remarks
   * **Why Plotly is initialized here**:
   * - ViewChild chartContainer is now available
   * - DOM element is rendered and in the document
   * - Container dimensions (clientWidth) are determined
   * - Plotly needs actual DOM element and dimensions
   */
  ngAfterViewInit(): void {
    if (this.popOutContext) {
      // In a pop-out window: defer rendering until the environment is ready
      // (styles copied, event forwarding active, DOM stable).
      // Rendering before ready$ causes Plotly to bind to a stale document context.
      this.popOutContext.ready$
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.renderChart());
    } else {
      // Main window: render immediately
      this.renderChart();
    }
  }

  /**
   * Angular lifecycle hook - Component destruction cleanup
   *
   * Called once when the component is destroyed. Cleans up Plotly chart
   * and completes RxJS subjects to prevent memory leaks.
   *
   * @lifecycle
   * Executes: When component is removed from DOM
   * Change Detection: No longer triggered
   *
   * @remarks
   * **Cleanup Tasks**:
   * 1. Signal destroy$ subject to all subscribers
   * 2. Complete destroy$ subject (no more emissions)
   * 3. Purge Plotly chart from DOM (if it exists)
   *
   * **Memory Leak Prevention**:
   * - Destroy$ subject stops RxJS subscriptions
   * - Plotly.purge() removes canvas and frees memory
   * - Without cleanup, multiple chart instances would accumulate
   *
   * @see destroy$ - RxJS subject used for cleanup
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up Plotly chart
    if (this.plotlyElement) {
      Plotly.purge(this.plotlyElement);
    }
  }

  /**
   * Angular lifecycle hook - Input change detection
   *
   * Called when any @Input property changes. If a Plotly chart is already
   * rendered, the chart is updated with the new data.
   *
   * @lifecycle
   * Executes: When any @Input property changes (after ngOnInit)
   * Timing: Before change detection runs
   *
   * @remarks
   * **Triggered by changes to**:
   * - @Input() statistics - New statistics data
   * - @Input() highlights - Updated highlight filters
   * - @Input() selectedValue - Different selection
   *
   * **Behavior**:
   * - Only rerenders if Plotly chart is already initialized
   * - Skips render during initial component setup
   * - Called even if multiple inputs change at once
   *
   * @see statistics - Statistics data input
   * @see highlights - Highlight filters input
   * @see selectedValue - Selected value input
   */
  ngOnChanges(): void {
    // Render if we have the container (ngAfterViewInit has run)
    // This handles both initial render and updates
    if (this.chartContainer) {
      this.renderChart();
    }
  }

  /**
   * Handle window resize events
   *
   * HostListener for window:resize events that keeps Plotly chart
   * responsive to container dimension changes.
   *
   * @private (HostListener)
   * @remarks
   * **Why resize is needed**:
   * - When browser window resizes, Plotly must recalculate dimensions
   * - Without resize, chart may appear stretched or clipped
   *
   * **Double resize for pop-out windows**:
   * - First resize() call updates Plotly's internal state
   * - setTimeout with 100ms delay for browser rendering
   * - Second resize() call applies final dimensions
   * - Needed for pop-out/docking window scenarios
   *
   * @see onWindowResize - The implementation
   */
  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.plotlyElement) {
      Plotly.Plots.resize(this.plotlyElement);

      // Extra resize with delay for pop-out windows
      setTimeout(() => {
        if (this.plotlyElement) {
          Plotly.Plots.resize(this.plotlyElement);
        }
      }, 100);
    }
  }

  /**
   * Handle 'h' key down (enable highlight mode)
   */
  @HostListener('document:keydown.h')
  onHighlightKeyDown(): void {
    this.isHighlightModeActive = true;
    this.cdr.markForCheck();
  }

  /**
   * Handle 'h' key up (disable highlight mode)
   */
  @HostListener('document:keyup.h')
  onHighlightKeyUp(): void {
    this.isHighlightModeActive = false;
    this.cdr.markForCheck();
  }

  /**
   * Render Plotly chart with error boundary
   */
  private renderChart(): void {
    if (!this.chartContainer || !this.dataSource) {
      return;
    }

    try {
      // Clear any previous error state
      this.hasError = false;
      this.errorMessage = '';

      const element = this.chartContainer.nativeElement;
      const containerWidth = element.clientWidth;

      // Transform data using data source (can throw on malformed data)
      const chartData = this.dataSource.transform(
        this.statistics,
        this.highlights,
        this.selectedValue,
        containerWidth
      );

      if (!chartData) {
        // No data - clear chart
        if (this.plotlyElement) {
          Plotly.purge(this.plotlyElement);
          this.plotlyElement = null;
        }
        return;
      }

      // Add title to layout if not hidden
      const layout: Record<string, any> = { ...chartData.layout };
      if (!this.hideTitle && this.chartTitle) {
        layout['title'] = {
          text: this.chartTitle,
          font: { size: 14, color: '#ffffff' },
          x: 0.01,
          xanchor: 'left',
          y: 0.97,
          yanchor: 'top'
        };
        // Adjust top margin to accommodate title
        layout['margin'] = {
          ...layout['margin'],
          t: (layout['margin']?.t || 30) + 20
        };
      }

      // Plotly configuration
      const config: Partial<any> = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        scrollZoom: false,
        modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d'],
        modeBarButtonsToAdd: this.canPopOut ? [{
          name: 'popout',
          title: 'Pop out to separate window',
          icon: {
            width: 1024,
            height: 1024,
            path: 'M896 0H640c-35.3 0-64 28.7-64 64s28.7 64 64 64h146.7L544 370.7c-25 25-25 65.5 0 90.5s65.5 25 90.5 0L877.3 218.3V384c0 35.3 28.7 64 64 64s64-28.7 64-64V128c0-70.7-57.3-128-128-128zM128 128c-70.7 0-128 57.3-128 128v640c0 70.7 57.3 128 128 128h640c70.7 0 128-57.3 128-128V640c0-35.3-28.7-64-64-64s-64 28.7-64 64v256H128V256h256c35.3 0 64-28.7 64-64s-28.7-64-64-64H128z',
            transform: 'matrix(1 0 0 -1 0 1024)'
          },
          click: () => this.popOutClick.emit()
        }] : []
      };

      // Render or update chart
      if (this.plotlyElement) {
        // Update existing chart
        Plotly.react(this.plotlyElement, chartData.traces, layout, config);
      } else {
        // Create new chart
        Plotly.newPlot(element, chartData.traces, layout, config)
          .then((gd: PlotlyHTMLElement) => {
            this.plotlyElement = gd;
            this.attachEventHandlers(gd);
          })
          .catch((err: Error) => {
            this.handleRenderError(err, 'Failed to create chart');
          });
      }
    } catch (err) {
      this.handleRenderError(err as Error, 'Chart rendering failed');
    }
  }

  /**
   * Attach Plotly event handlers
   */
  private attachEventHandlers(gd: PlotlyHTMLElement): void {
    // Attach click handler
    gd.on('plotly_click', (data: any) => {
      try {
        const clickedValue = this.dataSource.handleClick(data);
        if (clickedValue) {
          this.chartClick.emit({
            value: clickedValue,
            isHighlightMode: this.isHighlightModeActive
          });
        }
      } catch (err) {
        console.error('[BaseChart] Click handler error:', err);
      }
    });

    // Attach selection handler (box select, lasso)
    gd.on('plotly_selected', (data: any) => {
      try {
        // Delegate to chart-specific handleClick() method
        // This ensures consistent formatting (comma-separated for most charts, pipe for year ranges)
        const selectedValue = this.dataSource.handleClick(data);
        if (selectedValue) {
          this.chartClick.emit({
            value: selectedValue,
            isHighlightMode: this.isHighlightModeActive
          });
        }
      } catch (err) {
        console.error('[BaseChart] Selection handler error:', err);
      }
    });
  }

  /**
   * Handle render errors with user-friendly fallback
   */
  private handleRenderError(err: Error, context: string): void {
    console.error(`[BaseChart] ${context}:`, err);
    this.hasError = true;
    this.errorMessage = `${context}: ${err.message || 'Unknown error'}`;
    this.cdr.markForCheck();

    // Clean up any partial chart state
    if (this.plotlyElement) {
      try {
        Plotly.purge(this.plotlyElement);
      } catch {
        // Ignore purge errors
      }
      this.plotlyElement = null;
    }
  }

  /**
   * Retry rendering the chart (called from template)
   */
  retryRender(): void {
    this.hasError = false;
    this.errorMessage = '';
    this.cdr.markForCheck();

    // Attempt to re-render
    setTimeout(() => this.renderChart(), 0);
  }
}
