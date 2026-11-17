import { uid, type Workbench } from './api'
import type { ChapterRef } from './panels/types'

export type BoardId =
  | 'characters' | 'quests' | 'arc' | 'locations' | 'events' | 'relationships'
  | 'items' | 'plotlines' | 'foreshadows' | 'tension' | 'hooks'

export interface BoardOption { id: BoardId; toolId: string; label: string }

export const BOARD_OPTIONS: BoardOption[] = [
  { id: 'characters', toolId: 'characters', label: '人物' },
  { id: 'quests', toolId: 'quests', label: '任务' },
  { id: 'arc', toolId: 'arc', label: '弧光' },
  { id: 'locations', toolId: 'map', label: '地图' },
  { id: 'events', toolId: 'events', label: '事件' },
  { id: 'relationships', toolId: 'relations', label: '关系' },
  { id: 'items', toolId: 'items', label: '道具' },
  { id: 'plotlines', toolId: 'plots', label: '明暗线' },
  { id: 'foreshadows', toolId: 'foreshadow', label: '伏笔' },
  { id: 'tension', toolId: 'tension', label: '起伏' },
  { id: 'hooks', toolId: 'hooks', label: '钩子' },
]

export function boardForTool(toolId: string): BoardId {
  return BOARD_OPTIONS.find(option => option.toolId === toolId)?.id ?? 'characters'
}

function arrays(value: any): any[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []
}

function text(value: any): string {
  return typeof value === 'string' ? value : ''
}

function numberIn(value: any, min: number, max: number, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback
}

export function buildStoryContext(workbench: Workbench | null | undefined): string {
  if (!workbench) return ''
  const characters = (workbench.characters ?? []).slice(0, 12).map((character: any) => {
    const quests = (character.quests ?? []).filter((quest: any) => quest.status !== 'done').slice(0, 3).map((quest: any) => quest.title).join('、')
    return `${character.name}（${character.role ?? '角色'}；终极目标：${character.ultimateGoal || character.goal || '未设置'}${quests ? `；任务：${quests}` : ''}）`
  })
  const plotlines = (workbench.plotlines ?? []).slice(0, 8).map((line: any) => `${line.title}（${line.kind === 'main' ? '明线' : '暗线'}，${line.status ?? '进行中'}）`)
  const foreshadows = (workbench.foreshadows ?? []).slice(0, 8).map((entry: any) => `${entry.title}（${entry.status ?? '未埋设'}）`)
  return [characters.length ? `人物：${characters.join('；')}` : '', plotlines.length ? `明暗线：${plotlines.join('；')}` : '', foreshadows.length ? `伏笔：${foreshadows.join('；')}` : '']
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000)
}

export function buildBoardPayload(board: BoardId, workbench: Workbench, characterId: string, chapters: ChapterRef[]): any {
  const character = (workbench.characters ?? []).find((entry: any) => entry.id === characterId) ?? workbench.characters?.[0]
  switch (board) {
    case 'characters':
      return { characters: workbench.characters ?? [] }
    case 'quests':
      return character ? { characterId: character.id, characterName: character.name, ultimateGoal: character.ultimateGoal ?? '', quests: character.quests ?? [] } : null
    case 'arc':
      return character ? {
        characterId: character.id,
        characterName: character.name,
        stageNames: ['平凡世界', '冒险召唤', '拒绝召唤', '遇见导师', '跨越门槛', '考验与盟友', '接近深渊', '磨难与归返'],
        stages: (workbench.arcs?.[character.id]?.stages ?? []).length === 8
          ? workbench.arcs[character.id].stages
          : Array.from({ length: 8 }, () => ({ status: 'todo', note: '' })),
      } : null
    case 'locations':
      return { locations: workbench.locations ?? [], links: workbench.mapLinks ?? [] }
    case 'events':
      return { events: workbench.events ?? [] }
    case 'relationships':
      return { relationships: workbench.relationships ?? [] }
    case 'items':
      return { items: workbench.items ?? [] }
    case 'plotlines':
      return { plotlines: workbench.plotlines ?? [] }
    case 'foreshadows':
      return { foreshadows: workbench.foreshadows ?? [] }
    case 'tension':
      return {
        chapters: chapters.map(chapter => ({
          path: chapter.path,
          title: chapter.title,
          tension: numberIn(workbench.chapterMeta?.[chapter.path]?.tension, 1, 10, 5),
          note: workbench.chapterMeta?.[chapter.path]?.note ?? '',
        })),
      }
    case 'hooks':
      return { hooks: workbench.hooks ?? [] }
  }
}

