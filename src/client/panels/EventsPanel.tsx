import React, { useMemo, useState } from 'react'
import { uid } from '../api'
import { EntityForm, type FormField } from '../EntityForm'
import { Badge, Button, EmptyState, Segmented } from '../ui'
import { Icon } from '../icons'
import {
  chapterOptions, characterOptions, EVENT_TYPES, IMPORTANCE, chapterLabel, nextArray, removeById, type ToolProps,
} from './types'

export function EventsPanel({ t, workbench, chapters, onChange }: ToolProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [filter, setFilter] = useState('')
  const [filterMode, setFilterMode] = useState<'any' | 'all'>('any')
  const chapterOpts = chapterOptions(chapters, t)
  const characterOpts = characterOptions(workbench)

  const fields: FormField[] = [
    { key: 'title', label: t('标题'), required: true, placeholder: t('未命名') },
    { key: 'storyTime', label: t('故事时间'), placeholder: '现在 · 第一天清晨' },
    { key: 'type', label: t('类型'), type: 'select', options: EVENT_TYPES.map(value => ({ value, label: t(value) })) },
    { key: 'importance', label: t('重要度'), type: 'select', options: IMPORTANCE.map(value => ({ value, label: t(value) })) },
    { key: 'chapterPath', label: t('关联章节'), type: 'select', options: chapterOpts, placeholder: t('未设置') },
    { key: 'characterIds', label: t('涉及角色'), type: 'multiselect', options: characterOpts },
    { key: 'description', label: t('描述'), type: 'textarea', rows: 4 },
  ]

  const nameOf = (id: string) => workbench.characters.find((character: any) => character.id === id)?.name ?? id
  const tokens = filter.trim().split(/\s+/).filter(Boolean).map(token => token.toLowerCase())

  const filtered = useMemo(() => {
    if (tokens.length === 0) return workbench.events
    return workbench.events.filter((event: any) => {
      const names = (event.characterIds ?? []).map(nameOf)
      const haystack = `${names.join(' ')} ${event.title ?? ''} ${event.description ?? ''}`.toLowerCase()
      const hits = tokens.map(token => haystack.includes(token))
      return filterMode === 'all' ? hits.every(Boolean) : hits.some(Boolean)
    })
  }, [workbench.events, workbench.characters, filter, filterMode])

  const addToken = (name: string) => {
    if (filter.split(/\s+/).includes(name)) return
    setFilter(filter.trim() === '' ? name : `${filter.trim()} ${name}`)
  }

  const save = (values: Record<string, any>) => {
    const event = {
      ...(editing ?? {}),
      ...values,
      id: editing?.id ?? uid('event'),
      characterIds: Array.isArray(values.characterIds) ? values.characterIds : [],
    }
    onChange(current => ({ ...current, events: nextArray(current.events, event) }), true)
  }

  return (
    <div className="nwb-tool-panel">
      <div className="nwb-tool-head">
        <div>
          <div className="nwb-tool-title">{t('事件时间线')}</div>
          <div className="nwb-tool-sub">
            {tokens.length > 0 ? `${filtered.length} / ${workbench.events.length}` : t('共 {n} 项').replace('{n}', String(workbench.events.length))}
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => { setEditing(null); setOpen(true) }}><Icon name="plus" size={14} /> {t('事件')}</Button>
      </div>

      <div className="nwb-filter-bar">
        <div className="nwb-filter-input">
          <Icon name="search" size={13} />
          <input
            value={filter}
            onChange={event => setFilter(event.target.value)}
            placeholder={t('输入角色名称，空格分隔')}
            aria-label={t('输入角色名称，空格分隔')}
          />
          {filter ? <button type="button" onClick={() => setFilter('')} aria-label={t('清除筛选')}><Icon name="close" size={12} /></button> : null}
        </div>
        {tokens.length > 0 ? (
          <Segmented<'any' | 'all'>
            value={filterMode}
            options={[{ value: 'any', label: t('任一') }, { value: 'all', label: t('全部') }]}
            onChange={setFilterMode}
            ariaLabel={t('筛选方式')}
          />
        ) : null}
      </div>

      {workbench.characters.length > 0 ? (
        <div className="nwb-filter-chips">
          {workbench.characters.map((character: any) => (
            <button key={character.id} type="button" className="nwb-filter-chip" onClick={() => addToken(character.name)}>
              {character.name}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon="event"
          title={workbench.events.length === 0 ? t('还没有事件') : t('没有匹配的事件')}
          text={workbench.events.length === 0 ? t('把故事时间线上的关键节点记下来。') : t('试试别的角色名，或清除筛选。')}
          action={tokens.length > 0
            ? <Button size="sm" onClick={() => setFilter('')}>{t('清除筛选')}</Button>
            : <Button variant="primary" size="sm" onClick={() => { setEditing(null); setOpen(true) }}>{t('添加事件')}</Button>}
        />
      ) : (
        <div className="nwb-timeline">
          {filtered.map((event: any, index: number) => (
            <button key={event.id} className="nwb-timeline-row" onClick={() => { setEditing(event); setOpen(true) }}>
              <span className="nwb-timeline-axis">
                <span className={`nwb-timeline-dot importance-${event.importance ?? '中'}`} />
                {index < filtered.length - 1 ? <span className="nwb-timeline-line" /> : null}
              </span>
              <span className="nwb-timeline-card">
                <span className="nwb-timeline-top">
                  <span className="nwb-timeline-time">{event.storyTime || t('未设置')}</span>
                  <Badge tone={event.importance === '高' ? 'danger' : event.importance === '低' ? 'neutral' : 'brand'}>{t(event.importance ?? '中')}</Badge>
                </span>
                <span className="nwb-timeline-title">{event.title || t('未命名')}</span>
                {event.description ? <span className="nwb-card-text nwb-clamp-3">{event.description}</span> : null}
                <span className="nwb-timeline-foot">
                  <span className="nwb-tag">{t(event.type ?? '其他')}</span>
                  {(event.characterIds ?? []).map((id: string) => <span key={id} className="nwb-tag">{nameOf(id)}</span>)}
                  {event.chapterPath ? <span className="nwb-muted">{chapterLabel(chapters, event.chapterPath, t)}</span> : null}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <EntityForm
        open={open}
        title={editing ? t('编辑事件') : t('添加事件')}
        fields={fields}
        initial={editing ?? { type: '调查', importance: '中', characterIds: [] }}
        onClose={() => setOpen(false)}
        onSubmit={save}
        onDelete={editing ? () => onChange(current => ({ ...current, events: removeById(current.events, editing.id) }), true) : undefined}
        t={t}
      />
    </div>
  )
}
