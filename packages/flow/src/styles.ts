/**
 * Default CSS styles for the flow diagram.
 * Inject via `<style>` tag or import in your CSS.
 *
 * @example
 * ```tsx
 * import { flowStyles } from '@pyreon/flow'
 *
 * // Inject once at app root
 * const style = document.createElement('style')
 * style.textContent = flowStyles
 * document.head.appendChild(style)
 * ```
 */
export const flowStyles = `
.pyreon-flow-edge-animated {
  stroke-dasharray: 5;
  animation: pyreon-flow-edge-dash 0.5s linear infinite;
}

@keyframes pyreon-flow-edge-dash {
  to {
    stroke-dashoffset: -10;
  }
}

.pyreon-flow-node.dragging {
  opacity: 0.8;
  z-index: 1000;
}

.pyreon-flow-node.selected {
  z-index: 100;
}

.pyreon-flow-handle:hover {
  transform: scale(1.3);
}

.pyreon-flow-resizer:hover {
  background: #3b82f6 !important;
}
`
