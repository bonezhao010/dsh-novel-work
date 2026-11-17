import React, { useState } from 'react'
import { uid } from '../api'
import { EntityForm, type FormField } from '../EntityForm'
import { Badge, Button, EmptyState } from '../ui'
import { Icon } from '../icons'
import {
  FORESHADOW_STATUS, IMPORTANCE, chapterLabel, chapterOptions, nextArray, removeById, statusTone, type ToolProps,
} from './types'

export function ForeshadowPanel({ t, workbench, chapters, onChange }: ToolProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const chapterOpts = chapterOptions(chapters, t)

  const fields: FormField[] = [
    { key: 'title', label: t('标题'), required: true, placeholder: t('未命名') },
    { key: 'plantedChapter', label: t('埋设章节'), type: 'select', options: chapterOpts, placeholder: t('未设置') },
    { key: 'payoffChapter', label: t('回收章节'), type: 'select', options: chapterOpts, placeholder: t('未设置') },
    { key: 'status', label: t('状态'), type: 'select', options: FORESHADOW_STATUS.map(value => ({ value, label: t(value) })) },
    { key: 'importance', label: t('重要度'), type: 'select', options: IMPORTANCE.map(value => ({ value, label: t(value) })) },
    { key: 'description', label: t('描述'), type: 'textarea', rows: 4 },
  ]

  const save = (values: Record<string, any>) => {
    const entry = { ...(editing ?? {}), ...values, id: editing?.id ?? uid('seed') }
    onChange(current => ({ ...current, foreshadows: nextArray(current.foreshadows, entry) }), true)
  }

  const total = workbench.foreshadows.length
  const paid = workbench.foreshadows.filter((entry: any) => entry.status === '已回收').length
  const planted = workbench.foreshadows.filter((entry: any) => entry.status === '已埋设').length

  return (
    <div className="nwb-tool-panel">
      <div className="nwb-tool-head">
        <div>
          <div className="nwb-tool-title">{t('伏笔管理')}</div>
          <div className="nwb-tool-sub">{t('共 {n} 项').replace('{n}', String(total))} · {t('回收率')} {total ? Math.round(paid / total * 100) : 0}%</div>
        </div>
        <Button variant="primary" size="sm" onClick={() => { setEditing(null); setOpen(true) }}><Icon name="plus" size={14} /> {t('伏笔')}</Button>
      </div>

      <div className="nwb-foreshadow-summary">
        <div className="nwb-foreshadow-stats">
          <span><b>{paid}</b> {t('已回收')}</span>
          <span><b>{planted}</b> {t('已埋设')}</span>
          <span><b>{total - paid}</b> {t('待处理')}</span>
        </div>
        <div className="nwb-progress"><span style={{ width: `${total ? paid / total * 100 : 0}%` }} /></div>
      </div>

      {workbench.foreshadows.length === 0 ? (
        <EmptyState
          icon="foreshadow"
          title={t('还没有伏笔')}
          text={t('埋下的每一笔，都该知道什么时候回收。')}
          action={<Button variant="primary" size="sm" onClick={() => { setEditing(null); setOpen(true) }}>{t('添加伏笔')}</Button>}
        />
      ) : (
        <div className="nwb-foreshadow-list">
          {workbench.foreshadows.map((entry: any) => (
            <button key={entry.id} className="nwb-foreshadow-row" onClick={() => { setEditing(entry); setOpen(true) }}>
              <span className="nwb-foreshadow-icon"><Icon name="foreshadow" size={15} /></span>
              <span className="nwb-foreshadow-body">
                <span className="nwb-foreshadow-title">
                  {entry.title || t('未命名')}
                  <Badge tone={statusTone(entry.status ?? '未埋设') as any}>{t(entry.status ?? '未埋设')}</Badge>
                </span>
                <span className="nwb-foreshadow-path">
                  {entry.plantedChapter ? chapterLabel(chapters, entry.plantedChapter, t) : t('未设置')}
                  <Icon name="chevron" size={10} />
                  {entry.payoffChapter ? chapterLabel(chapters, entry.payoffChapter, t) : '…'}
                </span>
                {entry.description ? <span className="nwb-card-text nwb-clamp-2">{entry.description}</span> : null}
              </span>
              <span className={`nwb-importance-bar importance-${entry.importance === '高' ? 'high' : entry.importance === '低' ? 'low' : 'medium'}`} />
            </button>
          ))}
        </div>
      )}

      <EntityForm
        open={open}
        title={editing ? t('编辑伏笔') : t('添加伏笔')}
        fields={fields}
        initial={editing ?? { status: '未埋设', importance: '中' }}
        onClose={() => setOpen(false)}
        onSubmit={save}
        onDelete={editing ? () => onChange(current => ({ ...current, foreshadows: removeById(current.foreshadows, editing.id) }), true) : undefined}
        t={t}
      />
    </div>
  )
}
