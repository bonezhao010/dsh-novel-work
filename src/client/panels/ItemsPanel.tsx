import React, { useState } from 'react'
import { uid } from '../api'
import { EntityForm, type FormField } from '../EntityForm'
import { Badge, Button, EmptyState, Select } from '../ui'
import { Icon } from '../icons'
import {
  ITEM_STATUS, ITEM_TYPES, IMPORTANCE, chapterLabel, chapterOptions, characterOptions,
  nextArray, removeById, statusTone, type ToolProps,
} from './types'

export function ItemsPanel({ t, workbench, chapters, onChange }: ToolProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [ownerFilter, setOwnerFilter] = useState('')
  const chapterOpts = chapterOptions(chapters, t)

  const fields: FormField[] = [
    { key: 'name', label: t('名称'), required: true, placeholder: t('未命名') },
    { key: 'type', label: t('类型'), type: 'select', options: ITEM_TYPES.map(value => ({ value, label: t(value) })) },
    { key: 'ownerId', label: t('持有者'), type: 'character', options: characterOptions(workbench), placeholder: t('未设置') },
    { key: 'status', label: t('状态'), type: 'select', options: ITEM_STATUS.map(value => ({ value, label: t(value) })) },
    { key: 'significance', label: t('意义'), type: 'select', options: IMPORTANCE.map(value => ({ value, label: t(value) })) },
    { key: 'firstChapter', label: t('首次出现'), type: 'select', options: chapterOpts, placeholder: t('未设置') },
    { key: 'description', label: t('描述'), type: 'textarea', rows: 4 },
  ]

  const save = (values: Record<string, any>) => {
    const item = { ...(editing ?? {}), ...values, id: editing?.id ?? uid('item') }
    onChange(current => ({ ...current, items: nextArray(current.items, item) }), true)
  }

  const ownerName = (id: string) => workbench.characters.find((character: any) => character.id === id)?.name ?? t('未设置')
  const filtered = ownerFilter
    ? workbench.items.filter((item: any) => item.ownerId === ownerFilter)
    : workbench.items

  return (
    <div className="nwb-tool-panel">
      <div className="nwb-tool-head">
        <div>
          <div className="nwb-tool-title">{t('物品与道具')}</div>
          <div className="nwb-tool-sub">{ownerFilter ? `${filtered.length} / ${workbench.items.length}` : t('共 {n} 项').replace('{n}', String(workbench.items.length))}</div>
        </div>
        <Button variant="primary" size="sm" onClick={() => { setEditing(null); setOpen(true) }}><Icon name="plus" size={14} /> {t('道具')}</Button>
      </div>

      <div className="nwb-filter-bar">
        <Select
          value={ownerFilter}
          onChange={setOwnerFilter}
          options={[{ value: '', label: t('全部角色') }, ...characterOptions(workbench)]}
        />
        {ownerFilter ? <Button size="sm" variant="ghost" onClick={() => setOwnerFilter('')}>{t('清除筛选')}</Button> : null}
      </div>

      {workbench.items.length === 0 ? (
        <EmptyState
          icon="item"
          title={t('还没有道具')}
          text={t('记下那些会被读者记住、也会推动情节的物件。')}
          action={<Button variant="primary" size="sm" onClick={() => { setEditing(null); setOpen(true) }}>{t('添加道具')}</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="item"
          title={t('没有匹配的道具')}
          text={t('该角色目前没有持有道具。')}
          action={<Button size="sm" onClick={() => setOwnerFilter('')}>{t('清除筛选')}</Button>}
        />
      ) : (
        <div className="nwb-card-grid">
          {filtered.map((item: any) => (
            <button key={item.id} className="nwb-card nwb-item-card" onClick={() => { setEditing(item); setOpen(true) }}>
              <div className="nwb-item-top">
                <span className="nwb-item-glyph"><Icon name="item" size={16} /></span>
                <span className="nwb-item-name">{item.name || t('未命名')}</span>
                <Badge tone={item.significance === '高' ? 'danger' : item.significance === '低' ? 'neutral' : 'brand'}>{t(item.significance ?? '中')}</Badge>
              </div>
              <div className="nwb-item-meta">
                <span className="nwb-tag">{t(item.type ?? '其他')}</span>
                <Badge tone={statusTone(item.status ?? '未知') as any}>{t(item.status ?? '未知')}</Badge>
              </div>
              {item.description ? <div className="nwb-card-text nwb-clamp-3">{item.description}</div> : null}
              <div className="nwb-item-foot">
                <span><Icon name="users" size={11} /> {ownerName(item.ownerId)}</span>
                {item.firstChapter ? <span className="nwb-muted">{chapterLabel(chapters, item.firstChapter, t)}</span> : null}
              </div>
            </button>
          ))}
        </div>
      )}

      <EntityForm
        open={open}
        title={editing ? t('编辑道具') : t('添加道具')}
        fields={fields}
        initial={editing ?? { type: '信物', status: '持有中', significance: '中' }}
        onClose={() => setOpen(false)}
        onSubmit={save}
        onDelete={editing ? () => onChange(current => ({ ...current, items: removeById(current.items, editing.id) }), true) : undefined}
        t={t}
      />
    </div>
  )
}
