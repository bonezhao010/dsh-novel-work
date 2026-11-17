import React, { useState } from 'react'
import { uid } from '../api'
import { EntityForm, type FormField } from '../EntityForm'
import { Badge, Button, EmptyState, StatPill } from '../ui'
import { Icon } from '../icons'
import { CHARACTER_ROLES, type ToolProps, nextArray, removeById } from './types'

const blank = { name: '', role: '配角', age: '', tags: [], appearance: '', personality: '', goal: '', ultimateGoal: '', secret: '', status: '辅线', notes: '', quests: [] }

export function CharactersPanel({ t, workbench, onChange }: ToolProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)

  const fields: FormField[] = [
    { key: 'name', label: t('名称'), required: true, placeholder: t('未命名') },
    { key: 'role', label: t('身份'), type: 'select', options: CHARACTER_ROLES.map(value => ({ value, label: t(value) })) },
    { key: 'age', label: t('年龄'), placeholder: '29' },
    { key: 'tags', label: t('标签'), type: 'tags', hint: t('用逗号分隔'), placeholder: '调查者，旧案之子' },
    { key: 'status', label: t('状态'), type: 'select', options: ['主线', '支线', '辅线'].map(value => ({ value, label: t(value) })) },
    { key: 'goal', label: t('目标'), type: 'textarea', rows: 2 },
    { key: 'ultimateGoal', label: t('终极目标'), type: 'textarea', rows: 2 },
    { key: 'secret', label: t('秘密'), type: 'textarea', rows: 2 },
    { key: 'personality', label: t('性格'), type: 'textarea', rows: 2 },
    { key: 'appearance', label: t('外貌'), type: 'textarea', rows: 2 },
    { key: 'notes', label: t('人物小传'), type: 'textarea', rows: 4 },
  ]

  const save = (values: Record<string, any>) => {
    const id = editing?.id ?? uid('char')
    const character = { ...editing, ...values, id, quests: Array.isArray(editing?.quests) ? editing.quests : [] }
    onChange((current) => {
      const characters = nextArray(current.characters, character)
      const arcs = { ...current.arcs }
      if (!arcs[id]) {
        arcs[id] = { stages: Array.from({ length: 8 }, () => ({ status: 'todo', note: '' })) }
      }
      return { ...current, characters, arcs }
    }, true)
  }

  const remove = (id: string) => {
    onChange((current) => {
      const arcs = { ...current.arcs }
      delete arcs[id]
      return {
        ...current,
        characters: removeById(current.characters, id).map((character: any) => ({
          ...character,
          quests: (character.quests ?? []).map((quest: any) => ({
            ...quest,
            involvedCharacterIds: (quest.involvedCharacterIds ?? []).filter((characterId: string) => characterId !== id),
          })),
        })),
        arcs,
        relationships: current.relationships.filter((relation: any) => relation.from !== id && relation.to !== id),
        items: current.items.map((item: any) => item.ownerId === id ? { ...item, ownerId: '' } : item),
      }
    }, true)
  }

  const mainCast = workbench.characters.filter((character: any) => character.role === '主角' || character.role === '反派').length
  const arcsStarted = workbench.characters.filter((character: any) => (workbench.arcs[character.id]?.stages ?? []).some((stage: any) => stage.status !== 'todo')).length

  return (
    <div className="nwb-tool-panel">
      <div className="nwb-tool-head">
        <div>
          <div className="nwb-tool-title">{t('出场人物看板')}</div>
          <div className="nwb-tool-sub">{t('主要人物')} · {t('共 {n} 项').replace('{n}', String(workbench.characters.length))}</div>
        </div>
        <Button variant="primary" size="sm" onClick={() => { setEditing(null); setOpen(true) }}>
          <Icon name="plus" size={14} /> {t('添加人物')}
        </Button>
      </div>

      <div className="nwb-summary-row">
        <StatPill icon="users" label={t('人物数')} value={workbench.characters.length} />
        <StatPill icon="sparkle" label={t('主要人物')} value={mainCast} />
        <StatPill icon="arc" label={t('弧光')} value={`${arcsStarted}/${workbench.characters.length}`} />
      </div>

      {workbench.characters.length === 0 ? (
        <EmptyState
          icon="users"
          title={t('还没有人物')}
          text={t('先把故事里最重要的人放进来，弧光和关系图会自动使用他们。')}
          action={<Button variant="primary" size="sm" onClick={() => { setEditing(null); setOpen(true) }}>{t('添加人物')}</Button>}
        />
      ) : (
        <div className="nwb-card-grid">
          {workbench.characters.map((character: any) => {
            const stages = workbench.arcs[character.id]?.stages ?? []
            const done = stages.filter((stage: any) => stage.status === 'done').length
            const quests = character.quests ?? []
            const questsDone = quests.filter((quest: any) => quest.status === 'done').length
            const mainQuests = quests.filter((quest: any) => quest.type === 'main').length
            return (
              <button
                key={character.id}
                className="nwb-card nwb-character-card"
                onClick={() => { setEditing(character); setOpen(true) }}
              >
                <div className="nwb-character-top">
                  <span className={`nwb-avatar nwb-avatar-${character.role ?? 'other'}`}>
                    {(character.name ?? '?').slice(0, 1)}
                  </span>
                  <span className="nwb-character-name">{character.name || t('未命名')}</span>
                  <Badge tone={character.role === '主角' ? 'brand' : character.role === '反派' ? 'danger' : 'neutral'}>
                    {t(character.role || '其他')}
                  </Badge>
                </div>
                <div className="nwb-character-tags">
                  {(character.tags ?? []).slice(0, 3).map((tag: string) => <span key={tag} className="nwb-tag">{tag}</span>)}
                </div>
                {character.ultimateGoal ? (
                  <div className="nwb-char-goal">
                    <span className="nwb-goal-label">{t('终极目标')}</span>
                    <span className="nwb-clamp-2">{character.ultimateGoal}</span>
                  </div>
                ) : character.goal ? <div className="nwb-card-text nwb-clamp-2">{character.goal}</div> : null}
                <div className="nwb-character-foot">
                  <span>{t('状态')}: {t(character.status || '辅线')}</span>
                  <span title={`${t('主线任务')} ${mainQuests} · ${t('短期目标')} ${questsDone}/${quests.length}`}>{t('任务')} {questsDone}/{quests.length}</span>
                  <span className="nwb-arc-mini" title={`${done}/8`}>
                    {Array.from({ length: 8 }, (_, index) => (
                      <i key={index} className={index < done ? 'is-done' : index === done ? 'is-current' : ''} />
                    ))}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <EntityForm
        open={open}
        title={editing ? t('编辑人物') : t('添加人物')}
        subtitle={editing?.name}
        fields={fields}
        initial={editing ?? blank}
        onClose={() => setOpen(false)}
        onSubmit={save}
        onDelete={editing ? () => remove(editing.id) : undefined}
        t={t}
      />
    </div>
  )
}
