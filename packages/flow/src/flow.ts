import { batch, computed, signal } from '@pyreon/reactivity'
import { computeLayout } from './layout'
import type {
  Connection,
  FlowConfig,
  FlowEdge,
  FlowInstance,
  FlowNode,
  LayoutAlgorithm,
  LayoutOptions,
  NodeChange,
  XYPosition,
} from './types'

/**
 * Generate a unique edge id from source/target.
 */
function edgeId(edge: FlowEdge): string {
  if (edge.id) return edge.id
  const sh = edge.sourceHandle ? `-${edge.sourceHandle}` : ''
  const th = edge.targetHandle ? `-${edge.targetHandle}` : ''
  return `e-${edge.source}${sh}-${edge.target}${th}`
}

/**
 * Create a reactive flow instance — the core state manager for flow diagrams.
 *
 * All state is signal-based. Nodes, edges, viewport, and selection are
 * reactive and update the UI automatically when modified.
 *
 * @param config - Initial configuration with nodes, edges, and options
 * @returns A FlowInstance with signals and methods for managing the diagram
 *
 * @example
 * ```tsx
 * const flow = createFlow({
 *   nodes: [
 *     { id: '1', position: { x: 0, y: 0 }, data: { label: 'Start' } },
 *     { id: '2', position: { x: 200, y: 100 }, data: { label: 'End' } },
 *   ],
 *   edges: [{ source: '1', target: '2' }],
 * })
 *
 * flow.nodes()          // reactive node list
 * flow.viewport()       // { x: 0, y: 0, zoom: 1 }
 * flow.addNode({ id: '3', position: { x: 400, y: 0 }, data: { label: 'New' } })
 * flow.layout('layered', { direction: 'RIGHT' })
 * ```
 */
