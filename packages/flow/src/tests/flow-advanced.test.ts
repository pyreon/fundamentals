import { describe, expect, it } from 'vitest'
import {
  getBezierPath,
  getSmartHandlePositions,
  getSmoothStepPath,
  getWaypointPath,
} from '../edges'
import { createFlow } from '../flow'
import { Position } from '../types'

// ─── Edge paths — additional coverage ────────────────────────────────────────

describe('edge paths — additional branches', () => {
  it('getBezierPath with Top/Left source positions', () => {
    const top = getBezierPath({
      sourceX: 100,
      sourceY: 100,
      sourcePosition: Position.Top,
      targetX: 200,
      targetY: 0,
      targetPosition: Position.Bottom,
    })
    expect(top.path).toMatch(/^M/)

    const left = getBezierPath({
      sourceX: 100,
      sourceY: 100,
      sourcePosition: Position.Left,
      targetX: 0,
      targetY: 200,
      targetPosition: Position.Right,
    })
    expect(left.path).toMatch(/^M/)
  })

  it('getBezierPath with all target positions', () => {
    for (const pos of [
      Position.Top,
      Position.Right,
      Position.Bottom,
      Position.Left,
    ]) {
      const result = getBezierPath({
        sourceX: 0,
        sourceY: 0,
        sourcePosition: Position.Right,
        targetX: 200,
        targetY: 100,
        targetPosition: pos,
      })
      expect(result.path).toMatch(/^M/)
    }
  })

  it('getSmoothStepPath with horizontal→horizontal positions', () => {
    const result = getSmoothStepPath({
      sourceX: 0,
      sourceY: 0,
      sourcePosition: Position.Right,
      targetX: 200,
      targetY: 100,
      targetPosition: Position.Right,
    })
    expect(result.path).toMatch(/^M/)
  })

  it('getSmoothStepPath with vertical→vertical positions', () => {
    const result = getSmoothStepPath({
      sourceX: 0,
      sourceY: 0,
      sourcePosition: Position.Bottom,
      targetX: 100,
      targetY: 200,
      targetPosition: Position.Top,
    })
    expect(result.path).toMatch(/^M/)
  })

  it('getSmoothStepPath with vertical→horizontal', () => {
    const result = getSmoothStepPath({
      sourceX: 0,
      sourceY: 0,
      sourcePosition: Position.Bottom,
      targetX: 200,
      targetY: 100,
      targetPosition: Position.Left,
    })
    expect(result.path).toMatch(/^M/)
  })

  it('getSmoothStepPath with Left source', () => {
    const result = getSmoothStepPath({
      sourceX: 200,
      sourceY: 0,
      sourcePosition: Position.Left,
      targetX: 0,
      targetY: 100,
      targetPosition: Position.Top,
    })
    expect(result.path).toMatch(/^M/)
  })

  it('getSmoothStepPath with Bottom target', () => {
    const result = getSmoothStepPath({
      sourceX: 0,
      sourceY: 0,
      sourcePosition: Position.Right,
      targetX: 200,
      targetY: 100,
      targetPosition: Position.Bottom,
    })
    expect(result.path).toMatch(/^M/)
  })

  it('getSmartHandlePositions with nodes at various positions', () => {
    // Target to the left
    const leftward = getSmartHandlePositions(
      { id: '1', position: { x: 200, y: 0 }, data: {} },
      { id: '2', position: { x: 0, y: 0 }, data: {} },
    )
    expect(leftward.sourcePosition).toBe(Position.Left)
    expect(leftward.targetPosition).toBe(Position.Right)

    // Target below
    const downward = getSmartHandlePositions(
      { id: '1', position: { x: 0, y: 0 }, data: {} },
      { id: '2', position: { x: 0, y: 300 }, data: {} },
    )
    expect(downward.sourcePosition).toBe(Position.Bottom)
    expect(downward.targetPosition).toBe(Position.Top)

    // Target above
    const upward = getSmartHandlePositions(
      { id: '1', position: { x: 0, y: 300 }, data: {} },
      { id: '2', position: { x: 0, y: 0 }, data: {} },
    )
    expect(upward.sourcePosition).toBe(Position.Top)
    expect(upward.targetPosition).toBe(Position.Bottom)
  })

  it('getSmartHandlePositions with configured handles', () => {
    const result = getSmartHandlePositions(
      {
        id: '1',
        position: { x: 0, y: 0 },
        data: {},
        sourceHandles: [
          { type: 'source', position: Position.Bottom, id: 'out' },
        ],
      },
      {
        id: '2',
        position: { x: 200, y: 200 },
        data: {},
        targetHandles: [{ type: 'target', position: Position.Top, id: 'in' }],
      },
    )
    // Should use configured handle positions
    expect(result.sourcePosition).toBe(Position.Bottom)
    expect(result.targetPosition).toBe(Position.Top)
  })

  it('getWaypointPath with single waypoint', () => {
    const result = getWaypointPath({
      sourceX: 0,
      sourceY: 0,
      targetX: 200,
      targetY: 0,
      waypoints: [{ x: 100, y: 50 }],
    })
    expect(result.path).toBe('M0,0 L100,50 L200,0')
    expect(result.labelX).toBe(100)
    expect(result.labelY).toBe(50)
  })
})

