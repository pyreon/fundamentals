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
 *
 * <Chart
 *   options={() => ({
 *     xAxis: { data: months() },
 *     series: [{ type: 'bar', data: revenue() }],
 *     tooltip: {},
 *   })}
 *   style="height: 400px"
 * />
 * ```
 */

export { useChart } from './use-chart'
export { Chart } from './chart-component'

export type {
  ChartProps,
  EChartOption,
  UseChartConfig,
  UseChartResult,
} from './types'
