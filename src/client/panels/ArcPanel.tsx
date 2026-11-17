import React, { useEffect, useMemo, useState } from 'react'
import { Badge, Button, EmptyState, Segmented } from '../ui'
import { Icon } from '../icons'
import type { ToolProps } from './types'

const STAGES = ['平凡世界', '冒险召唤', '拒绝召唤', '遇见导师', '跨越门槛', '考验与盟友', '接近深渊', '磨难与归返']
const STAGE_HINTS = [
  '人物的日常与缺口。',
  '打破日常的事件或邀请。',
  '人物为什么不愿出发。',
  '谁给了他工具、警告或勇气。',
  '第一次不可逆的选择。',
  '盟友、敌人与规则开始显形。',
  '逼近最害怕面对的东西。',
  '付出代价，带着改变回来。',
]

function defaultStages() {
  return Array.from({ length: 8 }, () => ({ status: 'todo', note: '' }))
}

export function ArcPanel({ t, workbench, onChange }: ToolProps) {
  const characters = workbench.characters
  const [selectedId, setSelectedId] = useState<string>('')
  const [stageIndex, setStageIndex] = useState(0)
  const [noteDraft, setNoteDraft] = useState('')

  const character = characters.find((entry: any) => entry.id === selectedId) ?? characters[0]
  const arc = character ? workbench.arcs[character.id] : undefined
  const stages = arc?.stages?.length === 8 ? arc.stages : defaultStages()
  const done = stages.filter((stage: any) => stage.status === 'done').length
  const currentIndex = Math.max(0, stages.findIndex((stage: any) => stage.status !== 'done'))
  const current = character ? stages[stageIndex] ?? stages[0] : null

  useEffect(() => {
    if (characters.length === 0) { setSelectedId(''); return }
    if (!characters.some((entry: any) => entry.id === selectedId)) setSelectedId(characters[0].id)
  }, [characters, selectedId])

  useEffect(() => {
    if (!character) return
    const safeIndex = Math.min(stageIndex, 7)
    const entry = (workbench.arcs[character.id]?.stages ?? defaultStages())[safeIndex]
    setNoteDraft(entry?.note ?? '')
  }, [character?.id, stageIndex, workbench.arcs])

  const saveCurrentNote = () => {
    const currentNote = stages[stageIndex]?.note ?? ''
    if (noteDraft !== currentNote) updateStage(stageIndex, { note: noteDraft })
  }

  const pickStage = (index: number) => {
    if (index === stageIndex) return
    saveCurrentNote()
    setStageIndex(index)
  }

  const updateStage = (index: number, patch: Record<string, any>, immediate = true) => {
    if (!character) return
    onChange((wb) => {
      const arcs = { ...wb.arcs }
      const existing = arcs[character.id]?.stages?.length === 8 ? arcs[character.id].stages : defaultStages()
      const nextStages = existing.map((stage: any, i: number) => i === index ? { ...stage, ...patch } : stage)
      arcs[character.id] = { ...(arcs[character.id] ?? {}), stages: nextStages }
      return { ...wb, arcs }
    }, immediate)
  }

  if (characters.length === 0) {
    return (
      <div className="nwb-tool-panel">
        <div className="nwb-tool-head">
          <div>
            <div className="nwb-tool-title">{t('人物弧光 · 八步冒险法')}</div>
            <div className="nwb-tool-sub">{t('当前阶段')} · {t('弧光进度')}</div>
          </div>
        </div>
        <EmptyState icon="arc" title={t('还没有弧光')} text={t('先在人物看板添加角色，八步弧光会为每个角色生成一条轨道。')} />
      </div>
    )
  }

  return (
    <div className="nwb-tool-panel">
      <div className="nwb-tool-head">
        <div>
          <div className="nwb-tool-title">{t('人物弧光 · 八步冒险法')}</div>
          <div className="nwb-tool-sub">{t('当前阶段')} · {t(STAGES[currentIndex])}</div>
        </div>
        <select className="nwb-select nwb-select-compact" value={character?.id ?? ''} onChange={event => { saveCurrentNote(); setSelectedId(event.target.value); setStageIndex(0) }} aria-label={t('选择角色')}>
          {characters.map((entry: any) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select>
      </div>

      <div className="nwb-arc-summary">
        <div className="nwb-arc-summary-top">
          <div className="nwb-arc-name">
            <span className="nwb-avatar nwb-avatar-small">{(character?.name ?? '?').slice(0, 1)}</span>
            <div>
              <div className="nwb-arc-character">{character?.name}</div>
              <div className="nwb-muted">{t(character?.role ?? '其他')} · {done}/8 {t('阶段')}</div>
            </div>
          </div>
          <Badge tone={done === 8 ? 'success' : done > 0 ? 'brand' : 'neutral'}>{t('弧光进度')} {Math.round(done / 8 * 100)}%</Badge>
        </div>
        <div className="nwb-progress"><span style={{ width: `${done / 8 * 100}%` }} /></div>
        <div className="nwb-arc-current">{t('当前阶段')}：{t(STAGES[currentIndex])}</div>
      </div>

      <div className="nwb-arc-timeline">
        {STAGES.map((stage, index) => {
          const entry = stages[index] ?? { status: 'todo', note: '' }
          const active = index === stageIndex
          return (
            <button
              key={stage}
              className={`nwb-arc-step ${entry.status}${active ? ' is-active' : ''}`}
              onClick={() => pickStage(index)}
            >
              <span className="nwb-arc-index">
                {entry.status === 'done' ? <Icon name="check" size={12} /> : String(index + 1).padStart(2, '0')}
              </span>
              <span className="nwb-arc-body">
                <span className="nwb-arc-label">{t(stage)}</span>
                <span className="nwb-arc-note">{entry.note || t(STAGE_HINTS[index])}</span>
              </span>
              <span className={`nwb-status-dot ${entry.status}`} title={t(entry.status === 'todo' ? '未开始' : entry.status === 'doing' ? '进行中' : '已完成')} />
            </button>
          )
        })}
      </div>

      <div className="nwb-arc-editor">
        <div className="nwb-arc-editor-head">
          <div>
            <div className="nwb-arc-editor-title">{t('阶段')} {stageIndex + 1} · {t(STAGES[stageIndex])}</div>
            <div className="nwb-muted">{t(STAGE_HINTS[stageIndex])}</div>
          </div>
          <Segmented
            value={current?.status ?? 'todo'}
            ariaLabel={t('状态')}
            options={[
              { value: 'todo', label: t('未开始') },
              { value: 'doing', label: t('进行中') },
              { value: 'done', label: t('已完成') },
            ]}
            onChange={value => updateStage(stageIndex, { status: value, note: noteDraft })}
          />
        </div>
        <label className="nwb-field">
          <span className="nwb-field-label">{t('阶段笔记')}</span>
          <textarea
            className="nwb-textarea"
            rows={3}
            value={noteDraft}
            placeholder={t('写下这一阶段发生了什么，以及人物因此改变了什么。')}
            onChange={event => setNoteDraft(event.target.value)}
            onBlur={saveCurrentNote}
          />
        </label>
        <div className="nwb-inline-actions">
          <Button size="sm" variant="primary" onClick={() => { updateStage(stageIndex, { note: noteDraft }); }}>{t('保存笔记')}</Button>
          <span className="nwb-muted">{t('阶段')} {stageIndex + 1}/8</span>
        </div>
      </div>
    </div>
  )
}
