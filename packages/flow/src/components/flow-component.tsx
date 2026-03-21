import type { VNodeChild } from '@pyreon/core'
import { getEdgePath, getHandlePosition } from '../edges'
import type { FlowInstance, FlowProps } from '../types'
import { Position } from '../types'

/**
 * Default node renderer — simple labeled box with source/target handles.
 */
function DefaultNode(props: {
  id: string
  data: Record<string, unknown>
  selected: boolean
}) {
  const borderColor = props.selected ? '#3b82f6' : '#ddd'
  return (
    <div
      style={`padding: 8px 16px; background: white; border: 2px solid ${borderColor}; border-radius: 6px; font-size: 13px; min-width: 80px; text-align: center; cursor: grab; user-select: none;`}
    >
      {(props.data?.label as string) ?? props.id}
    </div>
  )
}

/**
 * Render all edges as SVG paths.
 */
function EdgeLayer(props: { instance: FlowInstance }): VNodeChild {
  const { instance } = props

  return () => {
    const nodes = instance.nodes()
    const edges = instance.edges()
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    return (
      <svg
        role="img"
        aria-label="flow edges"
        class="pyreon-flow-edges"
        style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible;"
      >
        <defs>
          <marker
            id="flow-arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#999" />
          </marker>
        </defs>
        {edges.map((edge) => {
          const sourceNode = nodeMap.get(edge.source)
          const targetNode = nodeMap.get(edge.target)
          if (!sourceNode || !targetNode) return <g key={edge.id} />

          const sourceW = sourceNode.width ?? 150
          const sourceH = sourceNode.height ?? 40
          const targetW = targetNode.width ?? 150
          const targetH = targetNode.height ?? 40

          const sourcePos = getHandlePosition(
            Position.Right,
            sourceNode.position.x,
            sourceNode.position.y,
            sourceW,
            sourceH,
          )
          const targetPos = getHandlePosition(
            Position.Left,
            targetNode.position.x,
            targetNode.position.y,
            targetW,
            targetH,
          )

          const { path, labelX, labelY } = getEdgePath(
            edge.type ?? 'bezier',
            sourcePos.x,
            sourcePos.y,
            Position.Right,
            targetPos.x,
            targetPos.y,
            Position.Left,
          )

          const selectedEdges = instance.selectedEdges()
          const isSelected = edge.id ? selectedEdges.includes(edge.id) : false

          return (
            <g key={edge.id}>
              <path
                d={path}
                fill="none"
                stroke={isSelected ? '#3b82f6' : '#999'}
                stroke-width={isSelected ? '2' : '1.5'}
                marker-end="url(#flow-arrowhead)"
                class={edge.animated ? 'pyreon-flow-edge-animated' : ''}
                style={`pointer-events: stroke; cursor: pointer; ${edge.style ?? ''}`}
                onClick={() => edge.id && instance.selectEdge(edge.id)}
              />
              {edge.label && (
                <text
                  x={String(labelX)}
                  y={String(labelY)}
                  text-anchor="middle"
                  dominant-baseline="central"
                  style="font-size: 11px; fill: #666; pointer-events: none;"
                >
                  {edge.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    )
  }
}

/**
 * Render all nodes as positioned HTML elements.
 */
function NodeLayer(props: { instance: FlowInstance }): VNodeChild {
  const { instance } = props

  return () => {
    const nodes = instance.nodes()
    const selectedIds = instance.selectedNodes()

    return (
      <>
        {nodes.map((node) => {
          const isSelected = selectedIds.includes(node.id)

          return (
            <div
              key={node.id}
              class={`pyreon-flow-node ${node.class ?? ''} ${isSelected ? 'selected' : ''}`}
              style={`position: absolute; transform: translate(${node.position.x}px, ${node.position.y}px); ${node.style ?? ''}`}
              data-nodeid={node.id}
              onClick={(e: MouseEvent) => {
                e.stopPropagation()
                instance.selectNode(node.id, e.shiftKey)
              }}
            >
              <DefaultNode
                id={node.id}
                data={node.data}
                selected={isSelected}
              />
            </div>
          )
        })}
      </>
    )
  }
}

/**
 * The main Flow component — renders the interactive flow diagram.
 *
 * @example
 * ```tsx
 * const flow = createFlow({
 *   nodes: [...],
 *   edges: [...],
 * })
 *
 * <Flow instance={flow}>
 *   <Background />
 *   <MiniMap />
 *   <Controls />
 * </Flow>
 * ```
 */
export function Flow(props: FlowProps): VNodeChild {
  const { instance, children } = props

  const handleWheel = (e: WheelEvent) => {
    if (instance.config.zoomable === false) return
    e.preventDefault()

    const delta = -e.deltaY * 0.001
    const newZoom = Math.min(
      Math.max(
        instance.viewport.peek().zoom * (1 + delta),
        instance.config.minZoom ?? 0.1,
      ),
      instance.config.maxZoom ?? 4,
    )

    // Zoom toward cursor position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const vp = instance.viewport.peek()
    const scale = newZoom / vp.zoom

    instance.viewport.set({
      x: mouseX - (mouseX - vp.x) * scale,
      y: mouseY - (mouseY - vp.y) * scale,
      zoom: newZoom,
    })
  }

  let isPanning = false
  let panStartX = 0
  let panStartY = 0
  let panStartVpX = 0
  let panStartVpY = 0

  const handlePointerDown = (e: PointerEvent) => {
    if (instance.config.pannable === false) return

    // Only pan on background click (not on nodes)
    const target = e.target as HTMLElement
    if (target.closest('.pyreon-flow-node')) return

    isPanning = true
    panStartX = e.clientX
    panStartY = e.clientY
    const vp = instance.viewport.peek()
    panStartVpX = vp.x
    panStartVpY = vp.y
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    // Click on empty space clears selection
    instance.clearSelection()
  }

  const handlePointerMove = (e: PointerEvent) => {
    if (!isPanning) return
    const dx = e.clientX - panStartX
    const dy = e.clientY - panStartY
    instance.viewport.set({
      ...instance.viewport.peek(),
      x: panStartVpX + dx,
      y: panStartVpY + dy,
    })
  }

  const handlePointerUp = () => {
    isPanning = false
  }

  const containerStyle = `position: relative; width: 100%; height: 100%; overflow: hidden; ${props.style ?? ''}`

  // Pass instance to child components (Controls, MiniMap) via cloning
  // For now, children render as-is — they access instance from props

  return (
    <div
      class={`pyreon-flow ${props.class ?? ''}`}
      style={containerStyle}
      onWheel={handleWheel}
      onPointerdown={handlePointerDown}
      onPointermove={handlePointerMove}
      onPointerup={handlePointerUp}
    >
      {children}
      {() => {
        const vp = instance.viewport()
        return (
          <div
            class="pyreon-flow-viewport"
            style={`position: absolute; transform-origin: 0 0; transform: translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom});`}
          >
            <EdgeLayer instance={instance} />
            <NodeLayer instance={instance} />
          </div>
        )
      }}
    </div>
  )
}
