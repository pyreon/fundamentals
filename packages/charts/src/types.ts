import type { Signal } from '@pyreon/reactivity'
import type { Props } from '@pyreon/core'
import type * as echarts from 'echarts/core'

/**
 * ECharts option type — the config object passed to setOption.
 * Uses `Record<string, unknown>` to avoid importing the full ECharts types
 * while still allowing IDE autocomplete when echarts is installed.
 */
export type EChartOption = Record<string, unknown> & {
  series?: Array<{ type?: string; [key: string]: unknown }>
  [key: string]: unknown
}

/**
 * Configuration for useChart.
 */
export interface UseChartConfig {
  /** ECharts theme — 'dark', a theme name, or a theme object */
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
  onInit?: (instance: echarts.ECharts) => void
}

/**
 * Return type of useChart.
 */
export interface UseChartResult {
  /** Bind to container element via ref */
  ref: (el: HTMLElement | null) => void
  /** The ECharts instance — null until mounted and modules loaded */
  instance: Signal<echarts.ECharts | null>
  /** True while ECharts modules are being dynamically imported */
  loading: Signal<boolean>
  /** Manually trigger resize */
  resize: () => void
}

/**
 * Props for the <Chart /> component.
 */
export interface ChartProps extends Props {
  /** Reactive ECharts option config */
  options: () => EChartOption
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
