import type { Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { Computed, Signal } from '@pyreon/reactivity'

// ─── Editor config ───────────────────────────────────────────────────────────

export type EditorLanguage =
  | 'javascript'
  | 'typescript'
  | 'jsx'
  | 'tsx'
  | 'html'
  | 'css'
  | 'json'
  | 'markdown'
  | 'python'
  | 'rust'
  | 'sql'
  | 'xml'
  | 'yaml'
  | 'cpp'
  | 'java'
  | 'go'
  | 'php'
  | 'ruby'
  | 'shell'
  | 'plain'

export type EditorTheme = 'light' | 'dark' | Extension

export interface EditorConfig {
  /** Initial value */
  value?: string
  /** Language for syntax highlighting — lazy-loaded */
  language?: EditorLanguage
  /** Theme — 'light', 'dark', or a custom CodeMirror theme extension */
  theme?: EditorTheme
  /** Show line numbers — default: true */
  lineNumbers?: boolean
  /** Read-only mode — default: false */
  readOnly?: boolean
  /** Enable code folding — default: true */
  foldGutter?: boolean
  /** Enable bracket matching — default: true */
  bracketMatching?: boolean
  /** Enable autocomplete — default: true */
  autocomplete?: boolean
  /** Enable search (Cmd+F) — default: true */
  search?: boolean
  /** Enable lint/diagnostics — default: false */
  lint?: boolean
  /** Tab size — default: 2 */
  tabSize?: number
  /** Enable indent guides — default: true */
  indentGuides?: boolean
  /** Enable line wrapping — default: false */
  lineWrapping?: boolean
  /** Placeholder text when empty */
  placeholder?: string
  /** Enable minimap — default: false */
  minimap?: boolean
  /** Additional CodeMirror extensions */
  extensions?: Extension[]
  /** Called when value changes */
  onChange?: (value: string) => void
}

// ─── Editor instance ─────────────────────────────────────────────────────────

export interface EditorInstance {
  /** Current editor value — reactive signal */
  value: Signal<string>
  /** Current language — reactive signal */
  language: Signal<EditorLanguage>
  /** Current theme — reactive signal */
  theme: Signal<EditorTheme>
  /** Read-only state — reactive signal */
  readOnly: Signal<boolean>
  /** Cursor position — reactive */
  cursor: Computed<{ line: number; col: number }>
  /** Current selection — reactive */
  selection: Computed<{ from: number; to: number; text: string }>
  /** Line count — reactive */
  lineCount: Computed<number>
  /** Whether the editor has focus — reactive */
  focused: Signal<boolean>
  /** The underlying CodeMirror EditorView — null until mounted */
  view: Signal<EditorView | null>
  /** Focus the editor */
  focus: () => void
  /** Insert text at cursor */
  insert: (text: string) => void
  /** Replace selection */
  replaceSelection: (text: string) => void
  /** Select a range */
  select: (from: number, to: number) => void
  /** Select all */
  selectAll: () => void
  /** Go to a specific line */
  goToLine: (line: number) => void
  /** Undo */
  undo: () => void
  /** Redo */
  redo: () => void
  /** Fold all */
  foldAll: () => void
  /** Unfold all */
  unfoldAll: () => void
  /** The editor configuration */
  config: EditorConfig
  /** Dispose — clean up view and listeners */
  dispose: () => void
}

// ─── Component props ─────────────────────────────────────────────────────────

export interface CodeEditorProps {
  instance: EditorInstance
  style?: string
  class?: string
}

export interface DiffEditorProps {
  /** Original (left) content */
  original: string | Signal<string>
  /** Modified (right) content */
  modified: string | Signal<string>
  /** Language for both panels */
  language?: EditorLanguage
  /** Theme */
  theme?: EditorTheme
  /** Show inline diff instead of side-by-side — default: false */
  inline?: boolean
  /** Read-only — default: true */
  readOnly?: boolean
  style?: string
  class?: string
}
