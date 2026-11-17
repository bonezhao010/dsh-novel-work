import React, { useEffect, useState } from 'react'
import { uid } from '../api'
import { EntityForm, type FormField } from '../EntityForm'
import { Badge, Button, EmptyState, StatPill } from '../ui'
import { Icon } from '../icons'
import {
  QUEST_STATUS, QUEST_TYPES, characterOptions, nextArray, questStatusLabel, questTone, questTypeLabel,
  removeById, type ToolProps,
} from './types'

export function QuestsPanel({ t, workbench, onChange }: ToolProps) {
  const characters = workbench.characters
  const [selectedId, setSelectedId] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)

  useEffect(() => {
    if (characters.length === 0) { setSelectedId(''); return }
    if (!characters.some((character: any) => character.id === selectedId)) setSelectedId(characters[0].id)
  }, [characters, selectedId])

  const character = characters.find((entry: any) => entry.id === selectedId) ?? characters[0]
  const quests = character?.quests ?? []
  const mainQuests = quests.filter((quest: any) => quest.type === 'main')
  const sideQuests = quests.filter((quest: any) => quest.type !== 'main')
  const done = quests.filter((quest: any) => quest.status === 'done').length
  const nameOf = (id: string) => characters.find((entry: any) => entry.id === id)?.name ?? id

  const fields: FormField[] = [
    { key: 'title', label: t('任务标题'), required: true, placeholder: t('未命名') },
    { key: 'type', label: t('任务类型'), type: 'select', options: QUEST_TYPES.map(value => ({ value, label: questTypeLabel(t, value) })) },
    { key: 'status', label: t('状态'), type: 'select', options: QUEST_STATUS.map(value => ({ value, label: questStatusLabel(t, value) })) },
    {
      key: 'involvedCharacterIds',
      label: t('涉及角色'),
      type: 'multiselect',
      options: characterOptions(workbench).filter(option => option.value !== character?.id),
    },
    { key: 'note', label: t('备注'), type: 'textarea', rows: 3 },
  ]

  const save = (values: Record<string, any>) => {
    if (!character) return
    const quest = {
      ...(editing ?? {}),
      ...values,
      id: editing?.id ?? uid('quest'),
      involvedCharacterIds: Array.isArray(values.involvedCharacterIds) ? values.involvedCharacterIds : [],
    }
    onChange((current) => ({
      ...current,
      characters: current.characters.map((entry: any) => entry.id === character.id
        ? { ...entry, quests: nextArray(entry.quests ?? [], quest) }
        : entry),
    }), true)
  }

  const remove = (id: string) => {
    if (!character) return
    onChange((current) => ({
      ...current,
      characters: current.characters.map((entry: any) => entry.id === character.id
        ? { ...entry, quests: removeById(entry.quests ?? [], id) }
        : entry),
    }), true)
  }

  if (characters.length === 0) {
    return (
      <div className="nwb-tool-panel">
        <div className="nwb-tool-head">
          <div>
            <div className="nwb-tool-title">{t('角色任务')}</div>
            <div className="nwb-tool-sub">{t('主线任务')} · {t('支线任务')}</div>
          </div>
        </div>
        <EmptyState icon="quest" title={t('还没有人物')} text={t('先在人物看板添加角色，再给他们安排终极目标和短期任务。')} />
      </div>
    )
  }

  const renderQuest = (quest: any) => (
    <button
      key={quest.id}
      className={`nwb-quest-card ${quest.type === 'side' ? 'is-side' : 'is-main'}${quest.status === 'done' ? ' is-done' : ''}`}
      onClick={() => { setEditing(quest); setOpen(true) }}
    >
      <span className="nwb-quest-top">
        <span className="nwb-quest-title">{quest.title || t('未命名')}</span>
        <Badge tone={questTone(quest.status) as any}>{questStatusLabel(t, quest.status)}</Badge>
      </span>
      <span className="nwb-quest-meta">
        <span className={`nwb-quest-kind ${quest.type === 'side' ? 'is-side' : 'is-main'}`}>{questTypeLabel(t, quest.type)}</span>
        {(quest.involvedCharacterIds ?? []).map((id: string) => (
          <span key={id} className="nwb-tag">{nameOf(id)}</span>
        ))}
      </span>
      {quest.note ? <span className="nwb-card-text nwb-clamp-2">{quest.note}</span> : null}
    </button>
  )

  return (
    <div className="nwb-tool-panel">
      <div className="nwb-tool-head">
        <div>
          <div className="nwb-tool-title">{t('角色任务')}</div>
          <div className="nwb-tool-sub">{t('选择角色')} · {t('终极目标')}</div>
        </div>
        <select className="nwb-select nwb-select-compact" value={character?.id ?? ''} onChange={event => setSelectedId(event.target.value)} aria-label={t('选择角色')}>
          {characters.map((entry: any) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select>
      </div>

      <div className="nwb-quest-summary">
        <div className="nwb-arc-name">
          <span className="nwb-avatar nwb-avatar-small">{(character?.name ?? '?').slice(0, 1)}</span>
          <div>
            <div className="nwb-arc-character">{character?.name}</div>
            <div className="nwb-muted">{t(character?.role ?? '其他')}</div>
          </div>
        </div>
        <div className="nwb-quest-goal">
          <span className="nwb-goal-label">{t('终极目标')}</span>
          <span>{character?.ultimateGoal || t('未设置')}</span>
        </div>
        <div className="nwb-summary-row">
          <StatPill icon="quest" label={t('短期目标')} value={quests.length} />
          <StatPill icon="check" label={t('已完成')} value={done} />
          <StatPill icon="sparkle" label={t('主线任务')} value={mainQuests.length} />
        </div>
      </div>

      <div className="nwb-subhead">
        <span>{t('主线任务')}</span>
        <span className="nwb-count">{mainQuests.length}</span>
        <span className="nwb-subhead-spacer" />
        <Button size="sm" variant="primary" onClick={() => { setEditing(null); setOpen(true) }}><Icon name="plus" size={13} /> {t('新建任务')}</Button>
      </div>
      {mainQuests.length === 0 ? <div className="nwb-hint-box">{t('暂无内容')}</div> : mainQuests.map(renderQuest)}

      <div className="nwb-subhead"><span>{t('支线任务')}</span><span className="nwb-count">{sideQuests.length}</span></div>
      {sideQuests.length === 0 ? <div className="nwb-hint-box">{t('暂无内容')}</div> : sideQuests.map(renderQuest)}

      <EntityForm
        open={open}
        title={editing ? t('编辑任务') : t('新建任务')}
        subtitle={character?.name}
        fields={fields}
        initial={editing ?? { type: 'main', status: 'active', involvedCharacterIds: [] }}
        onClose={() => setOpen(false)}
        onSubmit={save}
        onDelete={editing ? () => remove(editing.id) : undefined}
        t={t}
      />
    </div>
  )
}
