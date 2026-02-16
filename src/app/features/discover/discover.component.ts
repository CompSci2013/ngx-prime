import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  Injector,
  OnDestroy,
  OnInit
} from '@angular/core';
import { Params } from '@angular/router';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { createAutomobilePickerConfigs } from '../../domain-config/automobile/configs/automobile.picker-configs';
import { DomainConfig } from '../../framework/models';
import { PopOutMessageType } from '../../framework/models/popout.interface';
import { DOMAIN_CONFIG } from '../../framework/services/domain-config-registry.service';
import { PickerConfigRegistry } from '../../framework/services/picker-config-registry.service';
import { PopOutManagerService } from '../../framework/services/popout-manager.service';
import { ResourceManagementService } from '../../framework/services/resource-management.service';
import { UrlStateService } from '../../framework/services/url-state.service';
import { UserPreferencesService } from '../../framework/services/user-preferences.service';
import { ChartDataSource } from '../../framework/components/base-chart/base-chart.component';


/**
 * Discover Component - Core discovery interface orchestrator
 *
 * **DOMAIN-AGNOSTIC**: Works with any domain via dependency injection.
 * Single component renders different UIs based on DOMAIN_CONFIG.
 *
 * **Primary Responsibilities**:
 * 1. Orchestrate 4 framework panels (QueryControl, Picker, Statistics, ResultsTable)
 * 2. Manage panel lifecycle (collapse, drag-drop reorder, pop-out)
 * 3. Handle URL state synchronization with ResourceManagementService
 * 4. Manage pop-out windows (create, monitor, close)
 * 5. Broadcast state changes to all open pop-outs via BroadcastChannel
 * 6. Listen for messages from pop-outs and update URL/state
 *
 * **Architecture**: Configuration-Driven + URL-First + Pop-Out Aware
 *
 * ```
 * DiscoverComponent (main window)
 * ├─ URL changes
 * │  └─ ResourceManagementService detects change → fetchData()
 * │     └─ state$ emits new state
 * │        └─ broadcastStateToPopOuts() sends via BroadcastChannel
 * │
 * ├─ Panel renders
 * │  ├─ Query Control (filters$)
 * │  ├─ Picker (results$ with filter)
 * │  ├─ Statistics (statistics$)
 * │  └─ Results Table (results$)
 * │
 * └─ Pop-outs
 *    ├─ popOutPanel() opens new window
 *    ├─ PanelPopoutComponent initializes
 *    │  └─ ResourceManagementService (pop-out instance, autoFetch=false)
 *    │
 *    └─ BroadcastChannel sync
 *       ├─ Main → Pop-out: STATE_UPDATE (on URL change)
 *       └─ Pop-out → Main: PICKER_SELECTION_CHANGE, FILTER_ADD, etc.
 * ```
 *
 * **Key Features**:
 * - **Panel Management**: Collapse, drag-drop reorder, hide when popped out
 * - **Pop-Out Windows**: Open secondary windows via window.open()
 * - **BroadcastChannel**: Cross-window communication (one channel per panel)
 * - **Window Close Detection**: Polls every 500ms to detect user-closed windows
 * - **State Broadcasting**: Listens to state$ and broadcasts to all pop-outs
 * - **Change Detection**: OnPush strategy with manual markForCheck()
 * - **Cleanup**: Closes all pop-outs on beforeunload (page refresh/close)
 *
 * **Configuration**: Injected via DOMAIN_CONFIG token
 * - Works with any domain (Automobile, Agriculture, Physics, etc.)
 * - Domain config defines: filters, adapters, table columns, charts
 * - No hardcoded domain logic - all driven by config
 *
 * **Observable Pattern**:
 * - state$ from ResourceManagementService → broadcasts to pop-outs
 * - Pop-out messages received → update URL → trigger state$ → components re-render
 * - Messages flow: URL → state$ → BroadcastChannel → pop-out components
 *
 * @template TFilters - Domain-specific filter model (e.g., AutoSearchFilters)
 * @template TData - Domain-specific data model (e.g., VehicleResult)
 * @template TStatistics - Domain-specific statistics (e.g., VehicleStatistics)
 *
 * @example
 * ```typescript
 * // Works with any domain - same component, different configs
 * // Automobile domain
 * // <app-discover></app-discover> with AutomobileConfig
 *
 * // Agriculture domain (same component, different config)
 * // <app-discover></app-discover> with AgricultureConfig
 * ```
 */
