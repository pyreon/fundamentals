import type { VNodeChild } from '@pyreon/core'
import { effect } from '@pyreon/reactivity'
import type { EChartsOption } from 'echarts'
import type { ChartProps } from './types'
import { useChart } from './use-chart'

/**
 * Reactive chart component. Wraps useChart in a div with automatic
 * event binding.
 *
 * @example
 * ```tsx
 * // Default — any chart type
 * <Chart
 *   options={() => ({
 *     series: [{ type: 'bar', data: revenue() }],
 *     tooltip: {},
 *   })}
 *   style="height: 400px"
 * />
 *
 * // Strict — only specific chart types
 * import type { ComposeOption, BarSeriesOption } from '@pyreon/charts'
 * <Chart<ComposeOption<BarSeriesOption>>
 *   options={() => ({
 *     series: [{ type: 'bar', data: revenue() }],
 *   })}
 *   style="height: 400px"
 * />
 * ```
 */
export function Chart<TOption extends EChartsOption = EChartsOption>(
  props: ChartProps<TOption>,
): VNodeChild {
  const chart = useChart(props.options, {
    theme: props.theme,
    renderer: props.renderer,
  })

  // Bind events when instance is ready
  effect(() => {
    const inst = chart.instance()
    if (!inst) return

    if (props.onClick) inst.on('click', props.onClick as any)
    if (props.onMouseover) inst.on('mouseover', props.onMouseover as any)
    if (props.onMouseout) inst.on('mouseout', props.onMouseout as any)
  })

  return () => (
    <div ref={chart.ref} style={props.style} class={props.class} />
  )
}
