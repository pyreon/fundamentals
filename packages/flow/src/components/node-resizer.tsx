import type { VNodeChild } from '@pyreon/core'
import type { FlowInstance } from '../types'

export interface NodeResizerProps {
  nodeId: string
  instance: FlowInstance
  /** Minimum width — default: 50 */
  minWidth?: number
  /** Minimum height — default: 30 */
  minHeight?: number
  /** Whether to show resize handles — default: true when node is selected */
  visible?: boolean
  /** Handle size in px — default: 8 */
  handleSize?: number
}

const corners = ['nw', 'ne', 'sw', 'se'] as const
type Corner = (typeof corners)[number]

const cornerCursors: Record<Corner, string> = {
  nw: 'nw-resize',
  ne: 'ne-resize',
  sw: 'sw-resize',
  se: 'se-resize',
}

const cornerPositions: Record<Corner, string> = {
  nw: 'top: -4px; left: -4px;',
  ne: 'top: -4px; right: -4px;',
  sw: 'bottom: -4px; left: -4px;',
  se: 'bottom: -4px; right: -4px;',
}

/**
 * Node resize handles. Place inside a custom node component
 * to allow users to resize the node by dragging corners.
 *
 * @example
 * ```tsx
 * function ResizableNode({ id, data }: NodeComponentProps) {
 *   const flow = useFlow() // or pass via props
 *   return (
 *     <div style="min-width: 100px; min-height: 50px;">
 *       {data.label}
 *       <NodeResizer nodeId={id} instance={flow} />
 *     </div>
 *   )
 * }
 * ```
 */
export function NodeResizer(props: NodeResizerProps): VNodeChild {
  const {
    nodeId,
    instance,
    minWidth = 50,
    minHeight = 30,
    handleSize = 8,
  } = props

  let resizing = false
  let corner: Corner = 'se'
  let startX = 0
  let startY = 0
  let startWidth = 0
  let startHeight = 0
  let startNodeX = 0
  let startNodeY = 0

  const handlePointerDown = (c: Corner) => (e: PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const node = instance.getNode(nodeId)
    if (!node) return

    resizing = true
    corner = c
    startX = e.clientX
    startY = e.clientY
    startWidth = node.width ?? 150
    startHeight = node.height ?? 40
    startNodeX = node.position.x
    startNodeY = node.position.y

    const doc = (e.target as HTMLElement).ownerDocument
    const vp = instance.viewport.peek()

    const onMove = (me: PointerEvent) => {
      if (!resizing) return
      const dx = (me.clientX - startX) / vp.zoom
      const dy = (me.clientY - startY) / vp.zoom

      let newW = startWidth
      let newH = startHeight
      let newX = startNodeX
      let newY = startNodeY

      if (corner === 'se' || corner === 'ne')
        newW = Math.max(minWidth, startWidth + dx)
      if (corner === 'sw' || corner === 'nw') {
        newW = Math.max(minWidth, startWidth - dx)
        newX = startNodeX + startWidth - newW
      }
      if (corner === 'se' || corner === 'sw')
        newH = Math.max(minHeight, startHeight + dy)
      if (corner === 'ne' || corner === 'nw') {
        newH = Math.max(minHeight, startHeight - dy)
        newY = startNodeY + startHeight - newH
      }

      instance.updateNode(nodeId, {
        width: newW,
        height: newH,
        position: { x: newX, y: newY },
      })
    }

    const onUp = () => {
      resizing = false
      doc.removeEventListener('pointermove', onMove)
      doc.removeEventListener('pointerup', onUp)
    }

    doc.addEventListener('pointermove', onMove)
    doc.addEventListener('pointerup', onUp)
  }

  const size = `${handleSize}px`
  const baseHandleStyle = `position: absolute; width: ${size}; height: ${size}; background: white; border: 1.5px solid #3b82f6; border-radius: 2px; z-index: 2;`

  return (
    <>
      {corners.map((c) => (
        <div
          key={c}
          class={`pyreon-flow-resizer pyreon-flow-resizer-${c}`}
          style={`${baseHandleStyle} ${cornerPositions[c]} cursor: ${cornerCursors[c]};`}
          onPointerdown={handlePointerDown(c)}
        />
      ))}
    </>
  )
}
