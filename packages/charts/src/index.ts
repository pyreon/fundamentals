/**
 * @pyreon/charts — Reactive ECharts bridge with auto lazy loading.
 *
 * Zero ECharts bytes in your bundle until a chart actually renders.
 * Chart types and components are detected from your config and
 * dynamically imported on demand.
 *
 * @example
 * ```tsx
 * import { Chart } from '@pyreon/charts'
 * import type { EChartsOption } from '@pyreon/charts'
 *
 * <Chart
 *   options={() => ({
 *     xAxis: { type: 'category', data: months() },
 *     yAxis: { type: 'value' },
 *     series: [{ type: 'bar', data: revenue() }],
 *     tooltip: { trigger: 'axis' },
 *   })}
 *   style="height: 400px"
 * />
 * ```
 */

export { useChart } from './use-chart'
export { Chart } from './chart-component'

// Chart configuration types
export type { ChartProps, UseChartConfig, UseChartResult } from './types'

// Re-exported ECharts types for consumer convenience —
// consumers get full autocomplete without importing echarts directly
export type {
  // Core option types
  EChartsOption,
  SetOptionOpts,
  ComposeOption,
  ECharts,
  // Series option types
  BarSeriesOption,
  LineSeriesOption,
  PieSeriesOption,
  ScatterSeriesOption,
  RadarSeriesOption,
  HeatmapSeriesOption,
  TreemapSeriesOption,
  SunburstSeriesOption,
  SankeySeriesOption,
  FunnelSeriesOption,
  GaugeSeriesOption,
  GraphSeriesOption,
  TreeSeriesOption,
  BoxplotSeriesOption,
  CandlestickSeriesOption,
  // Component option types
  TitleComponentOption,
  TooltipComponentOption,
  LegendComponentOption,
  GridComponentOption,
  ToolboxComponentOption,
  DataZoomComponentOption,
  VisualMapComponentOption,
} from './types'
