import type { DocChild, DocNode, DocumentRenderer, RenderOptions, TableColumn } from '../types'

/**
 * XLSX renderer — lazy-loads ExcelJS on first use.
 * Extracts tables from the document and renders each as a worksheet.
 * Non-table content (headings, text) becomes header rows.
 */

function resolveColumn(col: string | TableColumn): TableColumn {
  return typeof col === 'string' ? { header: col } : col
}

function getTextContent(children: DocChild[]): string {
  return children
    .map((c) => (typeof c === 'string' ? c : getTextContent((c as DocNode).children)))
    .join('')
}

interface ExtractedSheet {
  name: string
  headings: string[]
  tables: DocNode[]
}

/** Walk the tree and group content into sheets (one per page, or one global). */
function extractSheets(node: DocNode): ExtractedSheet[] {
  const sheets: ExtractedSheet[] = []
  let currentSheet: ExtractedSheet = { name: 'Sheet 1', headings: [], tables: [] }

  function walk(n: DocNode): void {
    switch (n.type) {
      case 'document':
        for (const child of n.children) {
          if (typeof child !== 'string') walk(child)
        }
        break

      case 'page': {
        // Each page becomes a sheet
        if (currentSheet.tables.length > 0 || currentSheet.headings.length > 0) {
          sheets.push(currentSheet)
        }
        currentSheet = {
          name: `Sheet ${sheets.length + 1}`,
          headings: [],
          tables: [],
        }
        for (const child of n.children) {
          if (typeof child !== 'string') walk(child)
        }
        break
      }

      case 'heading': {
        const text = getTextContent(n.children)
        currentSheet.headings.push(text)
        // Use first heading as sheet name
        if (currentSheet.headings.length === 1) {
          currentSheet.name = text.slice(0, 31) // Excel sheet name max 31 chars
        }
        break
      }

      case 'table':
        currentSheet.tables.push(n)
        break

      default:
        // Walk children for nested content
        for (const child of n.children) {
          if (typeof child !== 'string') walk(child)
        }
    }
  }

  walk(node)

  // Push the last sheet
  if (currentSheet.tables.length > 0 || currentSheet.headings.length > 0) {
    sheets.push(currentSheet)
  }

  return sheets
}

export const xlsxRenderer: DocumentRenderer = {
  async render(node: DocNode, _options?: RenderOptions): Promise<Uint8Array> {
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.default.Workbook()

    workbook.creator = (node.props.author as string) ?? ''
    workbook.title = (node.props.title as string) ?? ''

    const sheets = extractSheets(node)

    if (sheets.length === 0) {
      // Create an empty sheet
      workbook.addWorksheet('Sheet 1')
    }

    for (const sheet of sheets) {
      const ws = workbook.addWorksheet(sheet.name)

      let rowNum = 1

      // Add headings as title rows
      for (const heading of sheet.headings) {
        const row = ws.getRow(rowNum)
        row.getCell(1).value = heading
        row.getCell(1).font = { bold: true, size: 14 }
        rowNum++
      }

      if (sheet.headings.length > 0) rowNum++ // gap after headings

      // Add tables
      for (const tableNode of sheet.tables) {
        const columns = ((tableNode.props.columns ?? []) as (string | TableColumn)[]).map(resolveColumn)
        const rows = (tableNode.props.rows ?? []) as (string | number)[][]
        const hs = tableNode.props.headerStyle as { background?: string; color?: string } | undefined

        // Caption
        if (tableNode.props.caption) {
          const captionRow = ws.getRow(rowNum)
          captionRow.getCell(1).value = tableNode.props.caption as string
          captionRow.getCell(1).font = { italic: true, size: 10 }
          rowNum++
        }

        // Header row
        const headerRow = ws.getRow(rowNum)
        for (let i = 0; i < columns.length; i++) {
          const cell = headerRow.getCell(i + 1)
          const col = columns[i]
          if (!col) continue
          cell.value = col.header
          cell.font = { bold: true, color: { argb: hs?.color?.replace('#', 'FF') ?? 'FF000000' } }
          if (hs?.background) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: hs.background.replace('#', 'FF') },
            }
          }
          cell.alignment = { horizontal: col.align ?? 'left' }
        }
        rowNum++

        // Data rows
        for (let r = 0; r < rows.length; r++) {
          const dataRow = ws.getRow(rowNum)
          for (let c = 0; c < columns.length; c++) {
            const cell = dataRow.getCell(c + 1)
            const value = rows[r]?.[c]

            // Try to parse numbers
            if (typeof value === 'number') {
              cell.value = value
            } else if (typeof value === 'string') {
              const num = Number(value.replace(/[$,]/g, ''))
              if (!Number.isNaN(num) && value.match(/^[\d$,.-]+$/)) {
                cell.value = num
              } else {
                cell.value = value
              }
            } else {
              cell.value = String(value ?? '')
            }

            cell.alignment = { horizontal: columns[c].align ?? 'left' }

            // Striped rows
            if (tableNode.props.striped && r % 2 === 1) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF9F9F9' },
              }
            }
          }
          rowNum++
        }

        rowNum++ // gap between tables
      }

      // Auto-fit columns (approximate)
      for (const col of ws.columns) {
        let maxLen = 10
        col.eachCell?.({ includeEmpty: false }, (cell) => {
          const len = String(cell.value ?? '').length
          if (len > maxLen) maxLen = len
        })
        col.width = Math.min(maxLen + 2, 50)
      }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    return new Uint8Array(buffer as ArrayBuffer)
  },
}
