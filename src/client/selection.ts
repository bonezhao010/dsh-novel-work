/**
 * Locate a rendered-text selection inside the Markdown source.
 *
 * A preview selection is plain text, while the source may contain heading,
 * emphasis, list, and link markers. We first try the literal text, then a
 * whitespace-normalized map, then maps that skip common Markdown markers.
 */

export const MAX_SELECTION = 800

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

type MapMode = 'plain' | 'markers' | 'markersAndLinks'

function buildMap(source: string, mode: MapMode): { text: string; map: number[] } {
  let text = ''
  const map: number[] = []
  let index = 0
  let lineStart = true

  const append = (char: string, at: number) => {
    text += char
    map.push(at)
    lineStart = false
  }

  while (index < source.length) {
    const char = source[index]

    if (/\s/.test(char)) {
      let next = index
      let hadNewline = false
      while (next < source.length && /\s/.test(source[next])) {
        if (source[next] === '\n') hadNewline = true
        next += 1
      }
      if (text !== '' && !text.endsWith(' ')) {
        text += ' '
        map.push(index)
      }
      if (hadNewline) lineStart = true
      index = next
      continue
    }

    if (mode !== 'plain') {
      if ('*_`~'.includes(char)) { index += 1; continue }
      if (lineStart && char === '#') {
        while (index < source.length && source[index] === '#') index += 1
        while (index < source.length && source[index] === ' ') index += 1
        continue
      }
      if (lineStart && char === '>') {
        index += 1
        while (index < source.length && source[index] === ' ') index += 1
        continue
      }
      if (lineStart && (char === '-' || char === '+' || char === '*') && source[index + 1] === ' ') {
        index += 2
        continue
      }
      if (lineStart && /\d/.test(char)) {
        let next = index
        while (next < source.length && /\d/.test(source[next])) next += 1
        if (source[next] === '.' && source[next + 1] === ' ') {
          index = next + 2
          continue
        }
      }
      if (mode === 'markersAndLinks' && '[]()'.includes(char)) { index += 1; continue }
    }

    append(char, index)
    index += 1
  }
  return { text, map }
}

/** Return the source range matching a preview selection, or null. */
export function findSelectionRange(source: string, selected: string): [number, number] | null {
  if (!selected.trim()) return null
  const exact = source.indexOf(selected)
  if (exact >= 0) return [exact, exact + selected.length]

  const needle = normalize(selected)
  if (!needle) return null
  for (const mode of ['plain', 'markers', 'markersAndLinks'] as const) {
    const { text, map } = buildMap(source, mode)
    const hit = text.toLowerCase().indexOf(needle)
    if (hit < 0) continue
    const start = map[hit]
    const end = map[hit + needle.length - 1]
    if (start === undefined || end === undefined) continue
    return expandMarkerRange(source, start, end + 1)
  }
  return null
}

/** Keep paired emphasis markers balanced when a selection crosses into them. */
function expandMarkerRange(source: string, start: number, end: number): [number, number] {
  for (const marker of ['**', '__', '~~', '`', '*', '_']) {
    if (source.startsWith(marker, end) && source.slice(start, end).includes(marker)) {
      return [start, end + marker.length]
    }
    if (start >= marker.length && source.slice(start - marker.length, start) === marker && source.slice(end).includes(marker)) {
      return [start - marker.length, end]
    }
  }
  return [start, end]
}

/** Ensure a proposed replacement still corresponds to the current source. */
export function replaceRange(source: string, range: [number, number], replacement: string): string {
  return source.slice(0, range[0]) + replacement + source.slice(range[1])
}