// ─── Flow — advanced operations ──────────────────────────────────────────────

describe('createFlow — advanced', () => {
  describe('resolveCollisions', () => {
    it('pushes overlapping nodes apart', () => {
      const flow = createFlow({
        nodes: [
          {
            id: '1',
            position: { x: 0, y: 0 },
            width: 100,
            height: 50,
            data: {},
          },
          {
            id: '2',
            position: { x: 50, y: 0 },
            width: 100,
            height: 50,
            data: {},
          },
        ],
      })

      flow.resolveCollisions('1')
      // Node 2 should have moved (either X or Y)
      const node2 = flow.getNode('2')!
      const moved = node2.position.x !== 50 || node2.position.y !== 0
      expect(moved).toBe(true)
    })

    it('does nothing when no overlaps', () => {
      const flow = createFlow({
        nodes: [
          {
            id: '1',
            position: { x: 0, y: 0 },
            width: 100,
            height: 50,
            data: {},
          },
          {
            id: '2',
            position: { x: 500, y: 500 },
            width: 100,
            height: 50,
            data: {},
          },
        ],
      })

      flow.resolveCollisions('1')
      expect(flow.getNode('2')!.position).toEqual({ x: 500, y: 500 })
    })

    it('resolves vertical overlaps', () => {
      const flow = createFlow({
        nodes: [
          {
            id: '1',
            position: { x: 0, y: 0 },
            width: 200,
            height: 50,
            data: {},
          },
          {
            id: '2',
            position: { x: 0, y: 30 },
            width: 200,
            height: 50,
            data: {},
          },
        ],
      })

      flow.resolveCollisions('1')
      const node2 = flow.getNode('2')!
      // Should push vertically since horizontal overlap is larger
      expect(node2.position.y).not.toBe(30)
    })
  })

  describe('getChildNodes / getAbsolutePosition', () => {
    it('returns child nodes of a group', () => {
      const flow = createFlow({
        nodes: [
          {
            id: 'group',
            position: { x: 0, y: 0 },
            group: true,
            data: {},
          },
          {
            id: 'child1',
            position: { x: 10, y: 10 },
            parentId: 'group',
            data: {},
          },
          {
            id: 'child2',
            position: { x: 20, y: 20 },
            parentId: 'group',
            data: {},
          },
          { id: 'other', position: { x: 100, y: 100 }, data: {} },
        ],
      })

      const children = flow.getChildNodes('group')
      expect(children).toHaveLength(2)
      expect(children.map((n) => n.id)).toEqual(
        expect.arrayContaining(['child1', 'child2']),
      )
    })

    it('getAbsolutePosition accounts for parent offset', () => {
      const flow = createFlow({
        nodes: [
          {
            id: 'parent',
            position: { x: 100, y: 200 },
            data: {},
          },
          {
            id: 'child',
            position: { x: 10, y: 20 },
            parentId: 'parent',
            data: {},
          },
        ],
      })

      const abs = flow.getAbsolutePosition('child')
      expect(abs).toEqual({ x: 110, y: 220 })
    })

    it('getAbsolutePosition for root node returns position', () => {
      const flow = createFlow({
        nodes: [{ id: '1', position: { x: 50, y: 75 }, data: {} }],
      })

      expect(flow.getAbsolutePosition('1')).toEqual({ x: 50, y: 75 })
    })

    it('getAbsolutePosition for missing node returns 0,0', () => {
      const flow = createFlow()
      expect(flow.getAbsolutePosition('missing')).toEqual({ x: 0, y: 0 })
    })
  })

  describe('moveSelectedNodes', () => {
    it('moves all selected nodes by delta', () => {
      const flow = createFlow({
        nodes: [
          { id: '1', position: { x: 0, y: 0 }, data: {} },
          { id: '2', position: { x: 100, y: 0 }, data: {} },
          { id: '3', position: { x: 200, y: 0 }, data: {} },
        ],
      })

      flow.selectNode('1')
      flow.selectNode('2', true)
      flow.moveSelectedNodes(50, 25)

      expect(flow.getNode('1')!.position).toEqual({ x: 50, y: 25 })
      expect(flow.getNode('2')!.position).toEqual({ x: 150, y: 25 })
      expect(flow.getNode('3')!.position).toEqual({ x: 200, y: 0 }) // not selected
    })

    it('does nothing with no selection', () => {
      const flow = createFlow({
        nodes: [{ id: '1', position: { x: 0, y: 0 }, data: {} }],
      })

      flow.moveSelectedNodes(100, 100)
      expect(flow.getNode('1')!.position).toEqual({ x: 0, y: 0 })
    })
  })

  describe('getSnapLines', () => {
    it('snaps to aligned nodes', () => {
      const flow = createFlow({
        nodes: [
          {
            id: '1',
            position: { x: 100, y: 100 },
            width: 100,
            height: 50,
            data: {},
          },
          {
            id: '2',
            position: { x: 300, y: 200 },
            width: 100,
            height: 50,
            data: {},
          },
        ],
      })

      // Move node 2 close to node 1's center X
      const snap = flow.getSnapLines('2', { x: 98, y: 200 })
      expect(snap.x).not.toBeNull()
      expect(snap.snappedPosition.x).not.toBe(98)
    })

    it('returns null lines when no alignment', () => {
      const flow = createFlow({
        nodes: [
          {
            id: '1',
            position: { x: 0, y: 0 },
            width: 100,
            height: 50,
            data: {},
          },
          {
            id: '2',
            position: { x: 500, y: 500 },
            width: 100,
            height: 50,
            data: {},
          },
        ],
      })

      const snap = flow.getSnapLines('2', { x: 500, y: 500 })
      expect(snap.x).toBeNull()
      expect(snap.y).toBeNull()
    })

    it('snaps to left edge alignment', () => {
      const flow = createFlow({
        nodes: [
          {
            id: '1',
            position: { x: 100, y: 0 },
            width: 100,
            height: 50,
            data: {},
          },
          {
            id: '2',
            position: { x: 100, y: 100 },
            width: 100,
            height: 50,
            data: {},
          },
        ],
      })

      // Node 2 is already aligned on left edge
      const snap = flow.getSnapLines('2', { x: 102, y: 100 })
      expect(snap.snappedPosition.x).toBe(100) // snapped to left edge
    })

    it('snaps to right edge alignment', () => {
      const flow = createFlow({
        nodes: [
          {
            id: '1',
            position: { x: 100, y: 0 },
            width: 100,
            height: 50,
            data: {},
          },
          {
            id: '2',
            position: { x: 100, y: 100 },
            width: 100,
            height: 50,
            data: {},
          },
        ],
      })

      // Move node 2 so right edges almost align
      const snap = flow.getSnapLines('2', { x: 98, y: 100 })
      // Right edge of node1: 200, right edge of moved node2: 98+100=198
      // Diff = 2, within threshold 5
      expect(snap.snappedPosition.x).toBe(100) // snapped
    })

    it('snaps to center Y alignment', () => {
      const flow = createFlow({
        nodes: [
          {
            id: '1',
            position: { x: 0, y: 100 },
            width: 100,
            height: 50,
            data: {},
          },
          {
            id: '2',
            position: { x: 200, y: 0 },
            width: 100,
            height: 50,
            data: {},
          },
        ],
      })

      // center Y of node1 = 100+25 = 125
      // Move node2 so its center Y is close: y + 25 ≈ 125 → y ≈ 100
      const snap = flow.getSnapLines('2', { x: 200, y: 102 })
      expect(snap.snappedPosition.y).toBe(100) // snapped to center Y
    })

    it('snaps to bottom edge alignment', () => {
      const flow = createFlow({
        nodes: [
          {
            id: '1',
            position: { x: 0, y: 0 },
            width: 100,
            height: 50,
            data: {},
          },
          {
            id: '2',
            position: { x: 200, y: 0 },
            width: 100,
            height: 50,
            data: {},
          },
        ],
      })

      // bottom of node1 = 50, bottom of node2 = y + 50
      // For snap: abs(y+50 - 50) < 5 → abs(y) < 5
      const snap = flow.getSnapLines('2', { x: 200, y: 3 })
      expect(snap.snappedPosition.y).toBe(0) // snapped to bottom edge
    })

    it('returns original position for missing node', () => {
      const flow = createFlow()
      const snap = flow.getSnapLines('missing', { x: 100, y: 200 })
      expect(snap.snappedPosition).toEqual({ x: 100, y: 200 })
    })
  })

  describe('reconnectEdge', () => {
    it('changes edge source', () => {
      const flow = createFlow({
        nodes: [
          { id: '1', position: { x: 0, y: 0 }, data: {} },
          { id: '2', position: { x: 100, y: 0 }, data: {} },
          { id: '3', position: { x: 200, y: 0 }, data: {} },
        ],
        edges: [{ id: 'e1', source: '1', target: '2' }],
      })

      flow.reconnectEdge('e1', { source: '3' })
      expect(flow.getEdge('e1')!.source).toBe('3')
      expect(flow.getEdge('e1')!.target).toBe('2') // unchanged
    })

    it('changes edge target', () => {
      const flow = createFlow({
        nodes: [
          { id: '1', position: { x: 0, y: 0 }, data: {} },
          { id: '2', position: { x: 100, y: 0 }, data: {} },
          { id: '3', position: { x: 200, y: 0 }, data: {} },
        ],
        edges: [{ id: 'e1', source: '1', target: '2' }],
      })

      flow.reconnectEdge('e1', { target: '3' })
      expect(flow.getEdge('e1')!.target).toBe('3')
    })
  })

  describe('edge with custom id and handle', () => {
    it('generates id from source/target handles', () => {
      const flow = createFlow({
        nodes: [
          { id: '1', position: { x: 0, y: 0 }, data: {} },
          { id: '2', position: { x: 100, y: 0 }, data: {} },
        ],
        edges: [
          {
            source: '1',
            target: '2',
            sourceHandle: 'out',
            targetHandle: 'in',
          },
        ],
      })

      expect(flow.edges()[0]!.id).toBe('e-1-out-2-in')
    })
  })

  describe('fitView with initial config', () => {
    it('fits view on creation when config.fitView is true', () => {
      const flow = createFlow({
        nodes: [
          { id: '1', position: { x: 0, y: 0 }, data: {} },
          { id: '2', position: { x: 500, y: 500 }, data: {} },
        ],
        fitView: true,
      })

      // Viewport should have been adjusted
      const vp = flow.viewport()
      expect(vp.zoom).not.toBe(1)
    })
  })

  describe('proximity connect with connection rules', () => {
    it('respects connection rules', () => {
      const flow = createFlow({
        nodes: [
          {
            id: '1',
            type: 'output',
            position: { x: 0, y: 0 },
            data: {},
          },
          {
            id: '2',
            type: 'input',
            position: { x: 100, y: 0 },
            data: {},
          },
        ],
        connectionRules: {
          output: { outputs: [] }, // output can't connect to anything
        },
      })

      expect(flow.getProximityConnection('1', 200)).toBeNull()
    })
  })

  describe('undo/redo edge cases', () => {
    it('undo with empty history does nothing', () => {
      const flow = createFlow({
        nodes: [{ id: '1', position: { x: 0, y: 0 }, data: {} }],
      })

      flow.undo()
      expect(flow.nodes()).toHaveLength(1)
    })

    it('redo with empty redo stack does nothing', () => {
      const flow = createFlow({
        nodes: [{ id: '1', position: { x: 0, y: 0 }, data: {} }],
      })

      flow.redo()
      expect(flow.nodes()).toHaveLength(1)
    })

    it('multiple undo/redo cycles', () => {
      const flow = createFlow()

      flow.pushHistory()
      flow.addNode({ id: '1', position: { x: 0, y: 0 }, data: {} })

      flow.pushHistory()
      flow.addNode({ id: '2', position: { x: 100, y: 0 }, data: {} })

      expect(flow.nodes()).toHaveLength(2)

      flow.undo()
      expect(flow.nodes()).toHaveLength(1)

      flow.undo()
      expect(flow.nodes()).toHaveLength(0)

      flow.redo()
      expect(flow.nodes()).toHaveLength(1)

      flow.redo()
      expect(flow.nodes()).toHaveLength(2)
    })
  })

  describe('copy/paste with edges', () => {
    it('copies connected edges between selected nodes', () => {
      const flow = createFlow({
        nodes: [
          { id: '1', position: { x: 0, y: 0 }, data: {} },
          { id: '2', position: { x: 100, y: 0 }, data: {} },
          { id: '3', position: { x: 200, y: 0 }, data: {} },
        ],
        edges: [
          { source: '1', target: '2' },
          { source: '2', target: '3' },
        ],
      })

      flow.selectNode('1')
      flow.selectNode('2', true)
      flow.copySelected()
      flow.paste()

      // Should have 5 nodes (3 original + 2 pasted)
      expect(flow.nodes()).toHaveLength(5)
      // Should have 3 edges (2 original + 1 pasted connecting 1→2)
      expect(flow.edges()).toHaveLength(3)
    })

    it('copy with no selection does nothing', () => {
      const flow = createFlow({
        nodes: [{ id: '1', position: { x: 0, y: 0 }, data: {} }],
      })

      flow.copySelected()
      flow.paste()
      expect(flow.nodes()).toHaveLength(1) // nothing pasted because nothing was copied
    })
  })

  describe('listener callbacks', () => {
    it('onNodeDragStart/End can be registered', () => {
      const flow = createFlow({
        nodes: [{ id: '1', position: { x: 0, y: 0 }, data: {} }],
      })

      const starts: string[] = []
      const ends: string[] = []

      flow.onNodeDragStart((n) => starts.push(n.id))
      flow.onNodeDragEnd((n) => ends.push(n.id))

      // Emit manually via _emit
      flow._emit.nodeDragStart(flow.getNode('1')!)
      flow._emit.nodeDragEnd(flow.getNode('1')!)

      expect(starts).toEqual(['1'])
      expect(ends).toEqual(['1'])
    })

    it('onNodeDoubleClick', () => {
      const flow = createFlow({
        nodes: [{ id: '1', position: { x: 0, y: 0 }, data: {} }],
      })

      const clicked: string[] = []
      flow.onNodeDoubleClick((n) => clicked.push(n.id))

      flow._emit.nodeDoubleClick(flow.getNode('1')!)
      expect(clicked).toEqual(['1'])
    })

    it('onNodeClick / onEdgeClick', () => {
      const flow = createFlow({
        nodes: [
          { id: '1', position: { x: 0, y: 0 }, data: {} },
          { id: '2', position: { x: 100, y: 0 }, data: {} },
        ],
        edges: [{ id: 'e1', source: '1', target: '2' }],
      })

      const nodeClicks: string[] = []
      const edgeClicks: string[] = []

      flow.onNodeClick((n) => nodeClicks.push(n.id))
      flow.onEdgeClick((e) => edgeClicks.push(e.id!))

      flow._emit.nodeClick(flow.getNode('1')!)
      flow._emit.edgeClick(flow.getEdge('e1')!)

      expect(nodeClicks).toEqual(['1'])
      expect(edgeClicks).toEqual(['e1'])
    })
  })

  describe('containerSize', () => {
    it('containerSize signal exists with defaults', () => {
      const flow = createFlow()
      expect(flow.containerSize()).toEqual({ width: 800, height: 600 })
    })

    it('containerSize can be updated', () => {
      const flow = createFlow()
      flow.containerSize.set({ width: 1200, height: 900 })
      expect(flow.containerSize()).toEqual({ width: 1200, height: 900 })
    })
  })

  describe('clampToExtent', () => {
    it('returns position unchanged when no extent', () => {
      const flow = createFlow()
      expect(flow.clampToExtent({ x: -999, y: -999 })).toEqual({
        x: -999,
        y: -999,
      })
    })

    it('clamps to extent boundaries', () => {
      const flow = createFlow({
        nodeExtent: [
          [0, 0],
          [500, 500],
        ],
      })
      expect(flow.clampToExtent({ x: -10, y: -10 }, 100, 50)).toEqual({
        x: 0,
        y: 0,
      })
      expect(flow.clampToExtent({ x: 999, y: 999 }, 100, 50)).toEqual({
        x: 400,
        y: 450,
      })
    })
  })

  describe('edge default type', () => {
    it('uses defaultEdgeType from config', () => {
      const flow = createFlow({
        nodes: [
          { id: '1', position: { x: 0, y: 0 }, data: {} },
          { id: '2', position: { x: 100, y: 0 }, data: {} },
        ],
        edges: [{ source: '1', target: '2' }],
        defaultEdgeType: 'straight',
      })

      expect(flow.edges()[0]!.type).toBe('straight')
    })
  })

  describe('resolveCollisions — additional branches', () => {
    it('returns early for nonexistent node', () => {
      const flow = createFlow({
        nodes: [
          {
            id: '1',
            position: { x: 0, y: 0 },
            width: 100,
            height: 50,
            data: {},
          },
        ],
      })

      // Should not throw for missing node
      flow.resolveCollisions('nonexistent')
      expect(flow.getNode('1')!.position).toEqual({ x: 0, y: 0 })
    })

    it('resolves horizontal overlap when node is to the right', () => {
      const flow = createFlow({
        nodes: [
          {
            id: '1',
            position: { x: 80, y: 0 },
            width: 100,
            height: 50,
            data: {},
          },
          {
            id: '2',
            position: { x: 0, y: 0 },
            width: 100,
            height: 50,
            data: {},
          },
        ],
      })

      flow.resolveCollisions('1')
      const node2 = flow.getNode('2')!
      // Node 1 is to the right of node 2, so push should be in X direction
      expect(node2.position.x !== 0 || node2.position.y !== 0).toBe(true)
    })

    it('resolves vertical overlap when node is below', () => {
      const flow = createFlow({
        nodes: [
          {
            id: '1',
            position: { x: 0, y: 20 },
            width: 200,
            height: 50,
            data: {},
          },
          {
            id: '2',
            position: { x: 0, y: 0 },
            width: 200,
            height: 50,
            data: {},
          },
        ],
      })

      flow.resolveCollisions('1')
      const node2 = flow.getNode('2')!
      // Should push vertically since horizontal overlap is larger
      expect(node2.position.y !== 0).toBe(true)
    })

    it('uses default dimensions when width/height not set', () => {
      const flow = createFlow({
        nodes: [
          { id: '1', position: { x: 0, y: 0 }, data: {} },
          { id: '2', position: { x: 50, y: 10 }, data: {} },
        ],
      })

      flow.resolveCollisions('1')
      const node2 = flow.getNode('2')!
      expect(node2.position.x !== 50 || node2.position.y !== 10).toBe(true)
    })

    it('handles custom spacing parameter', () => {
      const flow = createFlow({
        nodes: [
          {
            id: '1',
            position: { x: 0, y: 0 },
            width: 100,
            height: 50,
            data: {},
          },
          {
            id: '2',
            position: { x: 50, y: 0 },
            width: 100,
            height: 50,
            data: {},
          },
        ],
      })

      flow.resolveCollisions('1', 50)
      const node2 = flow.getNode('2')!
      // Larger spacing should push further
      expect(node2.position.x !== 50 || node2.position.y !== 0).toBe(true)
    })
  })

  describe('getOverlappingNodes', () => {
    it('returns overlapping nodes', () => {
      const flow = createFlow({
        nodes: [
          {
            id: '1',
            position: { x: 0, y: 0 },
            width: 100,
            height: 50,
            data: {},
          },
          {
            id: '2',
            position: { x: 50, y: 20 },
            width: 100,
            height: 50,
            data: {},
          },
          {
            id: '3',
            position: { x: 500, y: 500 },
            width: 100,
            height: 50,
            data: {},
          },
        ],
      })

      const overlapping = flow.getOverlappingNodes('1')
      expect(overlapping).toHaveLength(1)
      expect(overlapping[0]!.id).toBe('2')
    })

    it('returns empty for nonexistent node', () => {
      const flow = createFlow()
      expect(flow.getOverlappingNodes('missing')).toEqual([])
    })
  })

  describe('focusNode', () => {
    it('centers viewport on node and selects it', () => {
      const flow = createFlow({
        nodes: [
          { id: '1', position: { x: 0, y: 0 }, data: {} },
          {
            id: '2',
            position: { x: 500, y: 500 },
            width: 100,
            height: 50,
            data: {},
          },
        ],
      })

      flow.focusNode('2')
      // Node 2 should be selected (selectedNodes returns string IDs)
      expect(flow.selectedNodes()).toContain('2')
    })

    it('does nothing for nonexistent node', () => {
      const flow = createFlow({
        nodes: [{ id: '1', position: { x: 0, y: 0 }, data: {} }],
      })

      const vpBefore = { ...flow.viewport() }
      flow.focusNode('nonexistent')
      // Viewport shouldn't change immediately (animateViewport uses rAF)
      // But more importantly, no error thrown
      expect(flow.viewport().zoom).toBe(vpBefore.zoom)
    })

    it('uses provided focusZoom', () => {
      const flow = createFlow({
        nodes: [
          {
            id: '1',
            position: { x: 200, y: 200 },
            width: 100,
            height: 50,
            data: {},
          },
        ],
      })

      flow.focusNode('1', 2)
      // Should select the node (selectedNodes returns string IDs)
      expect(flow.selectedNodes()).toContain('1')
    })
  })

  describe('searchNodes', () => {
    it('finds nodes by label', () => {
      const flow = createFlow({
        nodes: [
          { id: '1', position: { x: 0, y: 0 }, data: { label: 'Hello World' } },
          { id: '2', position: { x: 100, y: 0 }, data: { label: 'Goodbye' } },
        ],
      })

      const results = flow.searchNodes('hello')
      expect(results).toHaveLength(1)
      expect(results[0]!.id).toBe('1')
    })

    it('falls back to node id when no label', () => {
      const flow = createFlow({
        nodes: [{ id: 'my-node', position: { x: 0, y: 0 }, data: {} }],
      })

      const results = flow.searchNodes('my-node')
      expect(results).toHaveLength(1)
    })
  })

  describe('findNodes', () => {
    it('filters nodes by predicate', () => {
      const flow = createFlow({
        nodes: [
          { id: '1', position: { x: 0, y: 0 }, type: 'input', data: {} },
          { id: '2', position: { x: 100, y: 0 }, type: 'output', data: {} },
          { id: '3', position: { x: 200, y: 0 }, type: 'input', data: {} },
        ],
      })

      const inputs = flow.findNodes((n) => n.type === 'input')
      expect(inputs).toHaveLength(2)
    })
  })

  describe('fromJSON edge cases', () => {
    it('restores nodes, edges, and viewport', () => {
      const flow = createFlow()
      flow.addNode({ id: 'x', position: { x: 0, y: 0 }, data: {} })

      flow.fromJSON({
        nodes: [
          { id: '1', position: { x: 10, y: 20 }, data: {} },
          { id: '2', position: { x: 30, y: 40 }, data: {} },
        ],
        edges: [{ source: '1', target: '2' }],
        viewport: { x: 100, y: 200, zoom: 1.5 },
      })

      expect(flow.nodes()).toHaveLength(2)
      expect(flow.edges()).toHaveLength(1)
      expect(flow.viewport()).toEqual({ x: 100, y: 200, zoom: 1.5 })
    })

    it('works without viewport in data', () => {
      const flow = createFlow()
      const vpBefore = { ...flow.viewport() }

      flow.fromJSON({
        nodes: [{ id: '1', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
      })

      expect(flow.nodes()).toHaveLength(1)
      expect(flow.viewport()).toEqual(vpBefore)
    })

    it('assigns default edge type and generates ids', () => {
      const flow = createFlow({ defaultEdgeType: 'smoothstep' })

      flow.fromJSON({
        nodes: [
          { id: '1', position: { x: 0, y: 0 }, data: {} },
          { id: '2', position: { x: 100, y: 0 }, data: {} },
        ],
        edges: [{ source: '1', target: '2' }],
      })

      expect(flow.edges()[0]!.type).toBe('smoothstep')
      expect(flow.edges()[0]!.id).toBeDefined()
    })

    it('clears selection after import', () => {
      const flow = createFlow({
        nodes: [{ id: '1', position: { x: 0, y: 0 }, data: {} }],
      })
      flow.selectNode('1')

      flow.fromJSON({
        nodes: [{ id: '2', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
      })

      expect(flow.selectedNodes()).toHaveLength(0)
    })
  })

  describe('toJSON', () => {
    it('returns deep clone of state', () => {
      const flow = createFlow({
        nodes: [
          { id: '1', position: { x: 0, y: 0 }, data: { label: 'test' } },
          { id: '2', position: { x: 100, y: 0 }, data: {} },
        ],
        edges: [{ source: '1', target: '2' }],
      })

      const json = flow.toJSON()
      expect(json.nodes).toHaveLength(2)
      expect(json.edges).toHaveLength(1)
      expect(json.viewport).toEqual(flow.viewport())

      // Verify it's a deep clone — mutations don't affect flow
      json.nodes[0]!.position.x = 999
      expect(flow.getNode('1')!.position.x).toBe(0)
    })
  })

  describe('animateViewport', () => {
    it('starts animation and updates viewport', async () => {
      const flow = createFlow()
      expect(flow.viewport()).toEqual({ x: 0, y: 0, zoom: 1 })

      flow.animateViewport({ x: 100, y: 200, zoom: 2 }, 50)

      // requestAnimationFrame is async — wait for animation to complete
      await new Promise((r) => setTimeout(r, 200))

      // After animation, viewport should be at target
      const vp = flow.viewport()
      expect(vp.x).toBeCloseTo(100, 0)
      expect(vp.y).toBeCloseTo(200, 0)
      expect(vp.zoom).toBeCloseTo(2, 0)
    })

    it('animates with partial target', async () => {
      const flow = createFlow()
      flow.animateViewport({ x: 50 }, 50)

      await new Promise((r) => setTimeout(r, 200))

      const vp = flow.viewport()
      expect(vp.x).toBeCloseTo(50, 0)
      expect(vp.y).toBe(0) // unchanged
      expect(vp.zoom).toBe(1) // unchanged
    })
  })

  describe('moveSelectedNodes — with extent', () => {
    it('respects node extent when moving', () => {
      const flow = createFlow({
        nodes: [{ id: '1', position: { x: 0, y: 0 }, data: {} }],
        nodeExtent: [
          [0, 0],
          [500, 500],
        ],
      })

      flow.selectNode('1')
      flow.moveSelectedNodes(50, 25)

      expect(flow.getNode('1')!.position).toEqual({ x: 50, y: 25 })
    })
  })

  describe('setNodeExtent', () => {
    it('sets and clears node extent', () => {
      const flow = createFlow()

      flow.setNodeExtent([
        [0, 0],
        [100, 100],
      ])
      expect(flow.clampToExtent({ x: 200, y: 200 }, 50, 50)).toEqual({
        x: 50,
        y: 50,
      })

      flow.setNodeExtent(null)
      expect(flow.clampToExtent({ x: 200, y: 200 })).toEqual({ x: 200, y: 200 })
    })
  })
})
