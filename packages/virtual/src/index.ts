// ─── TanStack Virtual core re-exports ────────────────────────────────────────
// Users can import utilities and types from @pyreon/virtual directly.

export {
  defaultKeyExtractor,
  defaultRangeExtractor,
  observeElementOffset,
  observeElementRect,
  observeWindowOffset,
  observeWindowRect,
  elementScroll,
  windowScroll,
  measureElement,
  Virtualizer,
} from '@tanstack/virtual-core'

export type {
  VirtualizerOptions,
  VirtualItem,
  Range,
  Rect,
  ScrollToOptions,
} from '@tanstack/virtual-core'

// ─── Pyreon adapter ─────────────────────────────────────────────────────────────

export { useVirtualizer } from './use-virtualizer'
export type {
  UseVirtualizerOptions,
  UseVirtualizerResult,
} from './use-virtualizer'

export { useWindowVirtualizer } from './use-window-virtualizer'
export type {
  UseWindowVirtualizerOptions,
  UseWindowVirtualizerResult,
} from './use-window-virtualizer'
