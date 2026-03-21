import type { VNodeChild } from '@pyreon/core'
import type { ControlsProps, FlowInstance } from '../types'

const positionStyles: Record<string, string> = {
  'top-left': 'top: 10px; left: 10px;',
  'top-right': 'top: 10px; right: 10px;',
  'bottom-left': 'bottom: 10px; left: 10px;',
  'bottom-right': 'bottom: 10px; right: 10px;',
}

/**
 * Zoom and viewport controls for the flow canvas.
 *
 * @example
 * ```tsx
 * <Flow instance={flow}>
 *   <Controls />
 * </Flow>
 * ```
 */
export function Controls(
  props: ControlsProps & { instance?: FlowInstance },
): VNodeChild {
  const {
    showZoomIn = true,
    showZoomOut = true,
    showFitView = true,
    showLock: _showLock = false,
    position = 'bottom-left',
    instance,
  } = props

  if (!instance) return null

  const baseStyle = `position: absolute; ${positionStyles[position] ?? positionStyles['bottom-left']} display: flex; flex-direction: column; gap: 4px; z-index: 5;`
  const btnStyle =
    'width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 14px; padding: 0;'

  return (
    <div class="pyreon-flow-controls" style={baseStyle}>
      {showZoomIn && (
        <button
          type="button"
          style={btnStyle}
          title="Zoom in"
          onClick={() => instance.zoomIn()}
        >
          +
        </button>
      )}
      {showZoomOut && (
        <button
          type="button"
          style={btnStyle}
          title="Zoom out"
          onClick={() => instance.zoomOut()}
        >
          -
        </button>
      )}
      {showFitView && (
        <button
          type="button"
          style={btnStyle}
          title="Fit view"
          onClick={() => instance.fitView()}
        >
          []
        </button>
      )}
    </div>
  )
}
