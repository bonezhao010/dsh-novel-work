import React from 'react'

/**
 * A deliberately small, dependency-free Markdown renderer for manuscript
 * previews. It covers headings, paragraphs, emphasis, links, code, quotes,
 * lists, task items, rules, and fenced blocks. React escapes all text.
 */

function safeHref(raw: string): string | undefined {
  const value = raw.trim()
  if (/^(https?:\/\/|mailto:|#)/i.test(value)) return value
  return undefined
}

function inline(text: string, keyBase: string): React.ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g
  const result: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  let index = 0
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) result.push(text.slice(last, match.index))
    const token = match[0]
    const key = `${keyBase}-${index++}`
    if (token.startsWith('**') || token.startsWith('__')) {
      result.push(<strong key={key}>{inline(token.slice(2, -2), key)}</strong>)
    } else if (token.startsWith('`')) {
      result.push(<code key={key}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('~~')) {
      result.push(<s key={key}>{inline(token.slice(2, -2), key)}</s>)
    } else if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      if (link) {
        const href = safeHref(link[2])
        result.push(href
          ? <a key={key} href={href} target="_blank" rel="noreferrer">{inline(link[1], key)}</a>
          : <span key={key}>{inline(link[1], key)}</span>)
      } else result.push(token)
    } else {
      result.push(<em key={key}>{inline(token.slice(1, -1), key)}</em>)
    }
    last = match.index + token.length
  }
  if (last < text.length) result.push(text.slice(last))
  return result
}

function linesAsParagraph(lines: string[], keyBase: string): React.ReactNode {
  return lines.map((line, index) => (
    <React.Fragment key={`${keyBase}-${index}`}>
      {index > 0 ? <br /> : null}
      {inline(line, `${keyBase}-${index}`)}
    </React.Fragment>
  ))
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0
  let blockIndex = 0
  const nextKey = () => `md-${blockIndex++}`

  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '') { i += 1; continue }

    if (/^```/.test(line.trim())) {
      const language = line.trim().slice(3).trim()
      const body: string[] = []
      i += 1
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        body.push(lines[i])
        i += 1
      }
      if (i < lines.length) i += 1
      blocks.push(
        <pre key={nextKey()} className="nwb-md-code">
          <code data-language={language || undefined}>{body.join('\n')}</code>
        </pre>,
      )
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const content = inline(heading[2], nextKey())
      const key = nextKey()
      if (level === 1) blocks.push(<h1 key={key}>{content}</h1>)
      else if (level === 2) blocks.push(<h2 key={key}>{content}</h2>)
      else if (level === 3) blocks.push(<h3 key={key}>{content}</h3>)
      else if (level === 4) blocks.push(<h4 key={key}>{content}</h4>)
      else if (level === 5) blocks.push(<h5 key={key}>{content}</h5>)
      else blocks.push(<h6 key={key}>{content}</h6>)
      i += 1
      continue
    }

    if (/^\s*([-*_])\s*\1\s*\1[\s\S]*$/.test(line) && line.trim().length >= 3) {
      blocks.push(<hr key={nextKey()} />)
      i += 1
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''))
        i += 1
      }
      blocks.push(
        <blockquote key={nextKey()}>
          {quote.map((entry, index) => (
            <p key={index}>{entry.trim() === '' ? <br /> : inline(entry, `${nextKey()}-${index}`)}</p>
          ))}
        </blockquote>,
      )
      continue
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: { checked?: boolean; text: string }[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        const raw = lines[i].replace(/^\s*[-*+]\s+/, '')
        const task = /^\[([ xX])\]\s+(.*)$/.exec(raw)
        items.push(task ? { checked: task[1].toLowerCase() === 'x', text: task[2] } : { text: raw })
        i += 1
      }
      blocks.push(
        <ul key={nextKey()} className={items.some(item => item.checked !== undefined) ? 'nwb-md-tasks' : undefined}>
          {items.map((item, index) => (
            <li key={index} className={item.checked !== undefined ? 'nwb-md-task' : undefined}>
              {item.checked !== undefined ? (
                <span className={`nwb-md-check${item.checked ? ' is-done' : ''}`} aria-hidden="true">{item.checked ? '✓' : ''}</span>
              ) : null}
              {inline(item.text, `${nextKey()}-${index}`)}
            </li>
          ))}
        </ul>,
      )
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i += 1
      }
      blocks.push(
        <ol key={nextKey()}>
          {items.map((item, index) => <li key={index}>{inline(item, `${nextKey()}-${index}`)}</li>)}
        </ol>,
      )
      continue
    }

    const paragraph: string[] = [line]
    i += 1
    while (i < lines.length && lines[i].trim() !== '' && !/^```/.test(lines[i].trim())
      && !/^(#{1,6})\s+/.test(lines[i]) && !/^\s*>\s?/.test(lines[i])
      && !/^\s*[-*+]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])) {
      paragraph.push(lines[i])
      i += 1
    }
    blocks.push(<p key={nextKey()}>{linesAsParagraph(paragraph, nextKey())}</p>)
  }

  return <div className={`nwb-markdown${className ? ` ${className}` : ''}`}>{blocks}</div>
}
