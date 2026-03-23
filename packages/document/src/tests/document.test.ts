import { afterEach, describe, expect, it } from 'vitest'
import {
  Button,
  Code,
  Column,
  createDocument,
  Divider,
  Document,
  Heading,
  Image,
  isDocNode,
  Link,
  List,
  ListItem,
  Page,
  Quote,
  Row,
  Section,
  Spacer,
  Table,
  Text,
  _resetRenderers,
  registerRenderer,
  render,
  unregisterRenderer,
} from '../index'

afterEach(() => {
  _resetRenderers()
})

// ─── Node Construction ──────────────────────────────────────────────────────

describe('node construction', () => {
  it('Document creates a document node', () => {
    const doc = Document({ title: 'Test', children: 'hello' })
    expect(doc.type).toBe('document')
    expect(doc.props.title).toBe('Test')
    expect(doc.children).toEqual(['hello'])
  })

  it('Page creates a page node', () => {
    const page = Page({ size: 'A4', margin: 40, children: 'content' })
    expect(page.type).toBe('page')
    expect(page.props.size).toBe('A4')
    expect(page.props.margin).toBe(40)
  })

  it('Section with direction', () => {
    const section = Section({ direction: 'row', gap: 20, children: 'a' })
    expect(section.type).toBe('section')
    expect(section.props.direction).toBe('row')
    expect(section.props.gap).toBe(20)
  })

  it('Row and Column', () => {
    const row = Row({ gap: 10, children: [Column({ width: '50%', children: 'left' })] })
    expect(row.type).toBe('row')
    expect(row.children).toHaveLength(1)
    const col = row.children[0]
    expect(typeof col).not.toBe('string')
    if (typeof col !== 'string') {
      expect(col.type).toBe('column')
      expect(col.props.width).toBe('50%')
    }
  })

  it('Heading defaults to level 1', () => {
    const h = Heading({ children: 'Title' })
    expect(h.type).toBe('heading')
    expect(h.props.level).toBe(1)
  })

  it('Heading with custom level', () => {
    const h = Heading({ level: 3, children: 'Subtitle' })
    expect(h.props.level).toBe(3)
  })

  it('Text with formatting', () => {
    const t = Text({ bold: true, italic: true, size: 14, color: '#333', children: 'hello' })
    expect(t.type).toBe('text')
    expect(t.props.bold).toBe(true)
    expect(t.props.italic).toBe(true)
    expect(t.props.size).toBe(14)
  })

  it('Link', () => {
    const l = Link({ href: 'https://example.com', children: 'click' })
    expect(l.type).toBe('link')
    expect(l.props.href).toBe('https://example.com')
  })

  it('Image with all props', () => {
    const img = Image({ src: '/logo.png', width: 100, height: 50, alt: 'Logo', caption: 'Company logo' })
    expect(img.type).toBe('image')
    expect(img.props.src).toBe('/logo.png')
    expect(img.props.width).toBe(100)
    expect(img.props.caption).toBe('Company logo')
    expect(img.children).toEqual([])
  })

  it('Table with columns and rows', () => {
    const t = Table({
      columns: ['Name', { header: 'Price', align: 'right' }],
      rows: [['Widget', '$10']],
      striped: true,
    })
    expect(t.type).toBe('table')
    expect(t.props.columns).toHaveLength(2)
    expect(t.props.rows).toHaveLength(1)
    expect(t.props.striped).toBe(true)
  })

  it('List with items', () => {
    const l = List({
      ordered: true,
      children: [ListItem({ children: 'one' }), ListItem({ children: 'two' })],
    })
    expect(l.type).toBe('list')
    expect(l.props.ordered).toBe(true)
    expect(l.children).toHaveLength(2)
  })

  it('Code', () => {
    const c = Code({ language: 'typescript', children: 'const x = 1' })
    expect(c.type).toBe('code')
    expect(c.props.language).toBe('typescript')
  })

  it('Divider', () => {
    const d = Divider({ color: '#ccc', thickness: 2 })
    expect(d.type).toBe('divider')
    expect(d.props.color).toBe('#ccc')
  })

  it('Divider with defaults', () => {
    const d = Divider()
    expect(d.type).toBe('divider')
  })

  it('Spacer', () => {
    const s = Spacer({ height: 30 })
    expect(s.type).toBe('spacer')
    expect(s.props.height).toBe(30)
  })

  it('Button', () => {
    const b = Button({ href: '/pay', background: '#4f46e5', children: 'Pay' })
    expect(b.type).toBe('button')
    expect(b.props.href).toBe('/pay')
    expect(b.props.background).toBe('#4f46e5')
  })

  it('Quote', () => {
    const q = Quote({ borderColor: '#blue', children: 'wise words' })
    expect(q.type).toBe('quote')
    expect(q.props.borderColor).toBe('#blue')
  })

  it('isDocNode returns true for nodes', () => {
    expect(isDocNode(Heading({ children: 'hi' }))).toBe(true)
  })

  it('isDocNode returns false for non-nodes', () => {
    expect(isDocNode('string')).toBe(false)
    expect(isDocNode(null)).toBe(false)
    expect(isDocNode(42)).toBe(false)
    expect(isDocNode({})).toBe(false)
  })

  it('normalizes nested children', () => {
    const doc = Document({
      children: [
        Heading({ children: 'A' }),
        [Text({ children: 'B' }), Text({ children: 'C' })],
      ],
    })
    expect(doc.children).toHaveLength(3)
  })

  it('handles null/undefined/false children', () => {
    const doc = Document({ children: [null, undefined, false, 'text'] })
    expect(doc.children).toEqual(['text'])
  })

  it('converts numbers to strings in children', () => {
    const t = Text({ children: 42 as unknown as string })
    expect(t.children).toEqual(['42'])
  })
})

