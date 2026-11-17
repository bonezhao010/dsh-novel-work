import React, { useEffect, useMemo, useState } from 'react'
import { Badge, Button, EmptyState, Range, StatPill } from '../ui'
import { Icon } from '../icons'
import type { ToolProps } from './types'

export function TensionPanel({ t, workbench, chapters, onChange }: ToolProps) {
  const [selectedPath, setSelectedPath] = useState('')

  useEffect(() => {
    if (chapters.length === 0) { setSelectedPath(''); return }
    if (!chapters.some(chapter => chapter.path === selectedPath)) setSelectedPath(chapters[0].path)
  }, [chapters, selectedPath])

  const points = useMemo(() => chapters.map(chapter => ({
    ...chapter,
    level: Math.max(1, Math.min(10, Number(workbench.chapterMeta[chapter.path]?.tension ?? 5))),
    note: String(workbench.chapterMeta[chapter.path]?.note ?? ''),
  })), [chapters, workbench.chapterMeta])

  if (chapters.length === 0) {
    return (
      <div className="nwb-tool-panel">
        <div className="nwb-tool-head">
          <div>
            <div className="nwb-tool-title">{t('剧情起伏')}</div>
            <div className="nwb-tool-sub">{t('按章节顺序记录张力，找出故事的心跳。')}</div>
          </div>
        </div>
        <EmptyState icon="tension" title={t('还没有章节')} text={t('在新章节里记录张力。')} />
      </div>
    )
  }

  const selected = points.find(point => point.path === selectedPath) ?? points[0]
  const average = points.reduce((sum, point) => sum + point.level, 0) / points.length
  const peak = points.reduce((best, point) => point.level > best.level ? point : best, points[0])
  const width = Math.max(360, points.length * 30 + 46)
  const height = 176
  const inner = { left: 26, right: 16, top: 18, bottom: 36 }
  const plotWidth = width - inner.left - inner.right
  const plotHeight = height - inner.top - inner.bottom
  const xOf = (index: number) => inner.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth)
  const yOf = (level: number) => inner.top + (1 - (level - 1) / 9) * plotHeight
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${xOf(index).toFixed(1)},${yOf(point.level).toFixed(1)}`).join(' ')
  const area = `${line} L${xOf(points.length - 1).toFixed(1)},${(inner.top + plotHeight).toFixed(1)} L${xOf(0).toFixed(1)},${(inner.top + plotHeight).toFixed(1)} Z`

  const updateMeta = (patch: Record<string, any>) => {
    onChange((current) => {
      const meta = { ...current.chapterMeta }
      meta[selected.path] = { ...(meta[selected.path] ?? {}), ...patch }
      return { ...current, chapterMeta: meta }
    }, false)
  }

  return (
    <div className="nwb-tool-panel">
      <div className="nwb-tool-head">
        <div>
          <div className="nwb-tool-title">{t('剧情起伏')}</div>
          <div className="nwb-tool-sub">{t('按章节顺序记录张力，找出故事的心跳。')}</div>
        </div>
      </div>

      <div className="nwb-summary-row">
        <StatPill icon="tension" label={t('平均张力')} value={average.toFixed(1)} />
        <StatPill icon="sparkle" label={t('最高点')} value={`${peak.level} · ${peak.title}`} />
        <StatPill icon="file" label={t('章节数')} value={points.length} />
      </div>

      <div className="nwb-tension-chart-wrap">
        <svg className="nwb-tension-chart" style={{ width: `max(100%, ${width}px)` }} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t('剧情起伏')}>
          <defs>
            <linearGradient id="nwb-tension-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--dsw-alias-brand-primary)" stopOpacity=".22" />
              <stop offset="1" stopColor="var(--dsw-alias-brand-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[1, 3, 5, 7, 9].map(level => (
            <g key={level}>
              <line x1={inner.left} x2={width - inner.right} y1={yOf(level)} y2={yOf(level)} className="nwb-chart-grid" />
              <text x={inner.left - 7} y={yOf(level) + 3} textAnchor="end" className="nwb-chart-axis">{level}</text>
            </g>
          ))}
          <path d={area} fill="url(#nwb-tension-fill)" />
          <path d={line} className="nwb-chart-line" />
          {points.map((point, index) => (
            <g key={point.path} className="nwb-chart-point" onClick={() => setSelectedPath(point.path)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') setSelectedPath(point.path) }}>
              <circle cx={xOf(index)} cy={yOf(point.level)} r={selected.path === point.path ? 5.5 : 3.6} className={selected.path === point.path ? 'is-selected' : ''}>
                <title>{`${point.title} · ${t('张力')} ${point.level}`}</title>
              </circle>
              {points.length <= 16 || index % 2 === 0 ? (
                <text x={xOf(index)} y={height - 12} textAnchor="middle" className="nwb-chart-axis">{index + 1}</text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>

      <div className="nwb-chapter-tension-editor">
        <div className="nwb-chapter-tension-head">
          <div>
            <div className="nwb-chapter-tension-title">{selected.title}</div>
            <div className="nwb-muted">{selected.volume ? `${selected.volume} · ` : ''}{t('第 {n} 章').replace('{n}', String(selected.index + 1))}</div>
          </div>
          <Badge tone={selected.level >= 8 ? 'danger' : selected.level >= 5 ? 'brand' : 'neutral'}>{t('张力')} {selected.level}/10</Badge>
        </div>
        <Range value={selected.level} min={1} max={10} step={1} onChange={value => updateMeta({ tension: value })} label={t('本章张力')} />
        <label className="nwb-field">
          <span className="nwb-field-label">{t('章节笔记')}</span>
          <textarea
            className="nwb-textarea"
            rows={2}
            value={selected.note}
            placeholder={t('这一章让读者紧张的原因…')}
            onChange={event => updateMeta({ note: event.target.value })}
          />
        </label>
      </div>

      <div className="nwb-subhead">{t('章节数')}</div>
      <div className="nwb-tension-list">
        {points.map(point => (
          <button key={point.path} className={`nwb-tension-row${point.path === selected.path ? ' is-active' : ''}`} onClick={() => setSelectedPath(point.path)}>
            <span className="nwb-tension-index">{String(point.index + 1).padStart(2, '0')}</span>
            <span className="nwb-tension-name">{point.title}</span>
            <span className="nwb-tension-bar"><i style={{ width: `${point.level * 10}%` }} /></span>
            <span className="nwb-tension-value">{point.level}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
