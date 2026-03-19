import type { Signal } from '@pyreon/reactivity'
import type { Props } from '@pyreon/core'
import type { ECharts } from 'echarts/core'
import type { EChartsOption, SetOptionOpts, ComposeOption } from 'echarts'

// ─── Re-export ECharts types for consumer convenience ────────────────────────

export type { EChartsOption, SetOptionOpts, ComposeOption, ECharts }

// Re-export series option types
export type {
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
} from 'echarts'

// Re-export component option types
export type {
  TitleComponentOption,
  TooltipComponentOption,
  LegendComponentOption,
  GridComponentOption,
  ToolboxComponentOption,
  DataZoomComponentOption,
  VisualMapComponentOption,
} from 'echarts'

// ─── Chart config ────────────────────────────────────────────────────────────

/**
 * Configuration for useChart.
 */
export interface UseChartConfig {
  /** ECharts theme — 'dark', a registered theme name, or a theme object */
  theme?: string | Record<string, unknown>
  /** Renderer — 'canvas' (default, best performance) or 'svg' */
  renderer?: 'canvas' | 'svg'
  /** ECharts locale — 'EN' (default), 'ZH', etc. */
  locale?: string
  /** Whether to replace all options instead of merging — default: false */
  notMerge?: boolean
  /** Whether to batch updates — default: true */
  lazyUpdate?: boolean
  /** Device pixel ratio — default: window.devicePixelRatio */
  devicePixelRatio?: number
  /** Width override — default: container width */
  width?: number
  /** Height override — default: container height */
  height?: number
  /** Called when chart instance is created */
  onInit?: (instance: ECharts) => void
}

/**
 * Return type of useChart.
 */
export interface UseChartResult {
  /** Bind to container element via ref */
  ref: (el: HTMLElement | null) => void
  /** The ECharts instance — null until mounted and modules loaded */
  instance: Signal<ECharts | null>
  /** True while ECharts modules are being dynamically imported */
  loading: Signal<boolean>
  /** Error signal — set if chart init or setOption throws */
  error: Signal<Error | null>
  /** Manually trigger resize */
  resize: () => void
}

/**
 * Props for the <Chart /> component.
 */
export interface ChartProps extends Props {
  /** Reactive ECharts option config — fully typed */
  options: () => EChartsOption
  /** ECharts theme */
  theme?: string | Record<string, unknown>
  /** Renderer — 'canvas' (default) or 'svg' */
  renderer?: 'canvas' | 'svg'
  /** CSS style for the container div */
  style?: string
  /** CSS class for the container div */
  class?: string
  /** Click event handler */
  onClick?: (params: unknown) => void
  /** Mouseover event handler */
  onMouseover?: (params: unknown) => void
  /** Mouseout event handler */
  onMouseout?: (params: unknown) => void
}