// ─── HTML Renderer ──────────────────────────────────────────────────────────

describe('HTML renderer', () => {
  it('renders a simple document', async () => {
    const doc = Document({
      title: 'Test',
      children: Page({ children: Heading({ children: 'Hello' }) }),
    })
    const html = await render(doc, 'html') as string
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<title>Test</title>')
    expect(html).toContain('<h1')
    expect(html).toContain('Hello')
  })

  it('renders text with formatting', async () => {
    const doc = Document({
      children: Text({ bold: true, color: '#f00', size: 20, align: 'center', children: 'Bold Red' }),
    })
    const html = await render(doc, 'html') as string
    expect(html).toContain('font-weight:bold')
    expect(html).toContain('color:#f00')
    expect(html).toContain('font-size:20px')
    expect(html).toContain('text-align:center')
  })

  it('renders a table', async () => {
    const doc = Document({
      children: Table({
        columns: ['Name', { header: 'Price', align: 'right' }],
        rows: [['Widget', '$10'], ['Gadget', '$20']],
        striped: true,
        headerStyle: { background: '#000', color: '#fff' },
      }),
    })
    const html = await render(doc, 'html') as string
    expect(html).toContain('<table')
    expect(html).toContain('Widget')
    expect(html).toContain('$10')
    expect(html).toContain('background:#000')
    expect(html).toContain('color:#fff')
  })

  it('renders an image with caption', async () => {
    const doc = Document({
      children: Image({ src: '/img.png', width: 200, alt: 'Photo', caption: 'A photo' }),
    })
    const html = await render(doc, 'html') as string
    expect(html).toContain('<img')
    expect(html).toContain('src="/img.png"')
    expect(html).toContain('<figcaption>')
    expect(html).toContain('A photo')
  })

  it('renders a link', async () => {
    const doc = Document({
      children: Link({ href: 'https://example.com', children: 'Click me' }),
    })
    const html = await render(doc, 'html') as string
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('Click me')
  })

  it('renders a list', async () => {
    const doc = Document({
      children: List({
        ordered: true,
        children: [ListItem({ children: 'one' }), ListItem({ children: 'two' })],
      }),
    })
    const html = await render(doc, 'html') as string
    expect(html).toContain('<ol>')
    expect(html).toContain('<li>one</li>')
  })

  it('renders code blocks', async () => {
    const doc = Document({ children: Code({ children: 'const x = 1' }) })
    const html = await render(doc, 'html') as string
    expect(html).toContain('<pre')
    expect(html).toContain('<code>')
    expect(html).toContain('const x = 1')
  })

  it('renders divider', async () => {
    const doc = Document({ children: Divider({ color: '#ccc', thickness: 2 }) })
    const html = await render(doc, 'html') as string
    expect(html).toContain('<hr')
    expect(html).toContain('2px solid #ccc')
  })

  it('renders spacer', async () => {
    const doc = Document({ children: Spacer({ height: 30 }) })
    const html = await render(doc, 'html') as string
    expect(html).toContain('height:30px')
  })

  it('renders button', async () => {
    const doc = Document({
      children: Button({ href: '/pay', background: '#4f46e5', color: '#fff', children: 'Pay' }),
    })
    const html = await render(doc, 'html') as string
    expect(html).toContain('href="/pay"')
    expect(html).toContain('background:#4f46e5')
    expect(html).toContain('Pay')
  })

  it('renders blockquote', async () => {
    const doc = Document({ children: Quote({ children: 'A wise quote' }) })
    const html = await render(doc, 'html') as string
    expect(html).toContain('<blockquote')
    expect(html).toContain('A wise quote')
  })

  it('renders section with row direction', async () => {
    const doc = Document({
      children: Section({
        direction: 'row',
        gap: 20,
        background: '#f5f5f5',
        children: [Text({ children: 'A' }), Text({ children: 'B' })],
      }),
    })
    const html = await render(doc, 'html') as string
    expect(html).toContain('display:flex')
    expect(html).toContain('flex-direction:row')
  })

  it('renders image with center alignment', async () => {
    const doc = Document({
      children: Image({ src: '/img.png', align: 'center' }),
    })
    const html = await render(doc, 'html') as string
    expect(html).toContain('margin:0 auto')
  })

  it('renders table with bordered option', async () => {
    const doc = Document({
      children: Table({ columns: ['A'], rows: [['1']], bordered: true }),
    })
    const html = await render(doc, 'html') as string
    expect(html).toContain('border:1px solid #ddd')
  })

  it('renders table with caption', async () => {
    const doc = Document({
      children: Table({ columns: ['A'], rows: [['1']], caption: 'My Table' }),
    })
    const html = await render(doc, 'html') as string
    expect(html).toContain('<caption>My Table</caption>')
  })

  it('escapes HTML in text', async () => {
    const doc = Document({ children: Text({ children: '<script>alert(1)</script>' }) })
    const html = await render(doc, 'html') as string
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('renders text with underline and strikethrough', async () => {
    const ul = Document({ children: Text({ underline: true, children: 'underlined' }) })
    const st = Document({ children: Text({ strikethrough: true, children: 'struck' }) })
    expect(await render(ul, 'html') as string).toContain('text-decoration:underline')
    expect(await render(st, 'html') as string).toContain('text-decoration:line-through')
  })

  it('renders image with right alignment', async () => {
    const doc = Document({ children: Image({ src: '/x.png', align: 'right' }) })
    const html = await render(doc, 'html') as string
    expect(html).toContain('margin-left:auto')
  })
})

// ─── Email Renderer ─────────────────────────────────────────────────────────

describe('email renderer', () => {
  it('renders email-safe HTML', async () => {
    const doc = Document({
      title: 'Welcome',
      children: [
        Heading({ children: 'Hello!' }),
        Text({ children: 'Welcome to our service.' }),
      ],
    })
    const html = await render(doc, 'email') as string
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('max-width:600px')
    expect(html).toContain('Hello!')
    // Should have Outlook conditional comments
    expect(html).toContain('<!--[if mso]>')
  })

  it('renders bulletproof buttons', async () => {
    const doc = Document({
      children: Button({ href: '/pay', background: '#4f46e5', children: 'Pay Now' }),
    })
    const html = await render(doc, 'email') as string
    // VML for Outlook
    expect(html).toContain('v:roundrect')
    // CSS for others
    expect(html).toContain('background-color:#4f46e5')
    expect(html).toContain('Pay Now')
  })

  it('renders table with inline styles', async () => {
    const doc = Document({
      children: Table({
        columns: ['Name', 'Price'],
        rows: [['Widget', '$10']],
        headerStyle: { background: '#000', color: '#fff' },
      }),
    })
    const html = await render(doc, 'email') as string
    expect(html).toContain('background-color:#000')
    expect(html).toContain('color:#fff')
    expect(html).toContain('Widget')
  })

  it('renders section with row direction using tables', async () => {
    const doc = Document({
      children: Section({
        direction: 'row',
        children: [Text({ children: 'Left' }), Text({ children: 'Right' })],
      }),
    })
    const html = await render(doc, 'email') as string
    // Should use table layout, not flexbox
    expect(html).not.toContain('display:flex')
    expect(html).toContain('<table')
    expect(html).toContain('Left')
    expect(html).toContain('Right')
  })

  it('renders divider using table', async () => {
    const doc = Document({ children: Divider() })
    const html = await render(doc, 'email') as string
    expect(html).toContain('border-top:1px solid')
  })

  it('renders quote using table with border-left', async () => {
    const doc = Document({ children: Quote({ children: 'A quote' }) })
    const html = await render(doc, 'email') as string
    expect(html).toContain('border-left:4px solid')
  })
})

// ─── Markdown Renderer ──────────────────────────────────────────────────────

describe('markdown renderer', () => {
  it('renders headings with # prefix', async () => {
    const doc = Document({
      children: [
        Heading({ level: 1, children: 'Title' }),
        Heading({ level: 3, children: 'Subtitle' }),
      ],
    })
    const md = await render(doc, 'md') as string
    expect(md).toContain('# Title')
    expect(md).toContain('### Subtitle')
  })

  it('renders bold and italic text', async () => {
    const doc = Document({
      children: [
        Text({ bold: true, children: 'bold' }),
        Text({ italic: true, children: 'italic' }),
        Text({ strikethrough: true, children: 'struck' }),
      ],
    })
    const md = await render(doc, 'md') as string
    expect(md).toContain('**bold**')
    expect(md).toContain('*italic*')
    expect(md).toContain('~~struck~~')
  })

  it('renders tables as pipe tables', async () => {
    const doc = Document({
      children: Table({
        columns: ['Name', { header: 'Price', align: 'right' }],
        rows: [['Widget', '$10']],
      }),
    })
    const md = await render(doc, 'md') as string
    expect(md).toContain('| Name | Price |')
    expect(md).toContain('| --- | ---: |')
    expect(md).toContain('| Widget | $10 |')
  })

  it('renders links in markdown format', async () => {
    const doc = Document({
      children: Link({ href: 'https://example.com', children: 'click' }),
    })
    const md = await render(doc, 'md') as string
    expect(md).toContain('[click](https://example.com)')
  })

  it('renders images', async () => {
    const doc = Document({
      children: Image({ src: '/img.png', alt: 'Photo', caption: 'A photo' }),
    })
    const md = await render(doc, 'md') as string
    expect(md).toContain('![Photo](/img.png)')
    expect(md).toContain('*A photo*')
  })

  it('renders code blocks with language', async () => {
    const doc = Document({
      children: Code({ language: 'typescript', children: 'const x = 1' }),
    })
    const md = await render(doc, 'md') as string
    expect(md).toContain('```typescript')
    expect(md).toContain('const x = 1')
    expect(md).toContain('```')
  })

  it('renders ordered and unordered lists', async () => {
    const ol = Document({
      children: List({
        ordered: true,
        children: [ListItem({ children: 'first' }), ListItem({ children: 'second' })],
      }),
    })
    const ul = Document({
      children: List({
        children: [ListItem({ children: 'a' }), ListItem({ children: 'b' })],
      }),
    })
    const orderedMd = await render(ol, 'md') as string
    const unorderedMd = await render(ul, 'md') as string
    expect(orderedMd).toContain('1. first')
    expect(orderedMd).toContain('2. second')
    expect(unorderedMd).toContain('- a')
    expect(unorderedMd).toContain('- b')
  })

  it('renders divider as ---', async () => {
    const doc = Document({ children: Divider() })
    const md = await render(doc, 'md') as string
    expect(md).toContain('---')
  })

  it('renders button as link', async () => {
    const doc = Document({ children: Button({ href: '/pay', children: 'Pay' }) })
    const md = await render(doc, 'md') as string
    expect(md).toContain('[Pay](/pay)')
  })

  it('renders quote with >', async () => {
    const doc = Document({ children: Quote({ children: 'wise' }) })
    const md = await render(doc, 'md') as string
    expect(md).toContain('> wise')
  })

  it('renders table with caption', async () => {
    const doc = Document({
      children: Table({ columns: ['A'], rows: [['1']], caption: 'My Table' }),
    })
    const md = await render(doc, 'md') as string
    expect(md).toContain('*My Table*')
  })
})

// ─── Text Renderer ──────────────────────────────────────────────────────────

describe('text renderer', () => {
  it('renders headings with underlines', async () => {
    const doc = Document({
      children: [
        Heading({ level: 1, children: 'Title' }),
        Heading({ level: 2, children: 'Sub' }),
      ],
    })
    const text = await render(doc, 'text') as string
    expect(text).toContain('TITLE')
    expect(text).toContain('=====')
    expect(text).toContain('Sub')
    expect(text).toContain('---')
  })

  it('renders aligned table columns', async () => {
    const doc = Document({
      children: Table({
        columns: [{ header: 'Name', align: 'left' }, { header: 'Price', align: 'right' }],
        rows: [['Widget', '$10']],
      }),
    })
    const text = await render(doc, 'text') as string
    expect(text).toContain('Name')
    expect(text).toContain('Price')
    expect(text).toContain('Widget')
  })

  it('renders button as link reference', async () => {
    const doc = Document({ children: Button({ href: '/pay', children: 'Pay' }) })
    const text = await render(doc, 'text') as string
    expect(text).toContain('[Pay]')
    expect(text).toContain('/pay')
  })

  it('renders image as placeholder', async () => {
    const doc = Document({ children: Image({ src: '/x.png', alt: 'Photo', caption: 'Nice' }) })
    const text = await render(doc, 'text') as string
    expect(text).toContain('[Photo — Nice]')
  })
})

// ─── CSV Renderer ───────────────────────────────────────────────────────────

describe('CSV renderer', () => {
  it('extracts tables as CSV', async () => {
    const doc = Document({
      children: Table({
        columns: ['Name', 'Price'],
        rows: [['Widget', '$10'], ['Gadget', '$20']],
      }),
    })
    const csv = await render(doc, 'csv') as string
    expect(csv).toContain('Name,Price')
    expect(csv).toContain('Widget,$10')
    expect(csv).toContain('Gadget,$20')
  })

  it('escapes commas and quotes', async () => {
    const doc = Document({
      children: Table({
        columns: ['Name'],
        rows: [['Widget, Inc.'], ['He said "hello"']],
      }),
    })
    const csv = await render(doc, 'csv') as string
    expect(csv).toContain('"Widget, Inc."')
    expect(csv).toContain('"He said ""hello"""')
  })

  it('returns message when no tables', async () => {
    const doc = Document({ children: Text({ children: 'no tables here' }) })
    const csv = await render(doc, 'csv') as string
    expect(csv).toContain('No tables found')
  })

  it('handles multiple tables', async () => {
    const doc = Document({
      children: [
        Table({ columns: ['A'], rows: [['1']] }),
        Table({ columns: ['B'], rows: [['2']] }),
      ],
    })
    const csv = await render(doc, 'csv') as string
    expect(csv).toContain('A')
    expect(csv).toContain('B')
  })

  it('adds caption as comment', async () => {
    const doc = Document({
      children: Table({ columns: ['A'], rows: [['1']], caption: 'My Data' }),
    })
    const csv = await render(doc, 'csv') as string
    expect(csv).toContain('# My Data')
  })
})

// ─── Builder Pattern ────────────────────────────────────────────────────────

describe('createDocument builder', () => {
  it('builds a document with heading and text', async () => {
    const doc = createDocument({ title: 'Test' })
      .heading('Title')
      .text('Hello world')

    const node = doc.build()
    expect(node.type).toBe('document')
    expect(node.props.title).toBe('Test')
  })

  it('renders to HTML', async () => {
    const doc = createDocument()
      .heading('Report')
      .text('Summary text')
      .table({
        columns: ['Name', 'Value'],
        rows: [['A', '1']],
      })

    const html = await doc.toHtml()
    expect(html).toContain('Report')
    expect(html).toContain('Summary text')
    expect(html).toContain('<table')
  })

  it('renders to markdown', async () => {
    const doc = createDocument()
      .heading('Title')
      .text('Body', { bold: true })
      .list(['item 1', 'item 2'])

    const md = await doc.toMarkdown()
    expect(md).toContain('# Title')
    expect(md).toContain('**Body**')
    expect(md).toContain('- item 1')
  })

  it('renders to text', async () => {
    const doc = createDocument()
      .heading('Title')
      .text('Body')

    const text = await doc.toText()
    expect(text).toContain('TITLE')
    expect(text).toContain('Body')
  })

  it('renders to CSV', async () => {
    const doc = createDocument()
      .table({ columns: ['X'], rows: [['1'], ['2']] })

    const csv = await doc.toCsv()
    expect(csv).toContain('X')
    expect(csv).toContain('1')
  })

  it('supports all builder methods', () => {
    const doc = createDocument()
      .heading('H')
      .text('T')
      .paragraph('P')
      .image('/img.png')
      .table({ columns: ['A'], rows: [['1']] })
      .list(['a', 'b'])
      .code('x = 1', { language: 'python' })
      .divider()
      .spacer(20)
      .quote('Q')
      .button('Click', { href: '/go' })
      .link('Link', { href: '/link' })

    const node = doc.build()
    expect(node.type).toBe('document')
  })

  it('chart without instance shows placeholder', async () => {
    const doc = createDocument()
      .chart(null)

    const html = await doc.toHtml()
    expect(html).toContain('[Chart]')
  })

  it('flow without instance shows placeholder', async () => {
    const doc = createDocument()
      .flow(null)

    const html = await doc.toHtml()
    expect(html).toContain('[Flow Diagram]')
  })

  it('chart with getDataURL captures image', async () => {
    const mockChart = {
      getDataURL: () => 'data:image/png;base64,abc123',
    }
    const doc = createDocument().chart(mockChart, { width: 400 })
    const html = await doc.toHtml()
    expect(html).toContain('data:image/png;base64,abc123')
  })

  it('flow with toSVG captures image', async () => {
    const mockFlow = {
      toSVG: () => '<svg><rect/></svg>',
    }
    const doc = createDocument().flow(mockFlow, { width: 500 })
    const html = await doc.toHtml()
    expect(html).toContain('data:image/svg+xml')
  })
})

// ─── Custom Renderers ───────────────────────────────────────────────────────

describe('custom renderers', () => {
  it('registerRenderer adds a custom format', async () => {
    registerRenderer('custom', {
      async render(node) {
        return `CUSTOM:${node.type}`
      },
    })

    const doc = Document({ children: 'hello' })
    const result = await render(doc, 'custom')
    expect(result).toBe('CUSTOM:document')
  })

  it('unregisterRenderer removes a format', () => {
    registerRenderer('temp', { async render() { return 'x' } })
    unregisterRenderer('temp')
    expect(render(Document({ children: 'x' }), 'temp')).rejects.toThrow('No renderer registered')
  })

  it('throws for unknown format', () => {
    expect(render(Document({ children: 'x' }), 'unknown')).rejects.toThrow('No renderer registered')
  })

  it('lazy renderer is cached after first use', async () => {
    let loadCount = 0
    registerRenderer('lazy', async () => {
      loadCount++
      return { async render() { return 'lazy-result' } }
    })

    await render(Document({ children: 'x' }), 'lazy')
    await render(Document({ children: 'x' }), 'lazy')
    expect(loadCount).toBe(1)
  })
})

// ─── Real-World Document ────────────────────────────────────────────────────

describe('real-world document', () => {
  function createInvoice() {
    return Document({
      title: 'Invoice #1234',
      author: 'Acme Corp',
      children: Page({
        size: 'A4',
        margin: 40,
        children: [
          Row({
            gap: 20,
            children: [
              Column({ children: Image({ src: '/logo.png', width: 80, alt: 'Logo' }) }),
              Column({
                children: [
                  Heading({ children: 'Invoice #1234' }),
                  Text({ color: '#666', children: 'March 23, 2026' }),
                ],
              }),
            ],
          }),
          Spacer({ height: 30 }),
          Table({
            columns: [
              { header: 'Item', width: '50%' },
              { header: 'Qty', width: '15%', align: 'center' },
              { header: 'Price', width: '15%', align: 'right' },
              { header: 'Total', width: '20%', align: 'right' },
            ],
            rows: [
              ['Widget Pro', '2', '$50', '$100'],
              ['Gadget Plus', '1', '$75', '$75'],
              ['Service Fee', '1', '$25', '$25'],
            ],
            striped: true,
            headerStyle: { background: '#1a1a2e', color: '#fff' },
          }),
          Spacer({ height: 20 }),
          Text({ bold: true, align: 'right', size: 18, children: 'Total: $200' }),
          Divider(),
          Text({ color: '#999', size: 12, children: 'Thank you for your business!' }),
          Button({ href: 'https://acme.com/pay/1234', background: '#4f46e5', align: 'center', children: 'Pay Now' }),
        ],
      }),
    })
  }

  it('renders as HTML', async () => {
    const html = await render(createInvoice(), 'html') as string
    expect(html).toContain('Invoice #1234')
    expect(html).toContain('Widget Pro')
    expect(html).toContain('Total: $200')
    expect(html).toContain('Pay Now')
  })

  it('renders as email', async () => {
    const html = await render(createInvoice(), 'email') as string
    expect(html).toContain('Invoice #1234')
    expect(html).toContain('max-width:600px')
    expect(html).toContain('v:roundrect') // Outlook button
  })

  it('renders as markdown', async () => {
    const md = await render(createInvoice(), 'md') as string
    expect(md).toContain('# Invoice #1234')
    expect(md).toContain('| Widget Pro')
    expect(md).toContain('**Total: $200**')
  })

  it('renders as text', async () => {
    const text = await render(createInvoice(), 'text') as string
    expect(text).toContain('INVOICE #1234')
    expect(text).toContain('Widget Pro')
    expect(text).toContain('Total: $200')
  })

  it('renders as CSV', async () => {
    const csv = await render(createInvoice(), 'csv') as string
    expect(csv).toContain('Item,Qty,Price,Total')
    expect(csv).toContain('Widget Pro,2,$50,$100')
  })
})

// ─── Text Renderer — additional coverage ────────────────────────────────────

describe('text renderer — additional', () => {
  it('renders link with URL', async () => {
    const doc = Document({ children: Link({ href: 'https://x.com', children: 'Link' }) })
    const text = await render(doc, 'text') as string
    expect(text).toContain('Link (https://x.com)')
  })

  it('renders table with caption', async () => {
    const doc = Document({
      children: Table({ columns: ['A'], rows: [['1']], caption: 'Data' }),
    })
    const text = await render(doc, 'text') as string
    expect(text).toContain('Data')
  })

  it('renders ordered list', async () => {
    const doc = Document({
      children: List({
        ordered: true,
        children: [ListItem({ children: 'one' }), ListItem({ children: 'two' })],
      }),
    })
    const text = await render(doc, 'text') as string
    expect(text).toContain('1. one')
    expect(text).toContain('2. two')
  })

  it('renders unordered list', async () => {
    const doc = Document({
      children: List({
        children: [ListItem({ children: 'a' }), ListItem({ children: 'b' })],
      }),
    })
    const text = await render(doc, 'text') as string
    expect(text).toContain('* a')
    expect(text).toContain('* b')
  })

  it('renders code block', async () => {
    const doc = Document({ children: Code({ children: 'x = 1' }) })
    const text = await render(doc, 'text') as string
    expect(text).toContain('x = 1')
  })

  it('renders divider', async () => {
    const doc = Document({ children: Divider() })
    const text = await render(doc, 'text') as string
    expect(text).toContain('─')
  })

  it('renders spacer as newline', async () => {
    const doc = Document({ children: [Text({ children: 'A' }), Spacer({ height: 20 }), Text({ children: 'B' })] })
    const text = await render(doc, 'text') as string
    expect(text).toContain('A')
    expect(text).toContain('B')
  })

  it('renders quote with indentation', async () => {
    const doc = Document({ children: Quote({ children: 'wise' }) })
    const text = await render(doc, 'text') as string
    expect(text).toContain('"wise"')
  })

  it('renders section/row/column', async () => {
    const doc = Document({
      children: Section({
        children: Row({
          children: Column({ children: Text({ children: 'nested' }) }),
        }),
      }),
    })
    const text = await render(doc, 'text') as string
    expect(text).toContain('nested')
  })

  it('renders heading level 3+', async () => {
    const doc = Document({ children: Heading({ level: 4, children: 'Sub' }) })
    const text = await render(doc, 'text') as string
    expect(text).toContain('Sub')
    // Level 3+ should not have underline
    expect(text).not.toContain('===')
    expect(text).not.toContain('---')
  })

  it('renders table with center aligned column', async () => {
    const doc = Document({
      children: Table({
        columns: [{ header: 'Name', align: 'center' }],
        rows: [['X']],
      }),
    })
    const text = await render(doc, 'text') as string
    expect(text).toContain('Name')
    expect(text).toContain('X')
  })
})

// ─── Builder — additional coverage ───────────────────────────────────────────

describe('builder — additional', () => {
  it('pageBreak wraps content', () => {
    const doc = createDocument()
      .heading('Page 1')
      .pageBreak()
      .heading('Page 2')
    const node = doc.build()
    expect(node.type).toBe('document')
  })

  it('toEmail renders', async () => {
    const html = await createDocument().heading('Hi').toEmail()
    expect(html).toContain('Hi')
    expect(html).toContain('max-width:600px')
  })

  it('toCsv renders', async () => {
    const csv = await createDocument().table({ columns: ['X'], rows: [['1']] }).toCsv()
    expect(csv).toContain('X')
  })

  it('toText renders', async () => {
    const text = await createDocument().heading('Hi').toText()
    expect(text).toContain('HI')
  })
})

// ─── Markdown — additional branch coverage ──────────────────────────────────

describe('markdown — additional branches', () => {
  it('renders table with center aligned column', async () => {
    const doc = Document({
      children: Table({
        columns: [{ header: 'X', align: 'center' }],
        rows: [['1']],
      }),
    })
    const md = await render(doc, 'md') as string
    expect(md).toContain(':---:')
  })

  it('renders table with left aligned column (default)', async () => {
    const doc = Document({
      children: Table({ columns: [{ header: 'X', align: 'left' }], rows: [['1']] }),
    })
    const md = await render(doc, 'md') as string
    expect(md).toContain('| --- |')
  })

  it('renders empty table gracefully', async () => {
    const doc = Document({
      children: Table({ columns: [], rows: [] }),
    })
    const md = await render(doc, 'md') as string
    expect(md).toBeDefined()
  })

  it('renders image without caption', async () => {
    const doc = Document({ children: Image({ src: '/x.png', alt: 'X' }) })
    const md = await render(doc, 'md') as string
    expect(md).toContain('![X](/x.png)')
    expect(md).not.toContain('*')
  })

  it('renders image without alt', async () => {
    const doc = Document({ children: Image({ src: '/x.png' }) })
    const md = await render(doc, 'md') as string
    expect(md).toContain('![](/x.png)')
  })

  it('renders code without language', async () => {
    const doc = Document({ children: Code({ children: 'x = 1' }) })
    const md = await render(doc, 'md') as string
    expect(md).toContain('```\nx = 1\n```')
  })

  it('renders spacer as newline', async () => {
    const doc = Document({ children: Spacer({ height: 20 }) })
    const md = await render(doc, 'md') as string
    expect(md).toBeDefined()
  })
})

// ─── Email — additional branch coverage ─────────────────────────────────────

describe('email — additional branches', () => {
  it('renders section with background and padding', async () => {
    const doc = Document({
      children: Section({ background: '#f00', padding: [10, 20], borderRadius: 8, children: Text({ children: 'hi' }) }),
    })
    const html = await render(doc, 'email') as string
    expect(html).toContain('background-color:#f00')
    expect(html).toContain('border-radius:8px')
  })

  it('renders image with right alignment', async () => {
    const doc = Document({ children: Image({ src: '/x.png', align: 'right' }) })
    const html = await render(doc, 'email') as string
    expect(html).toContain('text-align:right')
  })

  it('renders striped table', async () => {
    const doc = Document({
      children: Table({
        columns: ['A'],
        rows: [['1'], ['2'], ['3']],
        striped: true,
      }),
    })
    const html = await render(doc, 'email') as string
    expect(html).toContain('background-color:#f9f9f9')
  })

  it('renders heading level 2', async () => {
    const doc = Document({ children: Heading({ level: 2, children: 'Sub' }) })
    const html = await render(doc, 'email') as string
    expect(html).toContain('<h2')
    expect(html).toContain('font-size:24px')
  })

  it('renders text with all formatting options', async () => {
    const doc = Document({
      children: Text({ size: 16, bold: true, italic: true, underline: true, align: 'center', lineHeight: 2, children: 'styled' }),
    })
    const html = await render(doc, 'email') as string
    expect(html).toContain('font-size:16px')
    expect(html).toContain('font-weight:bold')
    expect(html).toContain('font-style:italic')
    expect(html).toContain('text-decoration:underline')
    expect(html).toContain('text-align:center')
  })

  it('renders text with strikethrough', async () => {
    const doc = Document({ children: Text({ strikethrough: true, children: 'old' }) })
    const html = await render(doc, 'email') as string
    expect(html).toContain('text-decoration:line-through')
  })

  it('renders button with custom alignment', async () => {
    const doc = Document({ children: Button({ href: '/x', align: 'center', children: 'Go' }) })
    const html = await render(doc, 'email') as string
    expect(html).toContain('text-align:center')
  })

  it('renders section column direction (default)', async () => {
    const doc = Document({
      children: Section({ children: Text({ children: 'content' }) }),
    })
    const html = await render(doc, 'email') as string
    expect(html).toContain('content')
  })

  it('renders section with gap in row', async () => {
    const doc = Document({
      children: Section({ direction: 'row', gap: 16, children: [Text({ children: 'a' }), Text({ children: 'b' })] }),
    })
    const html = await render(doc, 'email') as string
    expect(html).toContain('padding:0 8px')
  })
})

// ─── HTML — additional branch coverage ──────────────────────────────────────

describe('html — additional branches', () => {
  it('renders section column direction (default)', async () => {
    const doc = Document({ children: Section({ children: Text({ children: 'x' }) }) })
    const html = await render(doc, 'html') as string
    expect(html).not.toContain('display:flex')
  })

  it('renders page with margin as array', async () => {
    const doc = Document({ children: Page({ margin: [10, 20], children: Text({ children: 'hi' }) }) })
    const html = await render(doc, 'html') as string
    expect(html).toContain('10px 20px')
  })

  it('renders page with 4-value margin', async () => {
    const doc = Document({ children: Page({ margin: [10, 20, 30, 40], children: Text({ children: 'hi' }) }) })
    const html = await render(doc, 'html') as string
    expect(html).toContain('10px 20px 30px 40px')
  })

  it('renders text with lineHeight', async () => {
    const doc = Document({ children: Text({ lineHeight: 1.8, children: 'text' }) })
    const html = await render(doc, 'html') as string
    expect(html).toContain('line-height:1.8')
  })
})

// ─── CSV — additional branch coverage ───────────────────────────────────────

describe('csv — additional branches', () => {
  it('finds tables nested in pages', async () => {
    const doc = Document({
      children: Page({
        children: Section({
          children: Table({ columns: ['Nested'], rows: [['val']] }),
        }),
      }),
    })
    const csv = await render(doc, 'csv') as string
    expect(csv).toContain('Nested')
    expect(csv).toContain('val')
  })
})

// ─── Render Dispatcher — additional coverage ────────────────────────────────

describe('render dispatcher — additional', () => {
  it('error message includes available formats', async () => {
    try {
      await render(Document({ children: 'x' }), 'nonexistent')
    } catch (e) {
      expect((e as Error).message).toContain('No renderer registered')
      expect((e as Error).message).toContain('Available:')
      expect((e as Error).message).toContain('html')
    }
  })
})

// ─── Email Renderer — additional coverage ───────────────────────────────────

describe('email renderer — additional', () => {
  it('renders image with caption', async () => {
    const doc = Document({ children: Image({ src: '/x.png', alt: 'Photo', caption: 'Nice' }) })
    const html = await render(doc, 'email') as string
    expect(html).toContain('Nice')
  })

  it('renders image with center alignment', async () => {
    const doc = Document({ children: Image({ src: '/x.png', align: 'center' }) })
    const html = await render(doc, 'email') as string
    expect(html).toContain('text-align:center')
  })

  it('renders code block', async () => {
    const doc = Document({ children: Code({ children: 'const x = 1' }) })
    const html = await render(doc, 'email') as string
    expect(html).toContain('Courier New')
    expect(html).toContain('const x = 1')
  })

  it('renders spacer with line-height trick', async () => {
    const doc = Document({ children: Spacer({ height: 20 }) })
    const html = await render(doc, 'email') as string
    expect(html).toContain('height:20px')
    expect(html).toContain('line-height:20px')
  })

  it('renders list', async () => {
    const doc = Document({
      children: List({
        children: [ListItem({ children: 'one' }), ListItem({ children: 'two' })],
      }),
    })
    const html = await render(doc, 'email') as string
    expect(html).toContain('<ul')
    expect(html).toContain('<li')
  })

  it('renders table caption', async () => {
    const doc = Document({
      children: Table({ columns: ['A'], rows: [['1']], caption: 'Data' }),
    })
    const html = await render(doc, 'email') as string
    expect(html).toContain('Data')
  })

  it('renders link with target _blank', async () => {
    const doc = Document({ children: Link({ href: 'https://x.com', children: 'X' }) })
    const html = await render(doc, 'email') as string
    expect(html).toContain('target="_blank"')
  })

  it('renders row layout using tables', async () => {
    const doc = Document({
      children: Row({
        gap: 10,
        children: [Text({ children: 'L' }), Text({ children: 'R' })],
      }),
    })
    const html = await render(doc, 'email') as string
    expect(html).toContain('<table')
    expect(html).toContain('valign="top"')
  })
})
