import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  Injector,
  OnDestroy,
  OnInit,
  Type
} from '@angular/core';
import { Params } from '@angular/router';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DomainConfig, DOMAIN_CONFIG, PickerConfigRegistry } from '../../lib/config';
import {
  ResourceManagementService,
  UrlStateService
} from '../../lib/state-management';
import { ChartDataSource, UserPreferencesService } from '../../lib/framework';
import { PopOutManagerService, PopOutMessageType } from '../../lib/popout';

// Framework panel components — imported for CDK Portal pop-out rendering
import { QueryControlComponent } from '../../lib/framework/components/query-control/query-control.component';
import { QueryPanelComponent } from '../../lib/framework/components/query-panel/query-panel.component';
import { BasePickerComponent } from '../../lib/framework/components/base-picker/base-picker.component';
import { StatisticsPanel2Component } from '../../lib/framework/components/statistics-panel-2/statistics-panel-2.component';
import { BasicResultsTableComponent } from '../../lib/framework/components/basic-results-table/basic-results-table.component';
import { BaseChartComponent } from '../../lib/framework/components/base-chart/base-chart.component';

import { createAutomobilePickerConfigs } from '../../domain-config/automobile/configs/automobile.picker-configs';

/**
 * Panel → Component type mapping for CDK Portal pop-outs.
 *
 * When a panel is popped out, the PopOutManagerService opens an about:blank
 * window and renders this component into it via DomPortalOutlet. The component
 * shares the host's Angular DI context (same ResourceManagementService instance),
 * so data is always current without BroadcastChannel state sync.
 */
const PANEL_COMPONENT_MAP: Record<string, Type<any>> = {
  'query-control': QueryControlComponent,
  'query-panel': QueryPanelComponent,
  'manufacturer-model-picker': BasePickerComponent,
  'statistics-panel-2': StatisticsPanel2Component,
  'basic-results-table': BasicResultsTableComponent
};