const ARRAY_BOARDS: Record<string, { key: string; prefix: string; defaults: Record<string, any> }> = {
  characters: {
    key: 'characters',
    prefix: 'char',
    defaults: {
      name: '', role: '配角', age: '', tags: [], appearance: '', personality: '', goal: '', ultimateGoal: '', secret: '', status: '辅线', notes: '', quests: [],
    },
  },
  locations: {
    key: 'locations',
    prefix: 'loc',
    defaults: { name: '', type: '建筑', x: 50, y: 50, description: '', firstChapter: '' },
  },
  events: {
    key: 'events',
    prefix: 'event',
    defaults: { title: '', storyTime: '', type: '调查', importance: '中', chapterPath: '', characterIds: [], description: '' },
  },
  relationships: {
    key: 'relationships',
    prefix: 'rel',
    defaults: { from: '', to: '', type: '盟友', strength: 3, description: '' },
  },
  items: {
    key: 'items',
    prefix: 'item',
    defaults: { name: '', type: '信物', ownerId: '', status: '持有中', significance: '中', firstChapter: '', description: '' },
  },
  plotlines: {
    key: 'plotlines',
    prefix: 'plot',
    defaults: { title: '', kind: 'main', status: '进行中', progress: 20, startChapter: '', endChapter: '', description: '' },
  },
  foreshadows: {
    key: 'foreshadows',
    prefix: 'seed',
    defaults: { title: '', plantedChapter: '', payoffChapter: '', status: '未埋设', importance: '中', description: '' },
  },
  hooks: {
    key: 'hooks',
    prefix: 'hook',
    defaults: { title: '', chapterPath: '', type: '悬念', status: '待引爆', content: '', note: '' },
  },
}

function normalizeAdded(board: BoardId, raw: any): any {
  const spec = ARRAY_BOARDS[board]
  const entity: any = { ...spec.defaults, ...raw, id: uid(spec.prefix) }
  delete entity.characterId
  if (board === 'characters') {
    entity.tags = Array.isArray(entity.tags) ? entity.tags.filter((tag: unknown) => typeof tag === 'string') : []
    entity.quests = arrays(entity.quests)
  }
  if (board === 'events') entity.characterIds = Array.isArray(entity.characterIds) ? entity.characterIds.filter((id: unknown) => typeof id === 'string') : []
  if (board === 'relationships') entity.strength = numberIn(entity.strength, 1, 5, 3)
  if (board === 'locations') {
    entity.x = numberIn(entity.x, 3, 97, 50)
    entity.y = numberIn(entity.y, 3, 97, 50)
  }
  if (board === 'plotlines') {
    entity.progress = numberIn(entity.progress, 0, 100, 20)
    entity.kind = entity.kind === 'sub' ? 'sub' : 'main'
  }
  return entity
}

function normalizeQuest(raw: any): any {
  return {
    title: text(raw.title),
    type: raw.type === 'side' ? 'side' : 'main',
    status: ['planned', 'active', 'done', 'failed'].includes(raw.status) ? raw.status : 'active',
    involvedCharacterIds: Array.isArray(raw.involvedCharacterIds) ? raw.involvedCharacterIds.filter((id: unknown) => typeof id === 'string') : [],
    note: text(raw.note),
    ...(typeof raw.id === 'string' && raw.id ? { id: raw.id } : {}),
  }
}

