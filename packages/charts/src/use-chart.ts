import { signal, effect } from '@pyreon/reactivity'
import { onUnmount } from '@pyreon/core'
import type { EChartOption, UseChartConfig, UseChartResult } from './types'
import { ensureModules } from './loader'

/**
 * Reactive ECharts hook. Creates a chart instance bound to a container
 * element, with automatic module lazy-loading, signal tracking, resize
 * handling, and cleanup.
 *
 * @param optionsFn — reactive function returning ECharts config. Signal
 *   reads inside this function are tracked automatically. When any
 *   signal changes, setOption() is called with the new config.
 * @param config — optional chart configuration (theme, renderer, etc.)
 *
 * @example
 * ```tsx
 * const chart = useChart(() => ({
 *   xAxis: { data: months() },
 *   series: [{ type: 'bar', data: revenue() }],
 *   tooltip: {},
 * }))
 *
 * return <div ref={chart.ref} style="height: 400px" />
 * ```
 */
export function useChart(
  optionsFn: () => EChartOption,
  config?: UseChartConfig,
): UseChartResult {
  const instance = signal<import('echarts/core').ECharts | null>(null)
  const loading = signal(true)
  const container = signal<HTMLElement | null>(null)
  const renderer = config?.renderer ?? 'canvas'

  let observer: ResizeObserver | null = null
  let initialized = false

  // Initialize chart when container is bound
  effect(() => {
    const el = container()
    if (!el || initialized) return

    initialized = true
    const opts = optionsFn()

    // Load required ECharts modules, then create chart
    ensureModules(opts, renderer).then((core) => {
      // Guard: component may have unmounted during async load
      if (!container.peek()) return

      const chart = core.init(el, config?.theme as any, {
        renderer,
        locale: config?.locale,
        devicePixelRatio: config?.devicePixelRatio,
        width: config?.width,
        height: config?.height,
      })

      chart.setOption(opts)
      instance.set(chart)
      loading.set(false)

      config?.onInit?.(chart)

      // ResizeObserver for auto-resize
      observer = new ResizeObserver(() => {
        chart.resize()
      })
      observer.observe(el)
    })
  })

  // Reactive updates — re-run when signals in optionsFn change
  effect(() => {
    const chart = instance()
    if (!chart) return

    const opts = optionsFn()
    chart.setOption(opts, {
      notMerge: config?.notMerge ?? false,
      lazyUpdate: config?.lazyUpdate ?? true,
    })
  })

  // Cleanup on unmount
  onUnmount(() => {
    observer?.disconnect()
    observer = null

    const chart = instance.peek()
    if (chart) {
      chart.dispose()
      instance.set(null)
    }

    initialized = false
  })

  return {
    ref: (el: HTMLElement | null) => container.set(el),
    instance,
    loading,
    resize: () => instance.peek()?.resize(),
  }
}
