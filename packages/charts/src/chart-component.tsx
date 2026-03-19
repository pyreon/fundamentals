import { h } from '@pyreon/core'
import { effect } from '@pyreon/reactivity'
import type { VNodeChild } from '@pyreon/core'
import type { ChartProps } from './types'
import { useChart } from './use-chart'

/**
 * Reactive chart component. Wraps useChart in a div with automatic
 * event binding.
 *
 * @example
 * ```tsx
 * <Chart
 *   options={() => ({
 *     xAxis: { data: months() },
 *     series: [{ type: 'bar', data: revenue() }],
 *     tooltip: {},
 *   })}
 *   theme="dark"
 *   style="height: 400px"
 *   onClick={(params) => console.log(params.name)}
 * />
 * ```
 */
export function Chart(props: ChartProps): () => VNodeChild {
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

  return () =>
    h('div', {
      ref: chart.ref,
      style: props.style,
      class: props.class,
    })
}
