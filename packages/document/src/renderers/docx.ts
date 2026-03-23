import type { DocChild, DocNode, DocumentRenderer, RenderOptions, TableColumn } from '../types'

/**
 * DOCX renderer — lazy-loads the 'docx' npm package on first use.
 */

function resolveColumn(col: string | TableColumn): TableColumn {
  return typeof col === 'string' ? { header: col } : col
}

function getTextContent(children: DocChild[]): string {
  return children
    .map((c) => (typeof c === 'string' ? c : getTextContent((c as DocNode).children)))
    .join('')
}

export const docxRenderer: DocumentRenderer = {
  async render(node: DocNode, _options?: RenderOptions): Promise<Uint8Array> {
    const docx = await import('docx')

    const children: docx.FileChild[] = []

    function processNode(n: DocNode): void {
      const p = n.props

      switch (n.type) {
        case 'document':
        case 'page':
        case 'section':
        case 'row':
        case 'column':
          for (const child of n.children) {
            if (typeof child !== 'string') processNode(child)
            else children.push(new docx.Paragraph({ text: child }))
          }
          break

        case 'heading': {
          const level = (p.level as number) ?? 1
          const headingMap: Record<number, (typeof docx.HeadingLevel)[keyof typeof docx.HeadingLevel]> = {
            1: docx.HeadingLevel.HEADING_1,
            2: docx.HeadingLevel.HEADING_2,
            3: docx.HeadingLevel.HEADING_3,
            4: docx.HeadingLevel.HEADING_4,
            5: docx.HeadingLevel.HEADING_5,
            6: docx.HeadingLevel.HEADING_6,
          }
          children.push(
            new docx.Paragraph({
              heading: headingMap[level] ?? docx.HeadingLevel.HEADING_1,
              children: [
                new docx.TextRun({
                  text: getTextContent(n.children),
                  bold: true,
                  color: (p.color as string)?.replace('#', '') ?? '000000',
                }),
              ],
              alignment: alignmentMap(p.align as string),
            }),
          )
          break
        }

        case 'text': {
          children.push(
            new docx.Paragraph({
              children: [
                new docx.TextRun({
                  text: getTextContent(n.children),
                  bold: p.bold as boolean | undefined,
                  italics: p.italic as boolean | undefined,
                  underline: p.underline ? {} : undefined,
                  strike: p.strikethrough as boolean | undefined,
                  size: p.size ? (p.size as number) * 2 : undefined, // DOCX uses half-points
                  color: (p.color as string)?.replace('#', '') ?? '333333',
                }),
              ],
              alignment: alignmentMap(p.align as string),
              spacing: { after: 120 },
            }),
          )
          break
        }

        case 'link': {
          children.push(
            new docx.Paragraph({
              children: [
                new docx.ExternalHyperlink({
                  link: p.href as string,
                  children: [
                    new docx.TextRun({
                      text: getTextContent(n.children),
                      color: (p.color as string)?.replace('#', '') ?? '4f46e5',
                      underline: { type: docx.UnderlineType.SINGLE },
                    }),
                  ],
                }),
              ],
            }),
          )
          break
        }

        case 'image': {
          // DOCX image requires base64 data — external URLs need pre-fetching
          // For now, add a placeholder paragraph
          const alt = (p.alt as string) ?? 'Image'
          const caption = p.caption ? ` — ${p.caption}` : ''
          children.push(
            new docx.Paragraph({
              children: [
                new docx.TextRun({
                  text: `[${alt}${caption}]`,
                  italics: true,
                  color: '999999',
                }),
              ],
            }),
          )
          break
        }

        case 'table': {
          const columns = ((p.columns ?? []) as (string | TableColumn)[]).map(resolveColumn)
          const rows = (p.rows ?? []) as (string | number)[][]
          const hs = p.headerStyle as { background?: string; color?: string } | undefined

          const headerRow = new docx.TableRow({
            tableHeader: true,
            children: columns.map(
              (col) =>
                new docx.TableCell({
                  children: [
                    new docx.Paragraph({
                      children: [
                        new docx.TextRun({
                          text: col.header,
                          bold: true,
                          color: hs?.color?.replace('#', '') ?? '000000',
                        }),
                      ],
                      alignment: alignmentMap(col.align),
                    }),
                  ],
                  shading: hs?.background
                    ? { fill: hs.background.replace('#', ''), type: docx.ShadingType.SOLID }
                    : undefined,
                }),
            ),
          })

          const dataRows = rows.map(
            (row, rowIdx) =>
              new docx.TableRow({
                children: columns.map(
                  (col, colIdx) =>
                    new docx.TableCell({
                      children: [
                        new docx.Paragraph({
                          children: [new docx.TextRun({ text: String(row[colIdx] ?? '') })],
                          alignment: alignmentMap(col.align),
                        }),
                      ],
                      shading:
                        p.striped && rowIdx % 2 === 1
                          ? { fill: 'F9F9F9', type: docx.ShadingType.SOLID }
                          : undefined,
                    }),
                ),
              }),
          )

          if (p.caption) {
            children.push(
              new docx.Paragraph({
                children: [new docx.TextRun({ text: p.caption as string, italics: true, size: 20 })],
                spacing: { after: 60 },
              }),
            )
          }

          children.push(
            new docx.Table({
              rows: [headerRow, ...dataRows],
              width: { size: 100, type: docx.WidthType.PERCENTAGE },
            }),
          )
          children.push(new docx.Paragraph({ text: '', spacing: { after: 120 } }))
          break
        }

        case 'list': {
          const ordered = p.ordered as boolean | undefined
          const items = n.children.filter((c): c is DocNode => typeof c !== 'string')
          for (const item of items) {
            children.push(
              new docx.Paragraph({
                children: [new docx.TextRun({ text: getTextContent(item.children) })],
                numbering: ordered
                  ? { reference: 'ordered-list', level: 0 }
                  : undefined,
                bullet: ordered ? undefined : { level: 0 },
              }),
            )
          }
          children.push(new docx.Paragraph({ text: '', spacing: { after: 60 } }))
          break
        }

        case 'code': {
          children.push(
            new docx.Paragraph({
              children: [
                new docx.TextRun({
                  text: getTextContent(n.children),
                  font: 'Courier New',
                  size: 20,
                }),
              ],
              shading: { fill: 'F5F5F5', type: docx.ShadingType.SOLID },
              spacing: { after: 120 },
            }),
          )
          break
        }

        case 'divider': {
          children.push(
            new docx.Paragraph({
              border: {
                bottom: {
                  style: docx.BorderStyle.SINGLE,
                  size: (p.thickness as number | undefined) ?? 1,
                  color: (p.color as string)?.replace('#', '') ?? 'DDDDDD',
                },
              },
              spacing: { before: 120, after: 120 },
            }),
          )
          break
        }

        case 'spacer':
          children.push(new docx.Paragraph({ text: '', spacing: { after: (p.height as number) * 20 } }))
          break

        case 'button':
        case 'quote': {
          const text = getTextContent(n.children)
          if (n.type === 'button') {
            children.push(
              new docx.Paragraph({
                children: [
                  new docx.ExternalHyperlink({
                    link: p.href as string,
                    children: [
                      new docx.TextRun({
                        text,
                        bold: true,
                        color: '4F46E5',
                        underline: { type: docx.UnderlineType.SINGLE },
                      }),
                    ],
                  }),
                ],
                spacing: { after: 120 },
              }),
            )
          } else {
            children.push(
              new docx.Paragraph({
                children: [new docx.TextRun({ text, italics: true, color: '555555' })],
                indent: { left: 720 },
                border: {
                  left: {
                    style: docx.BorderStyle.SINGLE,
                    size: 6,
                    color: (p.borderColor as string)?.replace('#', '') ?? 'DDDDDD',
                  },
                },
                spacing: { after: 120 },
              }),
            )
          }
          break
        }
      }
    }

    function alignmentMap(align?: string): docx.AlignmentType | undefined {
      if (!align) return undefined
      const map: Record<string, docx.AlignmentType> = {
        left: docx.AlignmentType.LEFT,
        center: docx.AlignmentType.CENTER,
        right: docx.AlignmentType.RIGHT,
        justify: docx.AlignmentType.JUSTIFIED,
      }
      return map[align]
    }

    processNode(node)

    const doc = new docx.Document({
      numbering: {
        config: [
          {
            reference: 'ordered-list',
            levels: [
              {
                level: 0,
                format: docx.LevelFormat.DECIMAL,
                text: '%1.',
                alignment: docx.AlignmentType.LEFT,
              },
            ],
          },
        ],
      },
      sections: [
        {
          properties: {},
          children,
        },
      ],
    })

    const buffer = await docx.Packer.toBuffer(doc)
    return new Uint8Array(buffer)
  },
}
