import React, { useMemo, useState } from 'react'
import { uid } from '../api'
import { EntityForm, type FormField } from '../EntityForm'
import { Badge, Button, EmptyState, Select } from '../ui'
import { Icon } from '../icons'
import {
  RELATION_TYPES, characterOptions, nextArray, relationTone, removeById, type ToolProps,
} from './types'

export function RelationshipsPanel({ t, workbench, onChange }: ToolProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const characters = workbench.characters
  const options = characterOptions(workbench)
  const charIds = new Set(characters.map((character: any) => character.id))
  const selected = selectedId && charIds.has(selectedId) ? selectedId : ''

  const fields: FormField[] = [
    { key: 'from', label: t('起点'), type: 'character', required: true, options },
    { key: 'to', label: t('终点'), type: 'character', required: true, options },
    { key: 'type', label: t('关系类型'), type: 'select', options: RELATION_TYPES.map(value => ({ value, label: t(value) })) },
    { key: 'strength', label: t('强度'), type: 'range', min: 1, max: 5 },
    { key: 'description', label: t('关系说明'), type: 'textarea', rows: 3 },
  ]

  const save = (values: Record<string, any>) => {
    if (values.from === values.to) throw new Error(t('不能选择同一个人'))
    const relation = { ...(editing ?? {}), ...values, id: editing?.id ?? uid('rel') }
    onChange(current => ({ ...current, relationships: nextArray(current.relationships, relation) }), true)
  }

  const nameOf = (id: string) => characters.find((character: any) => character.id === id)?.name ?? id
  const positions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {}
    const count = Math.max(1, characters.length)
    characters.forEach((character: any, index: number) => {
      const angle = (index / count) * Math.PI * 2 - Math.PI / 2
      map[character.id] = { x: 180 + Math.cos(angle) * 118, y: 118 + Math.sin(angle) * 82 }
    })
    return map
  }, [characters])

  const filteredRelations = workbench.relationships.filter((relation: any) => typeFilter === '' || relation.type === typeFilter)
  const related = new Set<string>()
  if (selected) {
    for (const relation of filteredRelations) {
      if (relation.from === selected) related.add(relation.to)
      if (relation.to === selected) related.add(relation.from)
    }
  }
  const toggleSelected = (id: string) => setSelectedId(current => current === id ? '' : id)

  if (characters.length < 2) {
    return (
      <div className="nwb-tool-panel">
        <div className="nwb-tool-head">
          <div>
            <div className="nwb-tool-title">{t('人物关系图')}</div>
            <div className="nwb-tool-sub">{t('关系数')} {workbench.relationships.length}</div>
          </div>
        </div>
        <EmptyState icon="relation" title={t('还没有关系')} text={t('先添加两个人物，再记录他们之间的张力。')} />
      </div>
    )
  }

  return (
    <div className="nwb-tool-panel">
      <div className="nwb-tool-head">
        <div>
          <div className="nwb-tool-title">{t('人物关系图')}</div>
          <div className="nwb-tool-sub">{t('人物数')} {characters.length} · {t('关系数')} {filteredRelations.length}/{workbench.relationships.length}</div>
        </div>
        <Button variant="primary" size="sm" onClick={() => { setEditing(null); setOpen(true) }}><Icon name="plus" size={14} /> {t('关系')}</Button>
      </div>

      <div className="nwb-filter-bar">
        <Select
          value={typeFilter}
          onChange={setTypeFilter}
          options={[{ value: '', label: t('全部关系') }, ...RELATION_TYPES.map(value => ({ value, label: t(value) }))]}
        />
        {selected || typeFilter ? (
          <Button size="sm" variant="ghost" onClick={() => { setSelectedId(''); setTypeFilter('') }}>{t('清除筛选')}</Button>
        ) : null}
      </div>
      <div className="nwb-filter-chips">
        {characters.map((character: any) => (
          <button
            key={character.id}
            type="button"
            className={`nwb-filter-chip${selected === character.id ? ' is-active' : ''}`}
            onClick={() => toggleSelected(character.id)}
          >
            {character.name}
          </button>
        ))}
      </div>
      <div className="nwb-muted nwb-relation-hint">
        {selected ? `${t('已选角色')}：${nameOf(selected)} · ${t('点击人物节点高亮其关系')}` : t('点击人物节点高亮其关系')}
      </div>

      <div className="nwb-relation-graph-wrap">
        <svg className="nwb-relation-graph" viewBox="0 0 360 250" role="img" aria-label={t('人物关系图')}>
          <defs>
            <marker id="nwb-rel-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0 0 6 3 0 6Z" fill="var(--dsw-alias-border-l2)" />
            </marker>
          </defs>
          {filteredRelations.map((relation: any) => {
            const from = positions[relation.from]
            const to = positions[relation.to]
            if (!from || !to) return null
            const midX = (from.x + to.x) / 2
            const midY = (from.y + to.y) / 2
            const incident = selected === '' || relation.from === selected || relation.to === selected
            const dimmed = selected !== '' && !incident
            return (
              <g key={relation.id} className={`nwb-rel-edge${dimmed ? ' is-dimmed' : ''}${selected && incident ? ' is-highlighted' : ''}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="var(--dsw-alias-border-l2)"
                  strokeWidth={Math.min(3, 0.8 + Number(relation.strength ?? 2) * 0.35)}
                  markerEnd="url(#nwb-rel-arrow)"
                />
                <text x={midX} y={midY - 4} textAnchor="middle" className="nwb-rel-edge-label">{t(relation.type ?? '其他')}</text>
              </g>
            )
          })}
          {characters.map((character: any) => {
            const point = positions[character.id]
            if (!point) return null
            const isSelected = selected === character.id
            const isRelated = selected !== '' && related.has(character.id)
            const isDimmed = selected !== '' && !isSelected && !isRelated
            return (
              <g
                key={character.id}
                transform={`translate(${point.x} ${point.y})`}
                className={`nwb-rel-node${isSelected ? ' is-selected' : ''}${isRelated ? ' is-related' : ''}${isDimmed ? ' is-dimmed' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={character.name}
                onClick={() => toggleSelected(character.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggleSelected(character.id)
                  }
                }}
              >
                <circle r="22" className="nwb-rel-node-ring" />
                <circle r="17" />
                <text y="4" textAnchor="middle" className="nwb-rel-node-initial">{(character.name ?? '?').slice(0, 1)}</text>
                <text y="31" textAnchor="middle" className="nwb-rel-node-name">{String(character.name ?? '').slice(0, 8)}</text>
                <title>{character.name}</title>
              </g>
            )
          })}
        </svg>
      </div>

      {workbench.relationships.length === 0 ? (
        <div className="nwb-hint-box">{t('还没有关系')}。{t('添加关系')}。</div>
      ) : filteredRelations.length === 0 ? (
        <div className="nwb-hint-box">{selected ? t('该角色没有此类关系') : t('没有符合筛选的关系')}。{selected ? t('试试别的类型或清除筛选。') : ''}</div>
      ) : (
        <div className="nwb-relation-list">
          {filteredRelations.map((relation: any) => {
            const incident = selected === '' || relation.from === selected || relation.to === selected
            return (
              <button
                key={relation.id}
                className={`nwb-relation-row${selected && !incident ? ' is-dimmed' : ''}${selected && incident ? ' is-highlighted' : ''}`}
                onClick={() => { setEditing(relation); setOpen(true) }}
              >
                <span className="nwb-relation-pair">
                  <span>{nameOf(relation.from)}</span>
                  <Icon name="chevron" size={11} />
                  <span>{nameOf(relation.to)}</span>
                </span>
                <span className="nwb-inline-between">
                  <Badge tone={relationTone(relation.type) as any}>{t(relation.type ?? '其他')}</Badge>
                  <span className="nwb-strength" title={`${t('强度')} ${relation.strength ?? 0}/5`}>
                    {Array.from({ length: 5 }, (_, index) => <i key={index} className={index < Number(relation.strength ?? 0) ? 'is-on' : ''} />)}
                  </span>
                </span>
                {relation.description ? <span className="nwb-card-text nwb-clamp-2">{relation.description}</span> : null}
              </button>
            )
          })}
        </div>
      )}

      <EntityForm
        open={open}
        title={editing ? t('编辑关系') : t('添加关系')}
        fields={fields}
        initial={editing ?? { from: characters[0]?.id ?? '', to: characters[1]?.id ?? '', type: '盟友', strength: 3 }}
        onClose={() => setOpen(false)}
        onSubmit={save}
        onDelete={editing ? () => onChange(current => ({ ...current, relationships: removeById(current.relationships, editing.id) }), true) : undefined}
        t={t}
      />
    </div>
  )
}
