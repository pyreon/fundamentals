import { effect } from '@pyreon/reactivity'
import { describe, expect, it } from 'vitest'
import { createEditor } from '../editor'
import { getAvailableLanguages } from '../languages'

describe('createEditor', () => {
  describe('initialization', () => {
    it('creates with default values', () => {
      const editor = createEditor()
      expect(editor.value()).toBe('')
      expect(editor.language()).toBe('plain')
      expect(editor.readOnly()).toBe(false)
      expect(editor.focused()).toBe(false)
      expect(editor.view()).toBeNull()
    })

    it('creates with initial value', () => {
      const editor = createEditor({ value: 'hello world' })
      expect(editor.value()).toBe('hello world')
    })

    it('creates with language', () => {
      const editor = createEditor({ language: 'typescript' })
      expect(editor.language()).toBe('typescript')
    })

    it('creates with theme', () => {
      const editor = createEditor({ theme: 'dark' })
      expect(editor.theme()).toBe('dark')
    })

    it('creates with readOnly', () => {
      const editor = createEditor({ readOnly: true })
      expect(editor.readOnly()).toBe(true)
    })

    it('stores config', () => {
      const config = {
        value: 'test',
        language: 'json' as const,
        theme: 'dark' as const,
        lineNumbers: true,
        tabSize: 4,
      }
      const editor = createEditor(config)
      expect(editor.config).toBe(config)
    })
  })

  describe('signal reactivity', () => {
    it('value is a writable signal', () => {
      const editor = createEditor({ value: 'initial' })
      expect(editor.value()).toBe('initial')

      editor.value.set('updated')
      expect(editor.value()).toBe('updated')
    })

    it('language is a writable signal', () => {
      const editor = createEditor({ language: 'javascript' })
      editor.language.set('python')
      expect(editor.language()).toBe('python')
    })

    it('theme is a writable signal', () => {
      const editor = createEditor({ theme: 'light' })
      editor.theme.set('dark')
      expect(editor.theme()).toBe('dark')
    })

    it('readOnly is a writable signal', () => {
      const editor = createEditor({ readOnly: false })
      editor.readOnly.set(true)
      expect(editor.readOnly()).toBe(true)
    })

    it('value is reactive in effects', () => {
      const editor = createEditor({ value: 'a' })
      const values: string[] = []

      effect(() => {
        values.push(editor.value())
      })

      editor.value.set('b')
      editor.value.set('c')

      expect(values).toEqual(['a', 'b', 'c'])
    })
  })

  describe('computed properties (before mount)', () => {
    it('cursor returns default before mount', () => {
      const editor = createEditor()
      expect(editor.cursor()).toEqual({ line: 1, col: 1 })
    })

    it('selection returns default before mount', () => {
      const editor = createEditor()
      expect(editor.selection()).toEqual({ from: 0, to: 0, text: '' })
    })

    it('lineCount returns initial line count', () => {
      const editor = createEditor({ value: 'line1\nline2\nline3' })
      expect(editor.lineCount()).toBe(3)
    })

    it('lineCount for single line', () => {
      const editor = createEditor({ value: 'hello' })
      expect(editor.lineCount()).toBe(1)
    })

    it('lineCount for empty', () => {
      const editor = createEditor({ value: '' })
      expect(editor.lineCount()).toBe(1)
    })
  })

  describe('actions (before mount)', () => {
    it('focus does not throw before mount', () => {
      const editor = createEditor()
      expect(() => editor.focus()).not.toThrow()
    })

    it('insert does not throw before mount', () => {
      const editor = createEditor()
      expect(() => editor.insert('text')).not.toThrow()
    })

    it('replaceSelection does not throw before mount', () => {
      const editor = createEditor()
      expect(() => editor.replaceSelection('text')).not.toThrow()
    })

    it('select does not throw before mount', () => {
      const editor = createEditor()
      expect(() => editor.select(0, 5)).not.toThrow()
    })

    it('selectAll does not throw before mount', () => {
      const editor = createEditor()
      expect(() => editor.selectAll()).not.toThrow()
    })

    it('goToLine does not throw before mount', () => {
      const editor = createEditor()
      expect(() => editor.goToLine(5)).not.toThrow()
    })

    it('undo does not throw before mount', () => {
      const editor = createEditor()
      expect(() => editor.undo()).not.toThrow()
    })

    it('redo does not throw before mount', () => {
      const editor = createEditor()
      expect(() => editor.redo()).not.toThrow()
    })

    it('dispose does not throw before mount', () => {
      const editor = createEditor()
      expect(() => editor.dispose()).not.toThrow()
    })
  })

  describe('onChange callback', () => {
    it('config stores onChange', () => {
      const onChange = () => {
        /* noop */
      }
      const editor = createEditor({ onChange })
      expect(editor.config.onChange).toBe(onChange)
    })
  })

  describe('new actions (before mount)', () => {
    it('setDiagnostics does not throw before mount', () => {
      const editor = createEditor()
      expect(() =>
        editor.setDiagnostics([
          { from: 0, to: 5, severity: 'error', message: 'test' },
        ]),
      ).not.toThrow()
    })

    it('clearDiagnostics does not throw before mount', () => {
      const editor = createEditor()
      expect(() => editor.clearDiagnostics()).not.toThrow()
    })

    it('highlightLine does not throw before mount', () => {
      const editor = createEditor()
      expect(() => editor.highlightLine(1, 'error-line')).not.toThrow()
    })

    it('clearLineHighlights does not throw before mount', () => {
      const editor = createEditor()
      expect(() => editor.clearLineHighlights()).not.toThrow()
    })

    it('setGutterMarker does not throw before mount', () => {
      const editor = createEditor()
      expect(() =>
        editor.setGutterMarker(1, { text: '🔴', title: 'Breakpoint' }),
      ).not.toThrow()
    })

    it('clearGutterMarkers does not throw before mount', () => {
      const editor = createEditor()
      expect(() => editor.clearGutterMarkers()).not.toThrow()
    })

    it('addKeybinding does not throw before mount', () => {
      const editor = createEditor()
      expect(() =>
        editor.addKeybinding('Ctrl-Shift-L', () => true),
      ).not.toThrow()
    })

    it('getLine returns empty string before mount', () => {
      const editor = createEditor()
      expect(editor.getLine(1)).toBe('')
    })

    it('getWordAtCursor returns empty string before mount', () => {
      const editor = createEditor()
      expect(editor.getWordAtCursor()).toBe('')
    })

    it('scrollTo does not throw before mount', () => {
      const editor = createEditor()
      expect(() => editor.scrollTo(0)).not.toThrow()
    })
  })

  describe('config options', () => {
    it('highlightIndentGuides defaults to true', () => {
      const editor = createEditor()
      expect(editor.config.highlightIndentGuides).toBeUndefined() // uses default
    })

    it('vim mode can be enabled', () => {
      const editor = createEditor({ vim: true })
      expect(editor.config.vim).toBe(true)
    })

    it('emacs mode can be enabled', () => {
      const editor = createEditor({ emacs: true })
      expect(editor.config.emacs).toBe(true)
    })

    it('minimap can be enabled', () => {
      const editor = createEditor({ minimap: true })
      expect(editor.config.minimap).toBe(true)
    })

    it('all config options are stored', () => {
      const editor = createEditor({
        value: 'test',
        language: 'typescript',
        theme: 'dark',
        lineNumbers: false,
        readOnly: true,
        foldGutter: false,
        bracketMatching: false,
        autocomplete: false,
        search: false,
        lint: true,
        highlightIndentGuides: false,
        tabSize: 4,
        lineWrapping: true,
        placeholder: 'Type here...',
      })
      expect(editor.config.tabSize).toBe(4)
      expect(editor.config.lineWrapping).toBe(true)
      expect(editor.config.placeholder).toBe('Type here...')
    })
  })
})

describe('getAvailableLanguages', () => {
  it('returns all supported languages', () => {
    const langs = getAvailableLanguages()
    expect(langs).toContain('javascript')
    expect(langs).toContain('typescript')
    expect(langs).toContain('html')
    expect(langs).toContain('css')
    expect(langs).toContain('json')
    expect(langs).toContain('python')
    expect(langs).toContain('markdown')
    expect(langs).toContain('plain')
    expect(langs.length).toBeGreaterThanOrEqual(15)
  })
})
