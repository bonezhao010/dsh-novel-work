export const API_BASE = '/novel-workbench/api'

export interface GitFile { status: string; path: string }
export interface GitCommit { hash: string; date: string; subject: string }
export interface GitInfo {
  available: boolean
  branch: string
  dirty: boolean
  files: GitFile[]
  log: GitCommit[]
  error?: string
}

export interface WorkSummary {
  id: string
  title: string
  author: string
  genre: string
  description: string
  createdAt: string
  updatedAt: string
  chapterCount: number
  git: { available: boolean; branch: string; dirty: boolean; changed: number; error?: string }
}

export interface Work {
  id: string
  title: string
  author: string
  genre: string
  logline: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface TreeNode {
  type: 'root' | 'volume' | 'chapter'
  name?: string
  title?: string
  path: string
  order?: number
  children?: TreeNode[]
}

export interface Workbench {
  version: number
  settings: Record<string, unknown>
  characters: any[]
  locations: any[]
  mapLinks: any[]
  events: any[]
  relationships: any[]
  items: any[]
  plotlines: any[]
  foreshadows: any[]
  hooks: any[]
  arcs: Record<string, { stages?: { status: string; note: string }[] }>
  chapterMeta: Record<string, { status?: string; tension?: number; note?: string; updatedAt?: string; words?: number }>
  [key: string]: any
}

export interface WorkState {
  work: Work
  workbench: Workbench
  tree: TreeNode
  git: GitInfo
  stats: { chapterCount: number; wordCount: number }
}

export interface Bootstrap {
  libraryRoot: string
  works: WorkSummary[]
  defaultWorkId: string | null
  now: string
}

export interface ChapterPayload {
  path: string
  content: string
  bytes: number
  updatedAt: string
  words: number
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: {
      accept: 'application/json',
      ...(init?.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
  })
  const text = await response.text()
  let payload: any = null
  try { payload = text ? JSON.parse(text) : null } catch { payload = null }
  if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`)
  return payload as T
}

export const api = {
  bootstrap: () => request<Bootstrap>('/bootstrap'),
  createWork: (body: Record<string, unknown>) => request<{ ok: boolean; work: Work; tree: TreeNode; git: GitInfo }>('/works', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  loadWork: (id: string) => request<WorkState>(`/works/${encodeURIComponent(id)}`),
  updateWork: (id: string, body: Record<string, unknown>) => request<{ ok: boolean; work: Work; git: GitInfo }>(`/works/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  deleteWork: (id: string) => request<{ ok: boolean; bootstrap: Bootstrap }>(`/works/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  readChapter: (id: string, path: string) => request<ChapterPayload>(`/works/${encodeURIComponent(id)}/chapter?path=${encodeURIComponent(path)}`),
  saveChapter: (id: string, path: string, content: string) => request<{ ok: boolean; savedAt: string; words: number; git: GitInfo }>(`/works/${encodeURIComponent(id)}/chapter`, {
    method: 'PUT',
    body: JSON.stringify({ path, content }),
  }),
  createNode: (id: string, body: Record<string, unknown>) => request<any>(`/works/${encodeURIComponent(id)}/node`, {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  renameNode: (id: string, path: string, title: string) => request<any>(`/works/${encodeURIComponent(id)}/node/rename`, {
    method: 'POST',
    body: JSON.stringify({ path, title }),
  }),
  deleteNode: (id: string, path: string) => request<any>(`/works/${encodeURIComponent(id)}/node/delete`, {
    method: 'POST',
    body: JSON.stringify({ path }),
  }),
  moveNode: (id: string, path: string, direction: 'up' | 'down') => request<any>(`/works/${encodeURIComponent(id)}/node/move`, {
    method: 'POST',
    body: JSON.stringify({ path, direction }),
  }),
  saveWorkbench: (id: string, workbench: Workbench) => request<{ ok: boolean; workbench: Workbench; git: GitInfo }>(`/works/${encodeURIComponent(id)}/workbench`, {
    method: 'PUT',
    body: JSON.stringify({ workbench }),
  }),
  git: (id: string) => request<GitInfo>(`/works/${encodeURIComponent(id)}/git`),
  commit: (id: string, message: string) => request<{ ok: boolean; noop?: boolean; git: GitInfo }>(`/works/${encodeURIComponent(id)}/git/commit`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),
  initGit: (id: string) => request<{ ok: boolean; git: GitInfo }>(`/works/${encodeURIComponent(id)}/git/init`, { method: 'POST', body: '{}' }),
  diff: (id: string, path: string) => request<{ path: string; diff: string }>(`/works/${encodeURIComponent(id)}/git/diff?path=${encodeURIComponent(path)}`),
}

/** Flatten the chapter tree in manuscript order. */
export function flattenChapters(tree: TreeNode): { path: string; title: string; volume: string; index: number }[] {
  const result: { path: string; title: string; volume: string; index: number }[] = []
  const walk = (node: TreeNode, volume: string): void => {
    for (const child of node.children ?? []) {
      if (child.type === 'chapter') {
        result.push({ path: child.path, title: child.title ?? child.path, volume, index: result.length })
      } else if (child.type === 'volume') {
        walk(child, child.title ?? volume)
      }
    }
  }
  walk(tree, '')
  return result
}

/** All volumes in display order. */
export function listVolumes(tree: TreeNode): { path: string; title: string }[] {
  return (tree.children ?? [])
    .filter(node => node.type === 'volume')
    .map(node => ({ path: node.path, title: node.title ?? node.path }))
}

/** Path of the chapter node, or undefined when it no longer exists. */
export function findNode(tree: TreeNode, target: string): TreeNode | undefined {
  for (const child of tree.children ?? []) {
    if (child.path === target) return child
    if (child.children) {
      const found = findNode(child, target)
      if (found) return found
    }
  }
  return undefined
}

/** Convert a manuscript path to its display title using the live tree. */
export function chapterTitle(tree: TreeNode, target: string): string {
  return findNode(tree, target)?.title ?? target.split('/').pop()?.replace(/\.md$/i, '') ?? target
}

/** Count CJK characters plus latin word chunks, matching the host's count closely. */
export function countWords(text: string): number {
  return Array.from(
    text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_`~[\]()!-]/g, ' ')
      .replace(/\s+/g, ''),
  ).length
}

