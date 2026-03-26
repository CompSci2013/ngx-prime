import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { PortalModule } from '@angular/cdk/portal';

// PrimeNG Modules (imported directly — no app-level abstraction leak)
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { PanelModule } from 'primeng/panel';
import { ToolbarModule } from 'primeng/toolbar';
import { RippleModule } from 'primeng/ripple';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';
import { ChipModule } from 'primeng/chip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { CalendarModule } from 'primeng/calendar';
import { PaginatorModule } from 'primeng/paginator';
import { SliderModule } from 'primeng/slider';

// Components
import { BaseChartComponent } from './components/base-chart/base-chart.component';
import { BasePickerComponent } from './components/base-picker/base-picker.component';
import { BasicResultsTableComponent } from './components/basic-results-table/basic-results-table.component';
import { DynamicResultsTableComponent } from './components/dynamic-results-table/dynamic-results-table.component';
import { ResultsTableComponent } from './components/results-table/results-table.component';
import { QueryControlComponent } from './components/query-control/query-control.component';
import { QueryPanelComponent } from './components/query-panel/query-panel.component';
import { StatisticsPanel2Component } from './components/statistics-panel-2/statistics-panel-2.component';

const PRIMENG_MODULES = [
  TableModule,
  ButtonModule,
  MultiSelectModule,
  InputTextModule,
  DropdownModule,
  DialogModule,
  ToastModule,
  PanelModule,
  ToolbarModule,
  RippleModule,
  InputNumberModule,
  CheckboxModule,
  SkeletonModule,
  MessageModule,
  ChipModule,
  ProgressSpinnerModule,
  TooltipModule,
  TieredMenuModule,
  AutoCompleteModule,
  CalendarModule,
  PaginatorModule,
  SliderModule
];

@NgModule({
  declarations: [
    BaseChartComponent,
    BasePickerComponent,
    BasicResultsTableComponent,
    DynamicResultsTableComponent,
    ResultsTableComponent,
    QueryControlComponent,
    QueryPanelComponent,
    StatisticsPanel2Component
  ],
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    PortalModule,
    ...PRIMENG_MODULES
  ],
  exports: [
    BaseChartComponent,
    BasePickerComponent,
    BasicResultsTableComponent,
    DynamicResultsTableComponent,
    ResultsTableComponent,
    QueryControlComponent,
    QueryPanelComponent,
    StatisticsPanel2Component,
    // Re-export common modules for convenience
    CommonModule,
    FormsModule,
    DragDropModule,
    PortalModule,
    ...PRIMENG_MODULES
  ]
})
export class FrameworkModule { }
