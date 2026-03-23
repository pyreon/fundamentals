import type { DocChild, DocNode, DocumentRenderer, RenderOptions, TableColumn } from '../types'

/**
 * Discord renderer — outputs embed JSON for Discord webhooks/bots.
 * Uses Discord's markdown subset and embed structure.
 */

function resolveColumn(col: string | TableColumn): TableColumn {
  return typeof col === 'string' ? { header: col } : col
}

function getTextContent(children: DocChild[]): string {
  return children
    .map((c) => (typeof c === 'string' ? c : getTextContent((c as DocNode).children)))
    .join('')
}

interface DiscordField {
  name: string
  value: string
  inline?: boolean
}

function nodeToMarkdown(node: DocNode): { content: string; fields: DiscordField[]; title?: string; imageUrl?: string } {
  const p = node.props
  let content = ''
  const fields: DiscordField[] = []
  let title: string | undefined
  let imageUrl: string | undefined

  switch (node.type) {
    case 'document':
    case 'page':
    case 'section':
    case 'row':
    case 'column':
      for (const child of node.children) {
        if (typeof child !== 'string') {
          const result = nodeToMarkdown(child)
          content += result.content
          fields.push(...result.fields)
          if (!title && result.title) title = result.title
          if (!imageUrl && result.imageUrl) imageUrl = result.imageUrl
        }
      }
      break

    case 'heading': {
      const text = getTextContent(node.children)
      const level = (p.level as number) ?? 1
      if (level === 1 && !title) {
        title = text
      } else {
        content += `**${text}**\n\n`
      }
      break
    }

    case 'text': {
      let text = getTextContent(node.children)
      if (p.bold) text = `**${text}**`
      if (p.italic) text = `*${text}*`
      if (p.strikethrough) text = `~~${text}~~`
      content += `${text}\n\n`
      break
    }

    case 'link': {
      const href = p.href as string
      const text = getTextContent(node.children)
      content += `[${text}](${href})\n\n`
      break
    }

    case 'image': {
      const src = p.src as string
      if (src.startsWith('http') && !imageUrl) {
        imageUrl = src
      }
      break
    }

    case 'table': {
      const columns = ((p.columns ?? []) as (string | TableColumn)[]).map(resolveColumn)
      const rows = (p.rows ?? []) as (string | number)[][]

      // Use Discord embed fields for small tables
      if (columns.length <= 3 && rows.length <= 10) {
        for (const col of columns) {
          const colIdx = columns.indexOf(col)
          const values = rows.map((row) => String(row[colIdx] ?? '')).join('\n')
          fields.push({
            name: col.header,
            value: values || '-',
            inline: true,
          })
        }
      } else {
        // Fallback to code block for large tables
        const header = columns.map((c) => c.header).join(' | ')
        const separator = columns.map(() => '---').join(' | ')
        const body = rows.map((row) => row.map((c) => String(c ?? '')).join(' | ')).join('\n')
        content += `\`\`\`\n${header}\n${separator}\n${body}\n\`\`\`\n\n`
      }
      break
    }

    case 'list': {
      const ordered = p.ordered as boolean | undefined
      const items = node.children
        .filter((c): c is DocNode => typeof c !== 'string')
        .map((item, i) => {
          const prefix = ordered ? `${i + 1}.` : '•'
          return `${prefix} ${getTextContent(item.children)}`
        })
        .join('\n')
      content += `${items}\n\n`
      break
    }

    case 'code': {
      const lang = (p.language as string) ?? ''
      const text = getTextContent(node.children)
      content += `\`\`\`${lang}\n${text}\n\`\`\`\n\n`
      break
    }

    case 'divider':
    case 'page-break':
      content += '───────────\n\n'
      break

    case 'button': {
      const href = p.href as string
      const text = getTextContent(node.children)
      content += `[**${text}**](${href})\n\n`
      break
    }

    case 'quote': {
      const text = getTextContent(node.children)
      content += `> ${text}\n\n`
      break
    }
  }

  return { content, fields, title, imageUrl }
}

export const discordRenderer: DocumentRenderer = {
  async render(node: DocNode, _options?: RenderOptions): Promise<string> {
    const { content, fields, title, imageUrl } = nodeToMarkdown(node)

    const embed: Record<string, unknown> = {
      title: title ?? (node.props.title as string) ?? undefined,
      description: content.trim() || undefined,
      color: 0x4f46e5,
    }

    if (fields.length > 0) embed.fields = fields
    if (imageUrl) embed.image = { url: imageUrl }

    return JSON.stringify({ embeds: [embed] }, null, 2)
  },
}
