import React, { useState } from 'react'
import { uid } from '../api'
import { EntityForm, type FormField } from '../EntityForm'
import { Badge, Button, EmptyState, StatPill } from '../ui'
import { Icon } from '../icons'
import {
  PLOT_STATUS, chapterLabel, chapterOptions, nextArray, removeById, statusTone, type ToolProps,
} from './types'

export function PlotlinesPanel({ t, workbench, chapters, onChange }: ToolProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const chapterOpts = chapterOptions(chapters, t)

  const fields: FormField[] = [
    { key: 'title', label: t('标题'), required: true, placeholder: t('未命名') },
    { key: 'kind', label: t('类型'), type: 'select', options: [{ value: 'main', label: t('明线') }, { value: 'sub', label: t('暗线') }] },
    { key: 'status', label: t('状态'), type: 'select', options: PLOT_STATUS.map(value => ({ value, label: t(value) })) },
    { key: 'progress', label: t('进展'), type: 'range', min: 0, max: 100, step: 5 },
    { key: 'startChapter', label: t('起始章节'), type: 'select', options: chapterOpts, placeholder: t('未设置') },
    { key: 'endChapter', label: t('收束章节'), type: 'select', options: chapterOpts, placeholder: t('未设置') },
    { key: 'description', label: t('描述'), type: 'textarea', rows: 4 },
  ]

  const save = (values: Record<string, any>) => {
    const line = { ...(editing ?? {}), ...values, id: editing?.id ?? uid('plot') }
    onChange(current => ({ ...current, plotlines: nextArray(current.plotlines, line) }), true)
  }

  const main = workbench.plotlines.filter((line: any) => line.kind === 'main')
  const sub = workbench.plotlines.filter((line: any) => line.kind !== 'main')

  const renderLine = (line: any) => (
    <button key={line.id} className={`nwb-plot-card ${line.kind === 'main' ? 'is-main' : 'is-sub'}`} onClick={() => { setEditing(line); setOpen(true) }}>
      <div className="nwb-plot-top">
        <span className="nwb-plot-title">{line.title || t('未命名')}</span>
        <Badge tone={statusTone(line.status ?? '进行中') as any}>{t(line.status ?? '进行中')}</Badge>
      </div>
      <div className="nwb-plot-progress">
        <div className="nwb-progress"><span style={{ width: `${Number(line.progress ?? 0)}%` }} /></div>
        <span className="nwb-muted">{Number(line.progress ?? 0)}%</span>
      </div>
      {line.description ? <div className="nwb-card-text nwb-clamp-3">{line.description}</div> : null}
      <div className="nwb-plot-foot">
        <span className="nwb-tag">{line.kind === 'main' ? t('明线') : t('暗线')}</span>
        {line.startChapter ? <span className="nwb-muted">{chapterLabel(chapters, line.startChapter, t)} → {line.endChapter ? chapterLabel(chapters, line.endChapter, t) : '…'}</span> : null}
      </div>
    </button>
  )

  return (
    <div className="nwb-tool-panel">
      <div className="nwb-tool-head">
        <div>
          <div className="nwb-tool-title">{t('明线与暗线')}</div>
          <div className="nwb-tool-sub">{t('共 {n} 项').replace('{n}', String(workbench.plotlines.length))}</div>
        </div>
        <Button variant="primary" size="sm" onClick={() => { setEditing(null); setOpen(true) }}><Icon name="plus" size={14} /> {t('添加线索')}</Button>
      </div>

      <div className="nwb-summary-row">
        <StatPill icon="plot" label={t('明线')} value={main.length} />
        <StatPill icon="foreshadow" label={t('暗线')} value={sub.length} />
        <StatPill icon="check" label={t('已收束')} value={workbench.plotlines.filter((line: any) => line.status === '已收束').length} />
      </div>

      {workbench.plotlines.length === 0 ? (
        <EmptyState
          icon="plot"
          title={t('还没有明暗线')}
          text={t('把主线与暗线分开看，才知道哪一条正在牵引读者。')}
          action={<Button variant="primary" size="sm" onClick={() => { setEditing(null); setOpen(true) }}>{t('添加线索')}</Button>}
        />
      ) : (
        <>
          <div className="nwb-subhead"><span className="nwb-line-mark is-main" />{t('明线')}</div>
          {main.length === 0 ? <div className="nwb-hint-box">{t('暂无内容')}</div> : main.map(renderLine)}
          <div className="nwb-subhead"><span className="nwb-line-mark is-sub" />{t('暗线')}</div>
          {sub.length === 0 ? <div className="nwb-hint-box">{t('暂无内容')}</div> : sub.map(renderLine)}
        </>
      )}

      <EntityForm
        open={open}
        title={editing ? t('编辑线索') : t('添加线索')}
        fields={fields}
        initial={editing ?? { kind: 'main', status: '进行中', progress: 20 }}
        onClose={() => setOpen(false)}
        onSubmit={save}
        onDelete={editing ? () => onChange(current => ({ ...current, plotlines: removeById(current.plotlines, editing.id) }), true) : undefined}
        t={t}
      />
    </div>
  )
}