/** Stable-enough id for board entities created in the browser. */
export function uid(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `${prefix}-${random.slice(0, 12)}`
}

/** Shorten a path for dense UI without losing the manuscript context. */
export function shortPath(path: string): string {
  const parts = path.split('/')
  return parts.length > 2 ? `${parts[parts.length - 2]}/${parts[parts.length - 1]}` : path
}

const STATUS_MIGRATIONS: Record<string, string> = {
  active: '进行中', closed: '已收束', planned: '待展开',
  paid: '已回收', planted: '已埋设', dropped: '已放弃',
  fired: '已引爆', armed: '待引爆', expired: '已失效',
  draft: '草稿', revise: '修改中', done: '已完成', outline: '大纲',
  '已丢失': '遗失',
}

function migrateStatus(value: unknown, allowed: string[]): string {
  if (typeof value !== 'string' || value === '') return allowed[0]
  if (allowed.includes(value)) return value
  return STATUS_MIGRATIONS[value] ?? value
}

function migrateLevel(value: unknown): unknown {
  return value === 'high' ? '高' : value === 'medium' ? '中' : value === 'low' ? '低' : value
}

/**
 * Normalize board data that may have been written by an older build. The host
 * also migrates on read; this keeps an already-open page correct after a
 * non-reloading host upgrade.
 */
export function normalizeClientWorkbench(input: Workbench): Workbench {
  const workbench = { ...input }
  workbench.characters = (workbench.characters ?? []).filter((entry: any) => entry && typeof entry === 'object').map((character: any) => ({
    ...character,
    ultimateGoal: typeof character.ultimateGoal === 'string' ? character.ultimateGoal : '',
    quests: Array.isArray(character.quests)
      ? character.quests.filter((quest: any) => quest && typeof quest === 'object').map((quest: any) => ({
        ...quest,
        title: typeof quest.title === 'string' ? quest.title : '',
        type: quest.type === 'side' ? 'side' : 'main',
        status: ['active', 'done', 'failed', 'planned'].includes(quest.status) ? quest.status : 'active',
        involvedCharacterIds: Array.isArray(quest.involvedCharacterIds)
          ? quest.involvedCharacterIds.filter((id: unknown) => typeof id === 'string')
          : [],
      }))
      : [],
  }))
  workbench.plotlines = (workbench.plotlines ?? []).filter((entry: any) => entry && typeof entry === 'object').map((entry: any) => ({ ...entry, status: migrateStatus(entry.status, ['进行中', '已收束', '待展开']) }))
  workbench.foreshadows = (workbench.foreshadows ?? []).filter((entry: any) => entry && typeof entry === 'object').map((entry: any) => ({
    ...entry,
    status: migrateStatus(entry.status, ['未埋设', '已埋设', '已回收', '已放弃']),
    importance: migrateLevel(entry.importance),
  }))
  workbench.hooks = (workbench.hooks ?? []).filter((entry: any) => entry && typeof entry === 'object').map((entry: any) => ({ ...entry, status: migrateStatus(entry.status, ['待引爆', '已引爆', '已失效']) }))
  workbench.events = (workbench.events ?? []).filter((entry: any) => entry && typeof entry === 'object').map((entry: any) => ({
    ...entry,
    characterIds: Array.isArray(entry.characterIds) ? entry.characterIds.filter((id: unknown) => typeof id === 'string') : [],
    importance: migrateLevel(entry.importance),
  }))
  workbench.items = (workbench.items ?? []).filter((entry: any) => entry && typeof entry === 'object').map((entry: any) => ({
    ...entry,
    status: entry.status === '已丢失' ? '遗失' : entry.status,
    importance: migrateLevel(entry.importance),
    significance: migrateLevel(entry.significance),
  }))
  workbench.chapterMeta = Object.fromEntries(Object.entries(workbench.chapterMeta ?? {}).map(([key, entry]: [string, any]) => [
    key,
    entry && typeof entry === 'object' ? { ...entry, status: migrateStatus(entry.status, ['草稿', '修改中', '已完成', '大纲']) } : entry,
  ]))
  return workbench
}

export type AssistAction = 'rewrite' | 'expand' | 'analyze' | 'suggest'

export interface AssistRequest {
  action: AssistAction
  text: string
  workTitle: string
  chapterTitle: string
  before: string
  after: string
  storyContext: string
}

export interface AssistResult {
  ok: boolean
  action: AssistAction
  text: string
  provider: string
  model: string
}

export interface BoardAssistRequest {
  board: string
  workTitle: string
  chapterTitle: string
  chapterText: string
  storyContext: string
  data: unknown
  characters: { id: string; name: string; role: string }[]
  chapters: { path: string; title: string }[]
  characterId?: string
}

export interface BoardAssistResult {
  ok: boolean
  board: string
  summary: string
  adds: any[]
  updates: any[]
  warnings: string[]
  provider: string
  model: string
}

export const assistApi = {
  run: (payload: AssistRequest) => request<AssistResult>('/assist', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  board: (payload: BoardAssistRequest) => request<BoardAssistResult>('/assist/board', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
}
