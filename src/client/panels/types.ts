import type { Workbench } from '../api'

export interface ChapterRef { path: string; title: string; volume: string; index: number }

export interface ToolProps {
  t: (key: string) => string
  workbench: Workbench
  chapters: ChapterRef[]
  onChange: (updater: (current: Workbench) => Workbench, immediate?: boolean) => void
  onToast: (message: string) => void
}

export const CHARACTER_ROLES = ['主角', '配角', '反派', '导师', '盟友', '其他']
export const RELATION_TYPES = ['盟友', '爱情', '亲情', '师徒', '利益', '隐瞒', '对立', '冲突', '其他']
export const EVENT_TYPES = ['背景', '开端', '调查', '转折', '危机', '高潮前夜', '结局', '其他']
export const IMPORTANCE = ['高', '中', '低']
export const ITEM_TYPES = ['信物', '证据', '线索', '人物物件', '其他']
export const ITEM_STATUS = ['持有中', '遗失', '未送达', '已损毁', '未知']
export const PLOT_STATUS = ['进行中', '已收束', '待展开']
export const FORESHADOW_STATUS = ['未埋设', '已埋设', '已回收', '已放弃']
export const HOOK_TYPES = ['悬念', '反转', '情感', '危机', '信息差', '恐怖']
export const HOOK_STATUS = ['待引爆', '已引爆', '已失效']
export const CHAPTER_STATUS = ['草稿', '修改中', '已完成', '大纲']

export function chapterOptions(chapters: ChapterRef[], t: (key: string) => string) {
  return chapters.map(chapter => ({
    value: chapter.path,
    label: chapter.volume ? `${chapter.volume} / ${chapter.title}` : `${t('第 {n} 章').replace('{n}', String(chapter.index + 1))} ${chapter.title}`,
  }))
}

export function characterOptions(workbench: Workbench) {
  return workbench.characters.map(character => ({ value: character.id, label: character.name || character.id }))
}

export function chapterLabel(chapters: ChapterRef[], path: string, t: (key: string) => string): string {
  const found = chapters.find(chapter => chapter.path === path)
  if (!found) return path ? path.split('/').pop()?.replace(/\.md$/i, '') ?? path : t('未设置')
  return found.title
}

export function relationTone(type: string): string {
  if (type === '对立' || type === '冲突') return 'danger'
  if (type === '爱情') return 'brand'
  if (type === '盟友' || type === '师徒' || type === '亲情') return 'success'
  if (type === '隐瞒') return 'warn'
  return 'neutral'
}

export function statusTone(status: string): string {
  if (['已完成', '已回收', '已收束', '已引爆'].includes(status)) return 'success'
  if (['进行中', '修改中', '已埋设', '待展开'].includes(status)) return 'brand'
  if (['已放弃', '已失效', '已损毁'].includes(status)) return 'danger'
  if (['草稿', '待引爆', '未埋设', '大纲'].includes(status)) return 'warn'
  return 'neutral'
}

export function nextArray<T>(array: T[], item: T, idKey = 'id'): T[] {
  const index = array.findIndex(entry => (entry as any)[idKey] === (item as any)[idKey])
  if (index < 0) return [...array, item]
  const next = [...array]
  next[index] = item
  return next
}

export function removeById<T>(array: T[], id: string, idKey = 'id'): T[] {
  return array.filter(entry => (entry as any)[idKey] !== id)
}

export const QUEST_TYPES = ['main', 'side']
export const QUEST_STATUS = ['planned', 'active', 'done', 'failed']

export function questTypeLabel(t: (key: string) => string, type: string): string {
  return type === 'main' ? t('主线任务') : t('支线任务')
}

export function questStatusLabel(t: (key: string) => string, status: string): string {
  if (status === 'done') return t('已完成')
  if (status === 'failed') return t('已失败')
  if (status === 'planned') return t('待开启')
  return t('进行中')
}

export function questTone(status: string): string {
  if (status === 'done') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'planned') return 'neutral'
  return 'brand'
}