@Component({
    selector: 'app-discover',
    templateUrl: './discover.component.html',
    styleUrls: ['./discover.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [ResourceManagementService, PopOutManagerService]
})
export class DiscoverComponent<TFilters = any, TData = any, TStatistics = any>
  implements OnInit, OnDestroy {
  /**
   * Domain configuration (injected, works with any domain)
   */
  domainConfig: DomainConfig<TFilters, TData, TStatistics>;

  /**
   * Map of collapsed panel states (panel ID → collapsed boolean)
   */
  collapsedPanels = new Map<string, boolean>();

  /**
   * Ordered list of panel IDs (defines display order)
   */
  panelOrder: string[] = [
    'query-control',
    'query-panel',
    'manufacturer-model-picker',
    'statistics-panel-2',
    'basic-results-table'
  ];

  /**
   * Destroy signal for subscription cleanup
   */
  private destroy$ = new Subject<void>();

  /**
   * Grid identifier for routing
   */
  private readonly gridId = 'discover';

  constructor(
    @Inject(DOMAIN_CONFIG) domainConfig: DomainConfig<any, any, any>,
    public resourceService: ResourceManagementService<
      TFilters,
      TData,
      TStatistics
    >,
    private pickerRegistry: PickerConfigRegistry,
    private injector: Injector,
    private popOutManager: PopOutManagerService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private urlStateService: UrlStateService,
    private userPreferences: UserPreferencesService
  ) {
    // Store injected config (works with any domain)
    this.domainConfig = domainConfig as DomainConfig<
      TFilters,
      TData,
      TStatistics
    >;
  }

  /**
   * Angular lifecycle hook - Initialize component
   *
   * **Initialization Sequence**:
   * 1. Load panel preferences from UserPreferencesService
   * 2. Register domain-specific picker configurations
   * 3. Initialize PopOutManagerService (handles beforeunload, BroadcastChannel setup)
   * 4. Subscribe to pop-out messages and state broadcasting
   *
   * **Memory Management**:
   * All subscriptions are cleaned up via takeUntil(destroy$) in ngOnDestroy.
   */
  ngOnInit(): void {
    // STEP 1: Load panel preferences from UserPreferencesService
    this.userPreferences.getPanelOrder()
      .pipe(takeUntil(this.destroy$))
      .subscribe(order => {
        this.panelOrder = order;
        this.cdr.markForCheck();
      });

    this.userPreferences.getCollapsedPanels()
      .pipe(takeUntil(this.destroy$))
      .subscribe(collapsedPanels => {
        this.collapsedPanels.clear();
        collapsedPanels.forEach(panelId => {
          this.collapsedPanels.set(panelId, true);
        });
        this.cdr.markForCheck();
      });

    // STEP 2: Register domain-specific picker configurations
    const pickerConfigs = createAutomobilePickerConfigs(this.injector);
    this.pickerRegistry.registerMultiple(pickerConfigs);

    // STEP 3: Initialize PopOutManagerService
    // Handles: beforeunload cleanup, BroadcastChannel setup, window polling
    this.popOutManager.initialize(this.gridId);

    // STEP 4: Subscribe to pop-out messages from PopOutManagerService
    this.popOutManager.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ message }) => {
        this.handlePopOutMessage('', message);
      });

    // STEP 5: Handle pop-out window closures
    this.popOutManager.closed$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cdr.markForCheck();
      });

    // STEP 6: Handle pop-up blocked notifications
    this.popOutManager.blocked$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Pop-up Blocked',
          detail: 'Please allow pop-ups for this site to use the pop-out feature',
          life: 5000
        });
      });

    // STEP 7: Broadcast state changes to all open pop-outs
    this.resourceService.state$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.popOutManager.broadcastState(state);
    });
  }

  /**
   * Check if a panel is currently popped out
   *
   * @param panelId - Panel identifier
   * @returns True if panel is popped out
   */
  isPanelPoppedOut(panelId: string): boolean {
    return this.popOutManager.isPoppedOut(panelId);
  }

  /**
   * Check if a panel is currently collapsed
   *
   * @param panelId - Panel identifier
   * @returns True if panel is collapsed
   */
  isPanelCollapsed(panelId: string): boolean {
    return this.collapsedPanels.get(panelId) ?? false;
  }

  /**
   * Toggle panel collapsed state
   * Saves new collapsed state to UserPreferencesService
   *
   * @param panelId - Panel identifier
   */
  togglePanelCollapse(panelId: string): void {
    const currentState = this.collapsedPanels.get(panelId) ?? false;
    this.collapsedPanels.set(panelId, !currentState);

    // Save collapsed state to preferences
    const collapsedPanels = Array.from(this.collapsedPanels.entries())
      .filter(([_, isCollapsed]) => isCollapsed)
      .map(([panelId, _]) => panelId);
    this.userPreferences.saveCollapsedPanels(collapsedPanels);

    this.cdr.markForCheck();
  }

  /**
   * Handle panel drag-drop to reorder panels
   * Saves new panel order to UserPreferencesService
   *
   * @param event - CDK drag-drop event
   */
  onPanelDrop(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.panelOrder, event.previousIndex, event.currentIndex);

    // Save new panel order to preferences
    this.userPreferences.savePanelOrder(this.panelOrder);

    this.cdr.markForCheck();
  }

  /**
   * Get panel title by panel ID
   *
   * @param panelId - Panel identifier
   * @returns Panel display title
   */
  getPanelTitle(panelId: string): string {
    const titleMap: { [key: string]: string } = {
      'query-control': 'Query Control',
      'query-panel': 'Query Panel',
      'manufacturer-model-picker': 'Manufacturer-Model Picker',
      'statistics-panel-2': 'Statistics',
      'results-table': 'Results',
      'basic-results-table': 'Results Table'
    };
    return titleMap[panelId] || panelId;
  }

  /**
   * Get panel type for routing by panel ID
   *
   * @param panelId - Panel identifier
   * @returns Panel type for pop-out routing
   */
  getPanelType(panelId: string): string {
    const typeMap: { [key: string]: string } = {
      'query-control': 'query-control',
      'query-panel': 'query-panel',
      'manufacturer-model-picker': 'picker',
      'statistics-panel-2': 'statistics-2',
      'results-table': 'results',
      'basic-results-table': 'basic-results'
    };
    return typeMap[panelId] || panelId;
  }

  /**
   * Pop out a panel to a separate window
   *
   * Delegates to PopOutManagerService which handles:
   * - Window creation with proper features
   * - BroadcastChannel setup and message routing
   * - Window close polling
   * - Cleanup on close
   *
   * @param panelId - Panel identifier (e.g., 'query-control', 'manufacturer-model-picker')
   * @param panelType - Panel type for routing (e.g., 'query-control', 'picker', 'statistics', 'results')
   */
  popOutPanel(panelId: string, panelType: string): void {
    const opened = this.popOutManager.openPopOut(panelId, panelType);
    if (opened) {
      this.cdr.markForCheck();
    }
  }

  /**
   * Handle messages from pop-out windows
   *
   * @param panelId - Panel identifier
   * @param message - Message from pop-out
   */
  private async handlePopOutMessage(_panelId: string, message: any): Promise<void> {
    switch (message.type) {
      case PopOutMessageType.PANEL_READY:
        // Pop-out is ready - broadcast current state immediately
        const currentState = this.resourceService.getCurrentState();
        this.popOutManager.broadcastState(currentState);
        break;

      case PopOutMessageType.URL_PARAMS_CHANGED:
        // Pop-out sent URL params change - update main window URL
        if (message.payload?.params) {
          console.log('[DiscoverComponent] URL_PARAMS_CHANGED - updating URL with', message.payload.params);
          // Update the single source of truth (the URL)
          // This triggers the normal state update flow:
          // 1. URL change detected by resourceService.watchUrlChanges()
          // 2. fetchData() API call happens
          // 3. API response updates state with results + statistics
          // 4. state$ subscription fires and broadcasts complete state to pop-outs
          // DO NOT manually broadcast incomplete state here - that causes race conditions
          // where pop-outs receive state with empty results before API completes
          await this.urlStateService.setParams(message.payload.params);
        }
        break;

      case PopOutMessageType.CLEAR_ALL_FILTERS:
        // Pop-out requested to clear all filters - clear all URL params
        await this.urlStateService.clearParams();
        break;

      // ============================================
      // Systemic Fix: Handle ALL pop-out message types
      // Previously missing handlers caused pop-out interactions to be ignored
      // Fixed in Session 59
      // ============================================

      case PopOutMessageType.PICKER_SELECTION_CHANGE:
        // Pop-out picker selection changed - update main window URL
        // Payload: PickerSelectionEvent
        if (message.payload) {
          await this.onPickerSelectionChangeAndUpdateUrl(message.payload);
        }
        break;

      case PopOutMessageType.FILTER_ADD:
        // Pop-out Query Control added a filter - update main window URL
        // Payload contains the filter field and value
        if (message.payload?.params) {
          await this.urlStateService.setParams({
            ...message.payload.params,
            page: 1 // Reset to first page when filter changes
          });
        }
        break;

      case PopOutMessageType.FILTER_REMOVE:
        // Pop-out Query Control removed a filter - update main window URL
        // Payload: { field: string } - set the field to null to remove
        if (message.payload?.field) {
          await this.urlStateService.setParams({
            [message.payload.field]: null,
            page: 1
          });
        }
        break;

      case PopOutMessageType.HIGHLIGHT_REMOVE:
        // Pop-out removed a highlight - update main window URL
        // Payload: highlight key string
        // Note: Highlights are typically stored in 'highlights' URL param
        // This is a simplified handler - may need adjustment based on actual implementation
        if (message.payload) {
          // Get current highlights, remove the specified one
          const currentHighlights = this.urlStateService.getParam('highlights');
          if (currentHighlights) {
            const highlightArray = currentHighlights.split(',').filter((h: string) => h !== message.payload);
            await this.urlStateService.setParams({
              highlights: highlightArray.length > 0 ? highlightArray.join(',') : null
            });
          }
        }
        break;

      case PopOutMessageType.CLEAR_HIGHLIGHTS:
        // Pop-out requested to clear all highlights - remove highlights from URL
        await this.urlStateService.setParams({ highlights: null });
        break;

      case PopOutMessageType.CHART_CLICK:
        // Pop-out chart was clicked - update main window URL
        // Payload: { chartId: string, value: string, isHighlightMode: boolean }
        if (message.payload) {
          // Look up the dataSource by chartId
          const dataSource = this.domainConfig.chartDataSources?.[message.payload.chartId];
          await this.onStandaloneChartClick(
            { value: message.payload.value, isHighlightMode: message.payload.isHighlightMode },
            dataSource
          );
        }
        break;
    }
  }

  /**
   * Handle URL parameter changes from components
   * Updates the URL in main window
   *
   * @param params - URL parameters to update
   */
  async onUrlParamsChange(params: Params): Promise<void> {
    await this.urlStateService.setParams(params);
  }

  /**
   * Handle clear all filters request
   * Clears all URL query parameters
   */
  async onClearAllFilters(): Promise<void> {
    await this.urlStateService.clearParams();
  }

  /**
   * Handle chart pop-out request from standalone charts
   *
   * @param chartId - Chart identifier (e.g., 'manufacturer', 'top-models', 'year', 'body-class')
   */
  onChartPopOut(chartId: string): void {
    // Use existing popOutPanel infrastructure with chart-specific panel ID
    const panelId = `chart-${chartId}`;
    const panelType = 'chart';
    this.popOutPanel(panelId, panelType);
  }

  /**
   * Handle chart click from standalone charts
   *
   * Delegates URL param generation to the chart's data source.
   * This keeps domain-specific mappings in the domain layer (data sources)
   * rather than in the feature layer (this component).
   *
   * @param event - Chart click event with value and highlight mode
   * @param dataSource - The chart's data source (handles URL param mapping)
   */
  async onStandaloneChartClick(
    event: { value: string; isHighlightMode: boolean },
    dataSource: ChartDataSource | undefined
  ): Promise<void> {
    if (!dataSource) {
      return;
    }

    // Delegate URL param generation to the data source
    const newParams = dataSource.toUrlParams(event.value, event.isHighlightMode);

    // Reset pagination when filtering (not highlighting)
    if (!event.isHighlightMode) {
      newParams['page'] = 1;
    }

    if (Object.keys(newParams).length > 0) {
      await this.urlStateService.setParams(newParams);
    }
  }

  /**
   * Handle picker selection changes and update URL
   *
   * @param event - Picker selection event containing selected items and URL value
   */
  async onPickerSelectionChangeAndUpdateUrl(event: any): Promise<void> {
    // Extract the URL param name from the picker config
    // For now, we'll use a hardcoded value - this should come from the picker config
    const paramName = 'modelCombos'; // TODO: Get from picker config

    // Update URL with the serialized selection and reset pagination
    await this.urlStateService.setParams({
      [paramName]: event.urlValue || null,
      page: 1 // Reset to first page when selection changes (1-indexed)
    });
  }

  ngOnDestroy(): void {
    // PopOutManagerService handles its own cleanup in ngOnDestroy
    this.destroy$.next();
    this.destroy$.complete();
  }
}
