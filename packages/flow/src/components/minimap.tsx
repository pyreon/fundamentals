import type { VNodeChild } from '@pyreon/core'
import type { FlowInstance, MiniMapProps } from '../types'

/**
 * Miniature overview of the flow diagram showing all nodes
 * and the current viewport position.
 *
 * @example
 * ```tsx
 * <Flow instance={flow}>
 *   <MiniMap nodeColor={(n) => n.type === 'error' ? 'red' : '#ddd'} />
 * </Flow>
 * ```
 */
export function MiniMap(
  props: MiniMapProps & { instance?: FlowInstance },
): VNodeChild {
  const {
    width = 200,
    height = 150,
    nodeColor = '#e2e8f0',
    maskColor: _maskColor = 'rgba(0, 0, 0, 0.1)',
    instance,
  } = props

  if (!instance) return null

  const style = `position: absolute; bottom: 10px; right: 10px; width: ${width}px; height: ${height}px; border: 1px solid #ddd; background: white; border-radius: 4px; overflow: hidden; z-index: 5;`

  return () => {
    const nodes = instance.nodes()
    if (nodes.length === 0)
      return <div class="pyreon-flow-minimap" style={style} />

    // Calculate bounds
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    for (const node of nodes) {
      const w = node.width ?? 150
      const h = node.height ?? 40
      minX = Math.min(minX, node.position.x)
      minY = Math.min(minY, node.position.y)
      maxX = Math.max(maxX, node.position.x + w)
      maxY = Math.max(maxY, node.position.y + h)
    }

    const padding = 20
    const graphW = maxX - minX + padding * 2
    const graphH = maxY - minY + padding * 2
    const scale = Math.min(width / graphW, height / graphH)

    return (
      <div class="pyreon-flow-minimap" style={style}>
        <svg width={String(width)} height={String(height)}>
          {nodes.map((node) => {
            const w = (node.width ?? 150) * scale
            const h = (node.height ?? 40) * scale
            const x = (node.position.x - minX + padding) * scale
            const y = (node.position.y - minY + padding) * scale
            const color =
              typeof nodeColor === 'function' ? nodeColor(node) : nodeColor

            return (
              <rect
                key={node.id}
                x={String(x)}
                y={String(y)}
                width={String(w)}
                height={String(h)}
                fill={color}
                rx="2"
              />
            )
          })}
        </svg>
      </div>
    )
  }
}