export function applyBoardProposals(
  workbench: Workbench,
  board: BoardId,
  adds: any[],
  updates: any[],
  characterId: string,
  chapters: ChapterRef[],
): Workbench {
  const next: any = { ...workbench }
  const spec = ARRAY_BOARDS[board]
  if (spec) {
    const current = Array.isArray(next[spec.key]) ? next[spec.key] : []
    const added = adds.map(raw => normalizeAdded(board, raw))
    let merged = [...current, ...added]
    for (const update of updates) {
      if (typeof update.id !== 'string' || !update.id) continue
      const changes = update.changes && typeof update.changes === 'object' ? update.changes : {}
      merged = merged.map((entity: any) => entity.id === update.id
        ? { ...entity, ...changes, id: entity.id }
        : entity)
    }
    next[spec.key] = merged
    if (board === 'characters') {
      const arcs = { ...(next.arcs ?? {}) }
      for (const character of added) {
        if (!arcs[character.id]) arcs[character.id] = { stages: Array.from({ length: 8 }, () => ({ status: 'todo', note: '' })) }
      }
      next.arcs = arcs
    }
    return next
  }

  if (board === 'quests') {
    let characters = Array.isArray(next.characters) ? [...next.characters] : []
    for (const raw of adds) {
      const targetId = typeof raw.characterId === 'string' && raw.characterId ? raw.characterId : characterId
      if (!targetId) continue
      characters = characters.map((character: any) => character.id === targetId
        ? { ...character, quests: [...(character.quests ?? []), { ...normalizeQuest(raw), id: uid('quest') }] }
        : character)
    }
    for (const update of updates) {
      const targetId = typeof update.characterId === 'string' && update.characterId ? update.characterId : characterId
      if (!targetId || typeof update.id !== 'string') continue
      const changes = update.changes && typeof update.changes === 'object' ? update.changes : {}
      characters = characters.map((character: any) => character.id === targetId
        ? {
          ...character,
          quests: (character.quests ?? []).map((quest: any) => quest.id === update.id
            ? { ...quest, ...normalizeQuest({ ...quest, ...changes, id: quest.id }), id: quest.id }
            : quest),
        }
        : character)
    }
    next.characters = characters
    return next
  }

  if (board === 'arc') {
    const arcs = { ...(next.arcs ?? {}) }
    for (const update of updates) {
      const targetId = typeof update.characterId === 'string' && update.characterId ? update.characterId : characterId
      const stageIndex = Number(update.stageIndex)
      if (!targetId || !Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex > 7) continue
      const existing = arcs[targetId]?.stages?.length === 8 ? arcs[targetId].stages : Array.from({ length: 8 }, () => ({ status: 'todo', note: '' }))
      const changes = update.changes && typeof update.changes === 'object' ? update.changes : {}
      arcs[targetId] = {
        ...(arcs[targetId] ?? {}),
        stages: existing.map((stage: any, index: number) => index === stageIndex
          ? {
            ...stage,
            ...(changes.status === 'todo' || changes.status === 'doing' || changes.status === 'done' ? { status: changes.status } : {}),
            ...(typeof changes.note === 'string' ? { note: changes.note } : {}),
          }
          : stage),
      }
    }
    next.arcs = arcs
    return next
  }

  if (board === 'tension') {
    const chapterMeta = { ...(next.chapterMeta ?? {}) }
    const allowed = new Set(chapters.map(chapter => chapter.path))
    for (const update of updates) {
      const chapterPath = typeof update.path === 'string' ? update.path : ''
      if (!chapterPath || (allowed.size > 0 && !allowed.has(chapterPath))) continue
      const changes = update.changes && typeof update.changes === 'object' ? update.changes : {}
      chapterMeta[chapterPath] = {
        ...(chapterMeta[chapterPath] ?? {}),
        ...(changes.tension === undefined ? {} : { tension: numberIn(changes.tension, 1, 10, 5) }),
        ...(typeof changes.note === 'string' ? { note: changes.note } : {}),
      }
    }
    next.chapterMeta = chapterMeta
    return next
  }

  return next
}

export function resolveProposalBefore(workbench: Workbench, board: BoardId, proposal: any, characterId: string): any {
  const spec = ARRAY_BOARDS[board]
  if (spec) return (workbench as any)[spec.key]?.find((entity: any) => entity.id === proposal.id)
  const targetId = typeof proposal.characterId === 'string' && proposal.characterId ? proposal.characterId : characterId
  if (board === 'quests') {
    return (workbench.characters ?? []).find((character: any) => character.id === targetId)?.quests?.find((quest: any) => quest.id === proposal.id)
  }
  if (board === 'arc') {
    const index = Number(proposal.stageIndex)
    return (workbench.arcs?.[targetId]?.stages ?? [])[index]
  }
  if (board === 'tension') return workbench.chapterMeta?.[proposal.path]
  return undefined
}

export function proposalTitle(workbench: Workbench, board: BoardId, proposal: any, characterId: string): string {
  if (board === 'arc') {
    const targetId = typeof proposal.characterId === 'string' && proposal.characterId ? proposal.characterId : characterId
    const name = (workbench.characters ?? []).find((character: any) => character.id === targetId)?.name ?? targetId
    return `${name} · ${Number(proposal.stageIndex) + 1}`
  }
  if (board === 'tension') return String(proposal.path ?? '').split('/').pop()?.replace(/\.md$/i, '') ?? ''
  return proposal.name || proposal.title || proposal.id || ''
}
