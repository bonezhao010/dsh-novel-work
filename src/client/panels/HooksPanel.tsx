import React, { useMemo, useState } from 'react'
import { uid } from '../api'
import { EntityForm, type FormField } from '../EntityForm'
import { Badge, Button, EmptyState, StatPill } from '../ui'
import { Icon } from '../icons'
import {
  HOOK_STATUS, HOOK_TYPES, chapterLabel, chapterOptions, nextArray, removeById, statusTone, type ToolProps,
} from './types'

export function HooksPanel({ t, workbench, chapters, onChange }: ToolProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const chapterOpts = chapterOptions(chapters, t)

  const fields: FormField[] = [
    { key: 'title', label: t('标题'), required: true, placeholder: t('未命名') },
    { key: 'chapterPath', label: t('章节'), type: 'select', options: chapterOpts, placeholder: t('未设置') },
    { key: 'type', label: t('钩子类型'), type: 'select', options: HOOK_TYPES.map(value => ({ value, label: t(value) })) },
    { key: 'status', label: t('状态'), type: 'select', options: HOOK_STATUS.map(value => ({ value, label: t(value) })) },
    { key: 'content', label: t('钩子内容'), type: 'textarea', rows: 3 },
    { key: 'note', label: t('备注'), type: 'textarea', rows: 2 },
  ]

  const save = (values: Record<string, any>) => {
    const hook = { ...(editing ?? {}), ...values, id: editing?.id ?? uid('hook') }
    onChange(current => ({ ...current, hooks: nextArray(current.hooks, hook) }), true)
  }

  const ordered = useMemo(() => {
    const indexOf = (path: string) => chapters.findIndex(chapter => chapter.path === path)
    return [...workbench.hooks].sort((a: any, b: any) => {
      const ai = indexOf(a.chapterPath)
      const bi = indexOf(b.chapterPath)
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi)
    })
  }, [workbench.hooks, chapters])

  const armed = workbench.hooks.filter((hook: any) => hook.status !== '已引爆' && hook.status !== '已失效').length

  return (
    <div className="nwb-tool-panel">
      <div className="nwb-tool-head">
        <div>
          <div className="nwb-tool-title">{t('钩子管理')}</div>
          <div className="nwb-tool-sub">{t('共 {n} 项').replace('{n}', String(workbench.hooks.length))} · {t('待处理')} {armed}</div>
        </div>
        <Button variant="primary" size="sm" onClick={() => { setEditing(null); setOpen(true) }}><Icon name="plus" size={14} /> {t('钩子')}</Button>
      </div>

      <div className="nwb-summary-row">
        <StatPill icon="hook" label={t('钩子数')} value={workbench.hooks.length} />
        <StatPill icon="sparkle" label={t('待引爆')} value={armed} />
        <StatPill icon="check" label={t('已引爆')} value={workbench.hooks.filter((hook: any) => hook.status === '已引爆').length} />
      </div>

      {workbench.hooks.length === 0 ? (
        <EmptyState
          icon="hook"
          title={t('还没有钩子')}
          text={t('章末那一下，是读者翻到下一页的理由。')}
          action={<Button variant="primary" size="sm" onClick={() => { setEditing(null); setOpen(true) }}>{t('添加钩子')}</Button>}
        />
      ) : (
        <div className="nwb-hook-list">
          {ordered.map((hook: any) => (
            <button key={hook.id} className="nwb-hook-row" onClick={() => { setEditing(hook); setOpen(true) }}>
              <span className={`nwb-hook-mark tone-${statusTone(hook.status ?? '待引爆')}`}><Icon name="hook" size={15} /></span>
              <span className="nwb-hook-body">
                <span className="nwb-hook-top">
                  <span className="nwb-hook-title">{hook.title || t('未命名')}</span>
                  <Badge tone={statusTone(hook.status ?? '待引爆') as any}>{t(hook.status ?? '待引爆')}</Badge>
                </span>
                <span className="nwb-hook-meta">
                  <span className="nwb-tag">{t(hook.type ?? '悬念')}</span>
                  {hook.chapterPath ? <span className="nwb-muted">{chapterLabel(chapters, hook.chapterPath, t)}</span> : null}
                </span>
                {hook.content ? <span className="nwb-card-text nwb-clamp-3">{hook.content}</span> : null}
              </span>
            </button>
          ))}
        </div>
      )}

      <EntityForm
        open={open}
        title={editing ? t('编辑钩子') : t('添加钩子')}
        fields={fields}
        initial={editing ?? { type: '悬念', status: '待引爆' }}
        onClose={() => setOpen(false)}
        onSubmit={save}
        onDelete={editing ? () => onChange(current => ({ ...current, hooks: removeById(current.hooks, editing.id) }), true) : undefined}
        t={t}
      />
    </div>
  )
}
