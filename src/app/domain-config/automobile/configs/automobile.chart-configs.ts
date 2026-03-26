/**
 * Automobile Domain - Chart Configurations (Plotly.js)
 *
 * Defines chart visualizations for automobile statistics using Plotly.js.
 * Charts display aggregated data and distributions.
 *
 * Domain: Automobile Discovery
 */

import { ChartConfig } from '../../../lib/config';

/**
 * Automobile chart configurations
 *
 * Array of chart definitions for the statistics panel.
 * Each chart visualizes a different aspect of the vehicle data.
 *
 * NOTE: These configs work with Plotly.js via BaseChartComponent.
 * Data transformation is handled by chart data sources in chart-sources/ directory.
 *
 * @example
 * ```typescript
 * <app-statistics-panel-2 [domainConfig]="domainConfig">
 * </app-statistics-panel-2>
 * ```
 */
export const AUTOMOBILE_CHART_CONFIGS: ChartConfig[] = [
  /**
   * Manufacturer distribution (vertical stacked bar chart)
   */
  {
    id: 'manufacturer-distribution',
    title: 'Manufacturers',
    type: 'bar',
    dataSourceId: 'manufacturer',
    height: 400,
    width: '100%',
    visible: true,
    collapsible: true
  },

  /**
   * Top models by VIN count (vertical stacked bar chart)
   */
  {
    id: 'top-models',
    title: 'Models',
    type: 'bar',
    dataSourceId: 'top-models',
    height: 400,
    width: '100%',
    visible: true,
    collapsible: true
  },

  /**
   * Year distribution (vertical stacked bar chart)
   */
  {
    id: 'year-distribution',
    title: 'Year',
    type: 'bar',
    dataSourceId: 'year',
    height: 400,
    width: '100%',
    visible: true,
    collapsible: true
  },

  /**
   * Body class distribution (vertical stacked bar chart)
   */
  {
    id: 'body-class-distribution',
    title: 'Body Class',
    type: 'bar',
    dataSourceId: 'body-class',
    height: 400,
    width: '100%',
    visible: true,
    collapsible: true
  }
];