/**
 * Discover Component - Core discovery interface orchestrator
 *
 * **DOMAIN-AGNOSTIC**: Works with any domain via dependency injection.
 * Single component renders different UIs based on DOMAIN_CONFIG.
 *
 * **Architecture**: Configuration-Driven + URL-First + CDK Portal Pop-Outs
 *
 * Pop-out windows are rendered via CDK DomPortalOutlet into about:blank windows.
 * The portal components share the host's DI context (same ResourceManagementService),
 * so they receive data updates automatically. Component @Output() events are
 * auto-wired by PopOutManagerService and relayed as COMPONENT_OUTPUT messages.
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

  domainConfig: DomainConfig<TFilters, TData, TStatistics>;
  collapsedPanels = new Map<string, boolean>();
  panelOrder: string[] = [
    'query-control',
    'query-panel',
    'manufacturer-model-picker',
    'statistics-panel-2',
    'basic-results-table'
  ];

  private destroy$ = new Subject<void>();

  constructor(
    @Inject(DOMAIN_CONFIG) domainConfig: DomainConfig<any, any, any>,
    public resourceService: ResourceManagementService<TFilters, TData, TStatistics>,
    private pickerRegistry: PickerConfigRegistry,
    private injector: Injector,
    private popOutManager: PopOutManagerService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private urlStateService: UrlStateService,
    private userPreferences: UserPreferencesService
  ) {
    this.domainConfig = domainConfig as DomainConfig<TFilters, TData, TStatistics>;
  }

  ngOnInit(): void {
    // Load panel preferences
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

    // Register domain-specific picker configurations
    const pickerConfigs = createAutomobilePickerConfigs(this.injector);
    this.pickerRegistry.registerMultiple(pickerConfigs);

    // Initialize PopOutManagerService with host injector for DI context sharing.
    // Portal-rendered components inherit this injector, giving them access to
    // component-level providers (ResourceManagementService, etc.)
    this.popOutManager.initialize(this.injector);

    // Handle COMPONENT_OUTPUT messages from popped-out components.
    // The PopOutManagerService auto-wires @Output() EventEmitters and relays
    // them as COMPONENT_OUTPUT messages with { outputName, data }.
    this.popOutManager.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ panelId, message }) => {
        this.handlePopOutMessage(panelId, message);
      });

    // Handle pop-out window closures — refresh panel visibility
    this.popOutManager.closed$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cdr.markForCheck();
      });

    // Handle pop-up blocked notifications
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

    // Broadcast state changes to all open pop-outs.
    // Portal components share the same ResourceManagementService, so their data
    // is already current — but OnPush change detection needs an explicit kick.
    this.resourceService.state$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.popOutManager.broadcastState(state);
    });
  }

  isPanelPoppedOut(panelId: string): boolean {
    return this.popOutManager.isPoppedOut(panelId);
  }

  isPanelCollapsed(panelId: string): boolean {
    return this.collapsedPanels.get(panelId) ?? false;
  }

  togglePanelCollapse(panelId: string): void {
    const currentState = this.collapsedPanels.get(panelId) ?? false;
    this.collapsedPanels.set(panelId, !currentState);

    const collapsedPanels = Array.from(this.collapsedPanels.entries())
      .filter(([_, isCollapsed]) => isCollapsed)
      .map(([panelId, _]) => panelId);
    this.userPreferences.saveCollapsedPanels(collapsedPanels);

    this.cdr.markForCheck();
  }

  onPanelDrop(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.panelOrder, event.previousIndex, event.currentIndex);
    this.userPreferences.savePanelOrder(this.panelOrder);
    this.cdr.markForCheck();
  }

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
   * Pop out a panel to a separate window via CDK Portal.
   *
   * Opens an about:blank window and renders the panel's Angular component
   * into it. The component shares this host's DI context.
   */
  popOutPanel(panelId: string): void {
    const componentType = PANEL_COMPONENT_MAP[panelId];
    if (!componentType) {
      console.warn(`[DiscoverComponent] No component mapping for panel: ${panelId}`);
      return;
    }

    // Build data payload for the pop-out component.
    // Most panels need domainConfig; the picker needs configId instead.
    const data: Record<string, any> = {
      title: this.getPanelTitle(panelId)
    };

    if (panelId === 'manufacturer-model-picker') {
      data['configId'] = 'manufacturer-model-picker';
    } else {
      data['domainConfig'] = this.domainConfig;
    }

    const opened = this.popOutManager.openPopOut(
      panelId,
      componentType,
      data
    );

    if (opened) {
      this.cdr.markForCheck();
    }
  }

  /**
   * Pop out a chart to a separate window via CDK Portal.
   */
  onChartPopOut(chartId: string): void {
    const panelId = `chart-${chartId}`;
    const dataSource = this.domainConfig.chartDataSources?.[chartId];
    if (!dataSource) {
      return;
    }

    this.popOutManager.openPopOut(
      panelId,
      BaseChartComponent,
      {
        chartId,
        dataSource,
        title: `Chart: ${chartId}`
      }
    );

    this.cdr.markForCheck();
  }

  /**
   * Handle messages from pop-out windows.
   *
   * With CDK Portal pop-outs, component @Output() events are auto-wired by
   * PopOutManagerService and arrive as COMPONENT_OUTPUT messages with
   * { outputName: string, data: any }.
   */
  private async handlePopOutMessage(_panelId: string, message: any): Promise<void> {
    switch (message.type) {
      case PopOutMessageType.PANEL_READY:
        const currentState = this.resourceService.getCurrentState();
        this.popOutManager.broadcastState(currentState);
        break;

      case PopOutMessageType.COMPONENT_OUTPUT:
        await this.handleComponentOutput(message.payload);
        break;
    }
  }

  /**
   * Route @Output() events from popped-out components to the appropriate handler.
   */
  private async handleComponentOutput(payload: { outputName: string; data: any }): Promise<void> {
    if (!payload) return;

    switch (payload.outputName) {
      case 'urlParamsChange':
        await this.onUrlParamsChange(payload.data);
        break;

      case 'clearAllFilters':
        await this.onClearAllFilters();
        break;

      case 'pickerSelectionChange':
        await this.onPickerSelectionChangeAndUpdateUrl(payload.data);
        break;

      case 'chartClick':
        if (payload.data) {
          const dataSource = this.domainConfig.chartDataSources?.[payload.data.chartId];
          await this.onStandaloneChartClick(
            { value: payload.data.value, isHighlightMode: payload.data.isHighlightMode },
            dataSource
          );
        }
        break;

      case 'chartPopOut':
        this.onChartPopOut(payload.data);
        break;
    }
  }

  async onUrlParamsChange(params: Params): Promise<void> {
    await this.urlStateService.setParams(params);
  }

  async onClearAllFilters(): Promise<void> {
    await this.urlStateService.clearParams();
  }

  async onStandaloneChartClick(
    event: { value: string; isHighlightMode: boolean },
    dataSource: ChartDataSource | undefined
  ): Promise<void> {
    if (!dataSource) {
      return;
    }

    const newParams = dataSource.toUrlParams(event.value, event.isHighlightMode);

    if (!event.isHighlightMode) {
      newParams['page'] = 1;
    }

    if (Object.keys(newParams).length > 0) {
      await this.urlStateService.setParams(newParams);
    }
  }

  async onPickerSelectionChangeAndUpdateUrl(event: any): Promise<void> {
    const paramName = 'modelCombos';
    await this.urlStateService.setParams({
      [paramName]: event.urlValue || null,
      page: 1
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
