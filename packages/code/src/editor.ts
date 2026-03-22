import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete'
import {
  redo as cmRedo,
  undo as cmUndo,
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands'
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language'
import { lintKeymap } from '@codemirror/lint'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderExt,
  rectangularSelection,
} from '@codemirror/view'
import { computed, effect, signal } from '@pyreon/reactivity'
import { loadLanguage } from './languages'
import { minimapExtension } from './minimap'
import { resolveTheme } from './themes'
import type {
  EditorConfig,
  EditorInstance,
  EditorLanguage,
  EditorTheme,
} from './types'

/**
 * Create a reactive code editor instance.
 *
 * The editor state (value, language, theme, cursor, selection) is backed
 * by signals. The CodeMirror EditorView is created when mounted via
 * the `<CodeEditor>` component.
 *
 * @param config - Editor configuration
 * @returns A reactive EditorInstance
 *
 * @example
 * ```tsx
 * const editor = createEditor({
 *   value: 'const x = 1',
 *   language: 'typescript',
 *   theme: 'dark',
 * })
 *
 * editor.value()           // reactive
 * editor.value.set('new')  // updates editor
 *
 * <CodeEditor instance={editor} />
 * ```
 */
export function createEditor(config: EditorConfig = {}): EditorInstance {
  const {
    value: initialValue = '',
    language: initialLanguage = 'plain',
    theme: initialTheme = 'light',
    lineNumbers: showLineNumbers = true,
    readOnly: initialReadOnly = false,
    foldGutter: showFoldGutter = true,
    bracketMatching: enableBracketMatching = true,
    autocomplete: enableAutocomplete = true,
    search: _enableSearch = true,
    tabSize: configTabSize = 2,
    lineWrapping: enableLineWrapping = false,
    placeholder: placeholderText,
    minimap: enableMinimap = false,
    extensions: userExtensions = [],
    onChange,
  } = config

  // ── Reactive state ───────────────────────────────────────────────────

  const value = signal(initialValue)
  const language = signal<EditorLanguage>(initialLanguage)
  const theme = signal<EditorTheme>(initialTheme)
  const readOnly = signal(initialReadOnly)
  const focused = signal(false)
  const view = signal<EditorView | null>(null)

  // Internal version tracker for cursor/selection reactivity
  const docVersion = signal(0)

  // ── Compartments (for dynamic reconfiguration) ─────────────────────

  const languageCompartment = new Compartment()
  const themeCompartment = new Compartment()
  const readOnlyCompartment = new Compartment()

  // ── Computed ─────────────────────────────────────────────────────────

  const cursor = computed(() => {
    docVersion() // subscribe to changes
    const v = view.peek()
    if (!v) return { line: 1, col: 1 }
    const pos = v.state.selection.main.head
    const line = v.state.doc.lineAt(pos)
    return { line: line.number, col: pos - line.from + 1 }
  })

  const selection = computed(() => {
    docVersion()
    const v = view.peek()
    if (!v) return { from: 0, to: 0, text: '' }
    const sel = v.state.selection.main
    return {
      from: sel.from,
      to: sel.to,
      text: v.state.sliceDoc(sel.from, sel.to),
    }
  })

  const lineCount = computed(() => {
    docVersion()
    const v = view.peek()
    return v ? v.state.doc.lines : initialValue.split('\n').length
  })

  // ── Build extensions ─────────────────────────────────────────────────

  function buildExtensions(langExt: Extension): Extension[] {
    const exts: Extension[] = [
      // Core
      history(),
      drawSelection(),
      dropCursor(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      highlightSelectionMatches(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      indentUnit.of(' '.repeat(configTabSize)),

      // Keymaps
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
        indentWithTab,
      ]),

      // Dynamic compartments
      languageCompartment.of(langExt),
      themeCompartment.of(resolveTheme(initialTheme)),
      readOnlyCompartment.of(EditorState.readOnly.of(initialReadOnly)),

      // Update listener — sync CM changes to signal
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString()
          // Avoid infinite loop: only set if different
          if (newValue !== value.peek()) {
            value.set(newValue)
            onChange?.(newValue)
          }
          docVersion.update((v) => v + 1)
        }
        if (update.selectionSet) {
          docVersion.update((v) => v + 1)
        }
        if (update.focusChanged) {
          focused.set(update.view.hasFocus)
        }
      }),
    ]

    // Optional features
    if (showLineNumbers) exts.push(lineNumbers())
    if (showFoldGutter) exts.push(foldGutter())
    if (enableBracketMatching) exts.push(bracketMatching(), closeBrackets())
    if (enableAutocomplete) exts.push(autocompletion())
    if (enableLineWrapping) exts.push(EditorView.lineWrapping)
    if (placeholderText) exts.push(placeholderExt(placeholderText))
    if (enableMinimap) exts.push(minimapExtension())

    // User extensions
    exts.push(...userExtensions)

    return exts
  }

  // ── Mount helper — called by CodeEditor component ────────────────────

  let mounted = false

  async function mount(parent: HTMLElement): Promise<void> {
    if (mounted) return

    const langExt = await loadLanguage(language.peek())
    const extensions = buildExtensions(langExt)

    const state = EditorState.create({
      doc: value.peek(),
      extensions,
    })

    const editorView = new EditorView({
      state,
      parent,
    })

    view.set(editorView)
    mounted = true

    // Sync signal → editor for value changes from outside
    effect(() => {
      const val = value()
      const v = view.peek()
      if (!v) return
      const current = v.state.doc.toString()
      if (val !== current) {
        v.dispatch({
          changes: { from: 0, to: current.length, insert: val },
        })
      }
    })

    // Sync language changes
    effect(() => {
      const lang = language()
      const v = view.peek()
      if (!v) return
      loadLanguage(lang).then((ext) => {
        v.dispatch({ effects: languageCompartment.reconfigure(ext) })
      })
    })

    // Sync theme changes
    effect(() => {
      const t = theme()
      const v = view.peek()
      if (!v) return
      v.dispatch({ effects: themeCompartment.reconfigure(resolveTheme(t)) })
    })

    // Sync readOnly changes
    effect(() => {
      const ro = readOnly()
      const v = view.peek()
      if (!v) return
      v.dispatch({
        effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(ro)),
      })
    })
  }

  // ── Actions ──────────────────────────────────────────────────────────

  function focus(): void {
    view.peek()?.focus()
  }

  function insert(text: string): void {
    const v = view.peek()
    if (!v) return
    const pos = v.state.selection.main.head
    v.dispatch({ changes: { from: pos, insert: text } })
  }

  function replaceSelection(text: string): void {
    const v = view.peek()
    if (!v) return
    v.dispatch(v.state.replaceSelection(text))
  }

  function select(from: number, to: number): void {
    const v = view.peek()
    if (!v) return
    v.dispatch({ selection: { anchor: from, head: to } })
  }

  function selectAll(): void {
    const v = view.peek()
    if (!v) return
    v.dispatch({ selection: { anchor: 0, head: v.state.doc.length } })
  }

  function goToLine(line: number): void {
    const v = view.peek()
    if (!v) return
    const lineInfo = v.state.doc.line(
      Math.min(Math.max(1, line), v.state.doc.lines),
    )
    v.dispatch({
      selection: { anchor: lineInfo.from },
      scrollIntoView: true,
    })
    v.focus()
  }

  function undo(): void {
    const v = view.peek()
    if (v) cmUndo(v)
  }

  function redo(): void {
    const v = view.peek()
    if (v) cmRedo(v)
  }

  function foldAll(): void {
    const v = view.peek()
    if (!v) return
    const { foldAll: foldAllCmd } = require('@codemirror/language')
    foldAllCmd(v)
  }

  function unfoldAll(): void {
    const v = view.peek()
    if (!v) return
    const { unfoldAll: unfoldAllCmd } = require('@codemirror/language')
    unfoldAllCmd(v)
  }

  function dispose(): void {
    const v = view.peek()
    if (v) {
      v.destroy()
      view.set(null)
      mounted = false
    }
  }

  // ── Expose mount for component ─────────────────────────────────────

  const instance: EditorInstance & { _mount: typeof mount } = {
    value,
    language,
    theme,
    readOnly,
    cursor,
    selection,
    lineCount,
    focused,
    view,
    focus,
    insert,
    replaceSelection,
    select,
    selectAll,
    goToLine,
    undo,
    redo,
    foldAll,
    unfoldAll,
    config,
    dispose,
    _mount: mount,
  }

  return instance
}