export function createFlow(config: FlowConfig = {}): FlowInstance {
  const {
    nodes: initialNodes = [],
    edges: initialEdges = [],
    defaultEdgeType = 'bezier',
    minZoom = 0.1,
    maxZoom = 4,
    snapToGrid = false,
    snapGrid = 15,
    connectionRules,
  } = config

  // Ensure all edges have ids
  const edgesWithIds = initialEdges.map((e) => ({
    ...e,
    id: edgeId(e),
    type: e.type ?? defaultEdgeType,
  }))

  // ── Core signals ─────────────────────────────────────────────────────────

  const nodes = signal<FlowNode[]>([...initialNodes])
  const edges = signal<FlowEdge[]>(edgesWithIds)
  const viewport = signal({ x: 0, y: 0, zoom: 1 })

  // Track selected state separately for O(1) lookups
  const selectedNodeIds = signal(new Set<string>())
  const selectedEdgeIds = signal(new Set<string>())

  // ── Computed ─────────────────────────────────────────────────────────────

  const zoom = computed(() => viewport().zoom)

  const selectedNodes = computed(() => [...selectedNodeIds()])
  const selectedEdges = computed(() => [...selectedEdgeIds()])

  // ── Listeners ────────────────────────────────────────────────────────────

  const connectListeners = new Set<(connection: Connection) => void>()
  const nodesChangeListeners = new Set<(changes: NodeChange[]) => void>()
  const nodeClickListeners = new Set<(node: FlowNode) => void>()
  const edgeClickListeners = new Set<(edge: FlowEdge) => void>()

  function emitNodeChanges(changes: NodeChange[]) {
    for (const cb of nodesChangeListeners) cb(changes)
  }

  // ── Node operations ──────────────────────────────────────────────────────

  function getNode(id: string): FlowNode | undefined {
    return nodes.peek().find((n) => n.id === id)
  }

  function addNode(node: FlowNode): void {
    nodes.update((nds) => [...nds, node])
  }

  function removeNode(id: string): void {
    batch(() => {
      nodes.update((nds) => nds.filter((n) => n.id !== id))
      // Remove connected edges
      edges.update((eds) =>
        eds.filter((e) => e.source !== id && e.target !== id),
      )
      selectedNodeIds.update((set) => {
        const next = new Set(set)
        next.delete(id)
        return next
      })
    })
    emitNodeChanges([{ type: 'remove', id }])
  }

  function updateNode(id: string, update: Partial<FlowNode>): void {
    nodes.update((nds) =>
      nds.map((n) => (n.id === id ? { ...n, ...update } : n)),
    )
  }

  function updateNodePosition(id: string, position: XYPosition): void {
    const pos = snapToGrid
      ? {
          x: Math.round(position.x / snapGrid) * snapGrid,
          y: Math.round(position.y / snapGrid) * snapGrid,
        }
      : position

    nodes.update((nds) =>
      nds.map((n) => (n.id === id ? { ...n, position: pos } : n)),
    )
    emitNodeChanges([{ type: 'position', id, position: pos }])
  }

  // ── Edge operations ──────────────────────────────────────────────────────

  function getEdge(id: string): FlowEdge | undefined {
    return edges.peek().find((e) => e.id === id)
  }

  function addEdge(edge: FlowEdge): void {
    const newEdge = {
      ...edge,
      id: edgeId(edge),
      type: edge.type ?? defaultEdgeType,
    }

    // Don't add duplicate edges
    const existing = edges.peek()
    if (existing.some((e) => e.id === newEdge.id)) return

    edges.update((eds) => [...eds, newEdge])

    // Notify connect listeners
    const connection: Connection = {
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    }
    for (const cb of connectListeners) cb(connection)
  }

  function removeEdge(id: string): void {
    edges.update((eds) => eds.filter((e) => e.id !== id))
    selectedEdgeIds.update((set) => {
      const next = new Set(set)
      next.delete(id)
      return next
    })
  }

  function isValidConnection(connection: Connection): boolean {
    if (!connectionRules) return true

    // Find source node type
    const sourceNode = getNode(connection.source)
    if (!sourceNode) return false

    const sourceType = sourceNode.type ?? 'default'
    const rule = connectionRules[sourceType]
    if (!rule) return true // no rule = allow

    // Find target node type
    const targetNode = getNode(connection.target)
    if (!targetNode) return false

    const targetType = targetNode.type ?? 'default'
    return rule.outputs.includes(targetType)
  }

  // ── Selection ────────────────────────────────────────────────────────────

  function selectNode(id: string, additive = false): void {
    selectedNodeIds.update((set) => {
      const next = additive ? new Set(set) : new Set<string>()
      next.add(id)
      return next
    })
    if (!additive) {
      selectedEdgeIds.set(new Set())
    }
  }

  function deselectNode(id: string): void {
    selectedNodeIds.update((set) => {
      const next = new Set(set)
      next.delete(id)
      return next
    })
  }

  function selectEdge(id: string, additive = false): void {
    selectedEdgeIds.update((set) => {
      const next = additive ? new Set(set) : new Set<string>()
      next.add(id)
      return next
    })
    if (!additive) {
      selectedNodeIds.set(new Set())
    }
  }

  function clearSelection(): void {
    batch(() => {
      selectedNodeIds.set(new Set())
      selectedEdgeIds.set(new Set())
    })
  }

  function selectAll(): void {
    selectedNodeIds.set(new Set(nodes.peek().map((n) => n.id)))
  }

  function deleteSelected(): void {
    batch(() => {
      const nodeIdsToRemove = selectedNodeIds.peek()
      const edgeIdsToRemove = selectedEdgeIds.peek()

      if (nodeIdsToRemove.size > 0) {
        nodes.update((nds) => nds.filter((n) => !nodeIdsToRemove.has(n.id)))
        // Also remove edges connected to deleted nodes
        edges.update((eds) =>
          eds.filter(
            (e) =>
              !nodeIdsToRemove.has(e.source) &&
              !nodeIdsToRemove.has(e.target) &&
              !edgeIdsToRemove.has(e.id!),
          ),
        )
      } else if (edgeIdsToRemove.size > 0) {
        edges.update((eds) => eds.filter((e) => !edgeIdsToRemove.has(e.id!)))
      }

      selectedNodeIds.set(new Set())
      selectedEdgeIds.set(new Set())
    })
  }

  // ── Viewport ─────────────────────────────────────────────────────────────

  function fitView(
    nodeIds?: string[],
    padding = config.fitViewPadding ?? 0.1,
  ): void {
    const targetNodes = nodeIds
      ? nodes.peek().filter((n) => nodeIds.includes(n.id))
      : nodes.peek()

    if (targetNodes.length === 0) return

    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    for (const node of targetNodes) {
      const w = node.width ?? 150
      const h = node.height ?? 40
      minX = Math.min(minX, node.position.x)
      minY = Math.min(minY, node.position.y)
      maxX = Math.max(maxX, node.position.x + w)
      maxY = Math.max(maxY, node.position.y + h)
    }

    const graphWidth = maxX - minX
    const graphHeight = maxY - minY

    // Assume container is 800x600 if we don't know (will be updated by component)
    const containerWidth = 800
    const containerHeight = 600

    const zoomX = containerWidth / (graphWidth * (1 + padding * 2))
    const zoomY = containerHeight / (graphHeight * (1 + padding * 2))
    const newZoom = Math.min(Math.max(Math.min(zoomX, zoomY), minZoom), maxZoom)

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    viewport.set({
      x: containerWidth / 2 - centerX * newZoom,
      y: containerHeight / 2 - centerY * newZoom,
      zoom: newZoom,
    })
  }

  function zoomTo(z: number): void {
    viewport.update((v) => ({
      ...v,
      zoom: Math.min(Math.max(z, minZoom), maxZoom),
    }))
  }

  function zoomIn(): void {
    viewport.update((v) => ({
      ...v,
      zoom: Math.min(v.zoom * 1.2, maxZoom),
    }))
  }

  function zoomOut(): void {
    viewport.update((v) => ({
      ...v,
      zoom: Math.max(v.zoom / 1.2, minZoom),
    }))
  }

  function panTo(position: XYPosition): void {
    viewport.update((v) => ({
      ...v,
      x: -position.x * v.zoom,
      y: -position.y * v.zoom,
    }))
  }

  function isNodeVisible(id: string): boolean {
    const node = getNode(id)
    if (!node) return false
    // Simplified check — actual implementation would use container dimensions
    const v = viewport.peek()
    const w = node.width ?? 150
    const h = node.height ?? 40
    const screenX = node.position.x * v.zoom + v.x
    const screenY = node.position.y * v.zoom + v.y
    const screenW = w * v.zoom
    const screenH = h * v.zoom
    return (
      screenX + screenW > 0 &&
      screenX < 800 &&
      screenY + screenH > 0 &&
      screenY < 600
    )
  }

  // ── Layout ───────────────────────────────────────────────────────────────

  async function layout(
    algorithm: LayoutAlgorithm = 'layered',
    options: LayoutOptions = {},
  ): Promise<void> {
    const currentNodes = nodes.peek()
    const currentEdges = edges.peek()

    const positions = await computeLayout(
      currentNodes,
      currentEdges,
      algorithm,
      options,
    )

    batch(() => {
      nodes.update((nds) =>
        nds.map((node) => {
          const pos = positions.find((p) => p.id === node.id)
          return pos ? { ...node, position: pos.position } : node
        }),
      )
    })
  }

  // ── Batch ────────────────────────────────────────────────────────────────

  function batchOp(fn: () => void): void {
    batch(fn)
  }

  // ── Graph queries ────────────────────────────────────────────────────────

  function getConnectedEdges(nodeId: string): FlowEdge[] {
    return edges
      .peek()
      .filter((e) => e.source === nodeId || e.target === nodeId)
  }

  function getIncomers(nodeId: string): FlowNode[] {
    const incomingEdges = edges.peek().filter((e) => e.target === nodeId)
    const sourceIds = new Set(incomingEdges.map((e) => e.source))
    return nodes.peek().filter((n) => sourceIds.has(n.id))
  }

  function getOutgoers(nodeId: string): FlowNode[] {
    const outgoingEdges = edges.peek().filter((e) => e.source === nodeId)
    const targetIds = new Set(outgoingEdges.map((e) => e.target))
    return nodes.peek().filter((n) => targetIds.has(n.id))
  }

  // ── Listeners ────────────────────────────────────────────────────────────

  function onConnect(callback: (connection: Connection) => void): () => void {
    connectListeners.add(callback)
    return () => connectListeners.delete(callback)
  }

  function onNodesChange(
    callback: (changes: NodeChange[]) => void,
  ): () => void {
    nodesChangeListeners.add(callback)
    return () => nodesChangeListeners.delete(callback)
  }

  function onNodeClick(callback: (node: FlowNode) => void): () => void {
    nodeClickListeners.add(callback)
    return () => nodeClickListeners.delete(callback)
  }

  function onEdgeClick(callback: (edge: FlowEdge) => void): () => void {
    edgeClickListeners.add(callback)
    return () => edgeClickListeners.delete(callback)
  }

  // ── Dispose ──────────────────────────────────────────────────────────────

  function dispose(): void {
    connectListeners.clear()
    nodesChangeListeners.clear()
    nodeClickListeners.clear()
    edgeClickListeners.clear()
  }

  // ── Initial fitView ──────────────────────────────────────────────────────

  if (config.fitView) {
    fitView()
  }

  return {
    nodes,
    edges,
    viewport,
    zoom,
    selectedNodes,
    selectedEdges,
    getNode,
    addNode,
    removeNode,
    updateNode,
    updateNodePosition,
    getEdge,
    addEdge,
    removeEdge,
    isValidConnection,
    selectNode,
    deselectNode,
    selectEdge,
    clearSelection,
    selectAll,
    deleteSelected,
    fitView,
    zoomTo,
    zoomIn,
    zoomOut,
    panTo,
    isNodeVisible,
    layout,
    batch: batchOp,
    getConnectedEdges,
    getIncomers,
    getOutgoers,
    onConnect,
    onNodesChange,
    onNodeClick,
    onEdgeClick,
    config,
    dispose,
  }
}
