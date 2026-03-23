import type { DocChild, DocNode, DocumentRenderer, RenderOptions, TableColumn } from '../types'

/**
 * PDF renderer — lazy-loads pdfmake on first use.
 * pdfmake handles pagination, tables, text wrapping, and font embedding.
 */

function resolveColumn(col: string | TableColumn): TableColumn {
  return typeof col === 'string' ? { header: col } : col
}

function getTextContent(children: DocChild[]): string {
  return children
    .map((c) => (typeof c === 'string' ? c : getTextContent((c as DocNode).children)))
    .join('')
}

type PdfContent = Record<string, unknown> | string | PdfContent[]

const PAGE_SIZES: Record<string, [number, number]> = {
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  letter: [612, 792],
  legal: [612, 1008],
  tabloid: [792, 1224],
}

function nodeToContent(node: DocNode): PdfContent | PdfContent[] | null {
  const p = node.props

  switch (node.type) {
    case 'document':
    case 'page':
      return node.children
        .map((c) => (typeof c === 'string' ? c : nodeToContent(c)))
        .filter((c): c is PdfContent => c != null)

    case 'section': {
      const content = node.children
        .map((c) => (typeof c === 'string' ? c : nodeToContent(c)))
        .filter((c): c is PdfContent => c != null)
        .flat()

      if (p.direction === 'row') {
        return {
          columns: node.children
            .filter((c): c is DocNode => typeof c !== 'string')
            .map((child) => ({
              stack: [nodeToContent(child)].flat().filter(Boolean),
              width: child.props.width === '*' || !child.props.width ? '*' : child.props.width,
            })),
          columnGap: (p.gap as number) ?? 0,
        }
      }

      return content
    }

    case 'row': {
      return {
        columns: node.children
          .filter((c): c is DocNode => typeof c !== 'string')
          .map((child) => ({
            stack: [nodeToContent(child)].flat().filter(Boolean),
            width: child.props.width ?? '*',
          })),
        columnGap: (p.gap as number) ?? 0,
      }
    }

    case 'column':
      return node.children
        .map((c) => (typeof c === 'string' ? c : nodeToContent(c)))
        .filter((c): c is PdfContent => c != null)
        .flat()

    case 'heading': {
      const level = (p.level as number) ?? 1
      const sizes: Record<number, number> = { 1: 24, 2: 20, 3: 18, 4: 16, 5: 14, 6: 12 }
      return {
        text: getTextContent(node.children),
        fontSize: sizes[level] ?? 18,
        bold: true,
        color: (p.color as string) ?? '#000000',
        alignment: (p.align as string) ?? 'left',
        margin: [0, level === 1 ? 0 : 8, 0, 8],
      }
    }

    case 'text':
      return {
        text: getTextContent(node.children),
        fontSize: (p.size as number) ?? 12,
        color: (p.color as string) ?? '#333333',
        bold: p.bold ?? false,
        italics: p.italic ?? false,
        decoration: p.underline ? 'underline' : p.strikethrough ? 'lineThrough' : undefined,
        alignment: (p.align as string) ?? 'left',
        lineHeight: (p.lineHeight as number) ?? 1.4,
        margin: [0, 0, 0, 8],
      }

    case 'link':
      return {
        text: getTextContent(node.children),
        link: p.href as string,
        color: (p.color as string) ?? '#4f46e5',
        decoration: 'underline',
      }

    case 'image': {
      const result: Record<string, unknown> = {
        image: p.src as string,
        fit: [p.width ?? 500, p.height ?? 400],
        margin: [0, 0, 0, 8],
      }
      if (p.align === 'center') result.alignment = 'center'
      if (p.align === 'right') result.alignment = 'right'
      return result
    }

    case 'table': {
      const columns = ((p.columns ?? []) as (string | TableColumn)[]).map(resolveColumn)
      const rows = (p.rows ?? []) as (string | number)[][]
      const hs = p.headerStyle as { background?: string; color?: string } | undefined

      const headerRow = columns.map((col) => ({
        text: col.header,
        bold: true,
        fillColor: hs?.background ?? '#f5f5f5',
        color: hs?.color ?? '#000000',
        alignment: col.align ?? 'left',
      }))

      const dataRows = rows.map((row, rowIdx) =>
        columns.map((col, colIdx) => ({
          text: String(row[colIdx] ?? ''),
          alignment: col.align ?? 'left',
          fillColor: p.striped && rowIdx % 2 === 1 ? '#f9f9f9' : undefined,
        })),
      )

      const widths = columns.map((col) => {
        if (!col.width) return '*'
        if (typeof col.width === 'string' && col.width.endsWith('%')) {
          return col.width
        }
        return col.width
      })

      return {
        table: {
          headerRows: 1,
          widths,
          body: [headerRow, ...dataRows],
        },
        layout: p.bordered ? undefined : 'lightHorizontalLines',
        margin: [0, 0, 0, 12],
      }
    }

    case 'list': {
      const items = node.children
        .filter((c): c is DocNode => typeof c !== 'string')
        .map((item) => getTextContent(item.children))

      return p.ordered
        ? { ol: items, margin: [0, 0, 0, 8] }
        : { ul: items, margin: [0, 0, 0, 8] }
    }

    case 'list-item':
      return getTextContent(node.children)

    case 'code':
      return {
        text: getTextContent(node.children),
        font: 'Courier',
        fontSize: 10,
        background: '#f5f5f5',
        margin: [0, 0, 0, 8],
      }

    case 'divider':
      return {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: (p.thickness as number) ?? 1,
            lineColor: (p.color as string) ?? '#dddddd',
          },
        ],
        margin: [0, 8, 0, 8],
      }

    case 'spacer':
      return { text: '', margin: [0, (p.height as number) ?? 12, 0, 0] }

    case 'button':
      return {
        text: getTextContent(node.children),
        link: p.href as string,
        bold: true,
        color: (p.color as string) ?? '#ffffff',
        background: (p.background as string) ?? '#4f46e5',
        margin: [0, 8, 0, 8],
      }

    case 'quote':
      return {
        table: {
          widths: [4, '*'],
          body: [
            [
              { text: '', fillColor: (p.borderColor as string) ?? '#dddddd' },
              {
                text: getTextContent(node.children),
                italics: true,
                color: '#555555',
                margin: [8, 4, 0, 4],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 4, 0, 8],
      }

    default:
      return null
  }
}

function resolveMargin(
  margin: number | [number, number] | [number, number, number, number] | undefined,
): [number, number, number, number] {
  if (margin == null) return [40, 40, 40, 40]
  if (typeof margin === 'number') return [margin, margin, margin, margin]
  if (margin.length === 2) return [margin[1], margin[0], margin[1], margin[0]]
  return margin
}

export const pdfRenderer: DocumentRenderer = {
  async render(node: DocNode, _options?: RenderOptions): Promise<Uint8Array> {
    // Lazy-load pdfmake
    const pdfMake = await import('pdfmake/build/pdfmake')
    const pdfFonts = await import('pdfmake/build/vfs_fonts')

    if (pdfMake.default?.vfs) {
      pdfMake.default.vfs = pdfFonts.default?.pdfMake?.vfs ?? pdfFonts.pdfMake?.vfs
    }

    const createPdf = pdfMake.default?.createPdf ?? pdfMake.createPdf

    // Find page config
    const pageNode = node.children.find(
      (c): c is DocNode => typeof c !== 'string' && c.type === 'page',
    )
    const pageSize = (pageNode?.props.size as string) ?? 'A4'
    const pageOrientation = (pageNode?.props.orientation as string) ?? 'portrait'
    const pageMargin = resolveMargin(
      pageNode?.props.margin as number | [number, number] | [number, number, number, number] | undefined,
    )

    const content = [nodeToContent(node)].flat().filter(Boolean) as PdfContent[]

    const docDefinition = {
      pageSize: PAGE_SIZES[pageSize] ?? PAGE_SIZES.A4,
      pageOrientation,
      pageMargins: pageMargin,
      info: {
        title: (node.props.title as string) ?? '',
        author: (node.props.author as string) ?? '',
        subject: (node.props.subject as string) ?? '',
        keywords: (node.props.keywords as string[])?.join(', ') ?? '',
      },
      content,
      defaultStyle: {
        fontSize: 12,
        lineHeight: 1.4,
      },
    }

    return new Promise<Uint8Array>((resolve, reject) => {
      try {
        const pdf = createPdf(docDefinition)
        pdf.getBuffer((buffer: ArrayBuffer) => {
          resolve(new Uint8Array(buffer))
        })
      } catch (err) {
        reject(new Error(`[@pyreon/document] PDF generation failed: ${err}`))
      }
    })
  },
}
