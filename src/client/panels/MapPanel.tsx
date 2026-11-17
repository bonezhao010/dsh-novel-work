import React, { useEffect, useMemo, useRef, useState } from 'react'
import { uid } from '../api'
import { EntityForm, type FormField } from '../EntityForm'
import { Badge, Button, EmptyState } from '../ui'
import { Icon } from '../icons'
import { chapterOptions, nextArray, removeById, type ToolProps } from './types'

const LOCATION_TYPES = ['港口', '建筑', '地标', '秘密', '其他']

function toneForType(type: string): string {
  if (type === '港口') return 'port'
  if (type === '建筑') return 'building'
  if (type === '地标') return 'landmark'
  if (type === '秘密') return 'secret'
  return 'other'
}

export function MapPanel({ t, workbench, chapters, onChange }: ToolProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<any | null>(null)

  const locations = workbench.locations
  const links = workbench.mapLinks
  const chapterOpts = chapterOptions(chapters, t)

  const locationFields: FormField[] = [
    { key: 'name', label: t('名称'), required: true, placeholder: t('未命名') },
    { key: 'type', label: t('类型'), type: 'select', options: LOCATION_TYPES.map(value => ({ value, label: t(value) })) },
    { key: 'firstChapter', label: t('首次出现'), type: 'select', options: chapterOpts, placeholder: t('未设置') },
    { key: 'description', label: t('描述'), type: 'textarea', rows: 4 },
  ]

  const linkFields: FormField[] = [
    {
      key: 'from',
      label: t('起点'),
      type: 'select',
      required: true,
      options: locations.map((location: any) => ({ value: location.id, label: location.name })),
    },
    {
      key: 'to',
      label: t('终点'),
      type: 'select',
      required: true,
      options: locations.map((location: any) => ({ value: location.id, label: location.name })),
    },
    { key: 'label', label: t('连接名称'), placeholder: t('未命名') },
  ]

  const saveLocation = (values: Record<string, any>) => {
    const location = { ...(editing ?? {}), ...values, id: editing?.id ?? uid('loc') }
    if (!Number.isFinite(location.x)) location.x = 50
    if (!Number.isFinite(location.y)) location.y = 50
    onChange(current => ({ ...current, locations: nextArray(current.locations, location) }), true)
  }

  const removeLocation = (id: string) => {
    onChange(current => ({
      ...current,
      locations: removeById(current.locations, id),
      mapLinks: current.mapLinks.filter((link: any) => link.from !== id && link.to !== id),
    }), true)
  }

  const saveLink = (values: Record<string, any>) => {
    if (values.from === values.to) throw new Error(t('起点和终点不能相同'))
    const link = { ...(editingLink ?? {}), ...values, id: editingLink?.id ?? uid('route') }
    onChange(current => ({ ...current, mapLinks: nextArray(current.mapLinks, link) }), true)
  }

  const removeLink = (id: string) => {
    onChange(current => ({ ...current, mapLinks: removeById(current.mapLinks, id) }), true)
  }

  const moveLocation = (id: string, x: number, y: number) => {
    onChange(current => ({
      ...current,
      locations: current.locations.map((location: any) => location.id === id ? { ...location, x, y } : location),
    }), true)
  }

  const autoArrange = () => {
    const count = Math.max(1, locations.length)
    onChange(current => ({
      ...current,
      locations: current.locations.map((location: any, index: number) => {
        const angle = (index / count) * Math.PI * 2 - Math.PI / 2
        return { ...location, x: 50 + Math.cos(angle) * 34, y: 50 + Math.sin(angle) * 34 }
      }),
    }), true)
  }

  const locationName = (id: string) => locations.find((location: any) => location.id === id)?.name ?? id

  return (
    <div className="nwb-tool-panel">
      <div className="nwb-tool-head">
        <div>
          <div className="nwb-tool-title">{t('故事地图')}</div>
          <div className="nwb-tool-sub">{t('地点数')} {locations.length} · {t('地点连接')} {links.length}</div>
        </div>
        <div className="nwb-head-actions">
          <Button size="sm" onClick={() => { setEditing(null); setEditorOpen(true) }}><Icon name="plus" size={14} /> {t('地点')}</Button>
          <Button size="sm" onClick={() => { setEditingLink(null); setLinkOpen(true) }} disabled={locations.length < 2}><Icon name="link" size={14} /> {t('连接')}</Button>
        </div>
      </div>

      {locations.length === 0 ? (
        <EmptyState
          icon="map"
          title={t('还没有地图')}
          text={t('添加地点后可以在地图上拖动它们。')}
          action={<Button variant="primary" size="sm" onClick={() => { setEditing(null); setEditorOpen(true) }}>{t('添加地点')}</Button>}
        />
      ) : (
        <>
          <MapCanvas
            t={t}
            locations={locations}
            links={links}
            onMove={moveLocation}
            onSelect={id => { setEditing(locations.find((location: any) => location.id === id)); setEditorOpen(true) }}
          />
          <div className="nwb-map-caption">
            <span><Icon name="pin" size={12} /> {t('拖动节点调整位置，点击节点编辑。')}</span>
            <Button size="sm" variant="ghost" onClick={autoArrange}>{t('自动排列')}</Button>
          </div>

          <div className="nwb-subhead">{t('地点')}</div>
          <div className="nwb-location-list">
            {locations.map((location: any) => (
              <button key={location.id} className="nwb-location-row" onClick={() => { setEditing(location); setEditorOpen(true) }}>
                <span className={`nwb-map-dot type-${toneForType(location.type)}`} />
                <span className="nwb-location-name">{location.name}</span>
                <Badge tone="neutral">{t(location.type ?? '其他')}</Badge>
              </button>
            ))}
          </div>

          <div className="nwb-subhead">{t('地点连接')}</div>
          {links.length === 0 ? (
            <div className="nwb-hint-box">{t('还没有连接')}。{t('添加连接')}。</div>
          ) : (
            <div className="nwb-link-list">
              {links.map((link: any) => (
                <button key={link.id} className="nwb-link-row" onClick={() => { setEditingLink(link); setLinkOpen(true) }}>
                  <span>{locationName(link.from)}</span>
                  <Icon name="chevron" size={11} />
                  <span>{locationName(link.to)}</span>
                  {link.label ? <span className="nwb-muted">{link.label}</span> : null}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <EntityForm
        open={editorOpen}
        title={editing ? t('编辑地点') : t('添加地点')}
        fields={locationFields}
        initial={editing ?? { type: '建筑', x: 50, y: 50 }}
        onClose={() => setEditorOpen(false)}
        onSubmit={saveLocation}
        onDelete={editing ? () => removeLocation(editing.id) : undefined}
        t={t}
      />
      <EntityForm
        open={linkOpen}
        title={editingLink ? t('编辑连接') : t('添加连接')}
        fields={linkFields}
        initial={editingLink ?? { from: locations[0]?.id ?? '', to: locations[1]?.id ?? '', label: '' }}
        onClose={() => setLinkOpen(false)}
        onSubmit={saveLink}
        onDelete={editingLink ? () => removeLink(editingLink.id) : undefined}
        t={t}
      />
    </div>
  )
}

function MapCanvas({
  t, locations, links, onMove, onSelect,
}: {
  t: (key: string) => string
  locations: any[]
  links: any[]
  onMove: (id: string, x: number, y: number) => void
  onSelect: (id: string) => void
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({})
  const dragRef = useRef<{ id: string; pointerId: number; moved: boolean } | null>(null)

  useEffect(() => {
    const next: Record<string, { x: number; y: number }> = {}
    for (const location of locations) next[location.id] = { x: location.x ?? 50, y: location.y ?? 50 }
    positionsRef.current = next
    setPositions(next)
  }, [locations])

  const coordinates = (id: string) => {
    const position = positions[id] ?? { x: 50, y: 50 }
    return { cx: 24 + (position.x / 100) * 312, cy: 24 + (position.y / 100) * 192 }
  }

  const pointerPosition = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 50, y: 50 }
    return {
      x: Math.max(3, Math.min(97, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(3, Math.min(97, ((event.clientY - rect.top) / rect.height) * 100)),
    }
  }

  return (
    <div className="nwb-map-wrap">
      <svg
        ref={svgRef}
        className="nwb-map"
        viewBox="0 0 360 240"
        role="img"
        aria-label={t('故事地图')}
        onPointerMove={(event) => {
          const drag = dragRef.current
          if (!drag) return
          const point = pointerPosition(event)
          drag.moved = true
          positionsRef.current = { ...positionsRef.current, [drag.id]: point }
          setPositions(current => ({ ...current, [drag.id]: point }))
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current
          if (!drag) return
          dragRef.current = null
          const position = positionsRef.current[drag.id]
          if (position && drag.moved) onMove(drag.id, position.x, position.y)
          else if (!drag.moved) onSelect(drag.id)
          if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={() => { dragRef.current = null }}
      >
        <defs>
          <pattern id="nwb-map-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="var(--dsw-alias-border-l1)" />
          </pattern>
          <marker id="nwb-map-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0 0 6 3 0 6Z" fill="var(--dsw-alias-border-l2)" />
          </marker>
        </defs>
        <rect x="0" y="0" width="360" height="240" rx="12" fill="url(#nwb-map-grid)" />
        <path d="M18 190c50-25 74-5 111-30s62-58 95-66 55 4 74-10M42 52c45 12 66 44 98 55s66-1 92 28 38 44 64 48" fill="none" stroke="var(--dsw-alias-border-l1)" strokeWidth="1" strokeDasharray="3 5" opacity=".55" />
        {links.map((link: any) => {
          const from = coordinates(link.from)
          const to = coordinates(link.to)
          if (!positions[link.from] || !positions[link.to]) return null
          return (
            <g key={link.id}>
              <line x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy} stroke="var(--dsw-alias-border-l2)" strokeWidth="1.2" markerEnd="url(#nwb-map-arrow)" />
              {link.label ? (
                <text x={(from.cx + to.cx) / 2} y={(from.cy + to.cy) / 2 - 3} textAnchor="middle" className="nwb-map-link-label">{link.label}</text>
              ) : null}
            </g>
          )
        })}
        {locations.map((location: any) => {
          const point = coordinates(location.id)
          return (
            <g
              key={location.id}
              className={`nwb-map-node type-${toneForType(location.type)}`}
              transform={`translate(${point.cx} ${point.cy})`}
              onPointerDown={(event) => {
                event.preventDefault()
                dragRef.current = { id: location.id, pointerId: event.pointerId, moved: false }
                svgRef.current?.setPointerCapture(event.pointerId)
              }}
            >
              <circle r="15" className="nwb-map-node-halo" />
              <circle r="8" className="nwb-map-node-core" />
              <text y="27" textAnchor="middle" className="nwb-map-node-label">{String(location.name ?? '').slice(0, 8)}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
