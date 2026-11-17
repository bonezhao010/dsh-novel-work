import React, { useEffect, useRef, useState } from 'react'
import { assistApi, type Workbench } from './api'
import {
  BOARD_OPTIONS, applyBoardProposals, boardForTool, buildBoardPayload, buildStoryContext,
  proposalTitle, resolveProposalBefore, type BoardId,
} from './boardAI'
import type { ChapterRef } from './panels/types'
import { Badge, Button, EmptyState, Modal, Select, Spinner } from './ui'
import { Icon } from './icons'

interface BoardAIDialogProps {
  open: boolean
  t: (key: string) => string
  workbench: Workbench
  chapters: ChapterRef[]
  activeTool: string
  workTitle: string
  chapterTitle: string
  chapterText: string
  onClose: () => void
  onChange: (updater: (current: Workbench) => Workbench, immediate?: boolean) => void
  onToast: (message: string, tone?: 'info' | 'success' | 'error') => void
}

type Phase = 'idle' | 'loading' | 'review' | 'error'

const FIELD_LABELS: Record<string, string> = {
  name: '名称', title: '标题', role: '身份', age: '年龄', tags: '标签', appearance: '外貌',
  personality: '性格', goal: '目标', ultimateGoal: '终极目标', secret: '秘密', status: '状态',
  notes: '人物小传', description: '描述', type: '类型', importance: '重要度', chapterPath: '章节',
  characterIds: '涉及角色', from: '起点', to: '终点', strength: '强度', ownerId: '持有者',
  significance: '意义', firstChapter: '首次出现', plantedChapter: '埋设章节', payoffChapter: '回收章节',
  kind: '类型', progress: '进展', startChapter: '起始章节', endChapter: '收束章节',
  content: '钩子内容', note: '备注', involvedCharacterIds: '涉及角色', tension: '张力',
  storyTime: '故事时间', path: '章节',
}

export function BoardAIDialog({
  open, t, workbench, chapters, activeTool, workTitle, chapterTitle, chapterText, onClose, onChange, onToast,
}: BoardAIDialogProps) {
  const [board, setBoard] = useState<BoardId>(boardForTool(activeTool))
  const [characterId, setCharacterId] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState('')
  const [selectedAdds, setSelectedAdds] = useState<number[]>([])
  const [selectedUpdates, setSelectedUpdates] = useState<number[]>([])
  const seq = useRef(0)
  const characters = workbench.characters ?? []

  useEffect(() => {
    if (!open) return
    setBoard(boardForTool(activeTool))
    setCharacterId(current => characters.some((character: any) => character.id === current) ? current : (characters[0]?.id ?? ''))
    setPhase('idle')
    setResult(null)
    setError('')
    setSelectedAdds([])
    setSelectedUpdates([])
    seq.current += 1
  }, [open, activeTool])

  const close = () => {
    seq.current += 1
    onClose()
  }

  const resetFor = (nextBoard: BoardId) => {
    seq.current += 1
    setBoard(nextBoard)
    setPhase('idle')
    setResult(null)
    setError('')
    setSelectedAdds([])
    setSelectedUpdates([])
  }

  const generate = async () => {
    const data = buildBoardPayload(board, workbench, characterId, chapters)
    if (data === null) {
      setError(t('请先添加角色'))
      setPhase('error')
      return
    }
    if (board === 'tension' && chapters.length === 0) {
      setError(t('请先创建章节'))
      setPhase('error')
      return
    }
    const run = ++seq.current
    setPhase('loading')
    setError('')
    setResult(null)
    try {
      const response = await assistApi.board({
        board,
        workTitle,
        chapterTitle,
        chapterText: chapterText.slice(0, 8000),
        storyContext: buildStoryContext(workbench),
        data,
        characters: characters.map((character: any) => ({ id: character.id, name: character.name, role: character.role ?? '' })),
        chapters: chapters.map(chapter => ({ path: chapter.path, title: chapter.title })),
        ...(board === 'quests' || board === 'arc' ? { characterId } : {}),
      })
      if (run !== seq.current) return
      setResult(response)
      setSelectedAdds(response.adds.map((_: any, index: number) => index))
      setSelectedUpdates(response.updates.map((_: any, index: number) => index))
      setPhase('review')
    } catch (cause) {
      if (run !== seq.current) return
      setError(cause instanceof Error ? cause.message : String(cause))
      setPhase('error')
    }
  }

  const toggle = (list: number[], setter: (next: number[]) => void, index: number) => {
    setter(list.includes(index) ? list.filter(item => item !== index) : [...list, index])
  }

  const selectAll = () => {
    if (!result) return
    const allAdds = result.adds.map((_: any, index: number) => index)
    const allUpdates = result.updates.map((_: any, index: number) => index)
    const allSelected = selectedAdds.length === allAdds.length && selectedUpdates.length === allUpdates.length
    setSelectedAdds(allSelected ? [] : allAdds)
    setSelectedUpdates(allSelected ? [] : allUpdates)
  }

  const apply = () => {
    if (!result) return
    const adds = selectedAdds.map(index => result.adds[index]).filter(Boolean)
    const updates = selectedUpdates.map(index => result.updates[index]).filter(Boolean)
    if (adds.length + updates.length === 0) return
    const next = applyBoardProposals(workbench, result.board as BoardId, adds, updates, characterId, chapters)
    onChange(() => next, true)
    onToast(t('已合并 {n} 项看板建议').replace('{n}', String(adds.length + updates.length)), 'success')
    close()
  }

  const selectedCount = selectedAdds.length + selectedUpdates.length
  const totalCount = (result?.adds?.length ?? 0) + (result?.updates?.length ?? 0)
  const boardLabel = BOARD_OPTIONS.find(option => option.id === board)?.label ?? '人物'
  const needsCharacter = board === 'quests' || board === 'arc'
  const canGenerate = (!needsCharacter || characters.length > 0) && (board !== 'tension' || chapters.length > 0)

  const nameOf = (id: string) => characters.find((character: any) => character.id === id)?.name ?? id
  const fieldLabel = (key: string) => t(FIELD_LABELS[key] ?? key)
  const chapterName = (path: string) => chapters.find(chapter => chapter.path === path)?.title ?? String(path).split('/').pop()?.replace(/\.md$/i, '') ?? path

  const formatValue = (key: string, value: any): string => {
    if (value === undefined || value === null || value === '') return t('未设置')
    if (Array.isArray(value)) {
      if (key === 'characterIds' || key === 'involvedCharacterIds') return value.map(nameOf).join('、') || t('未设置')
      return value.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join('、') || t('未设置')
    }
    if (key === 'ownerId' || key === 'from' || key === 'to' || key === 'characterId') return nameOf(String(value))
    if (key === 'chapterPath' || key === 'startChapter' || key === 'endChapter' || key === 'plantedChapter' || key === 'payoffChapter' || key === 'firstChapter' || key === 'path') return chapterName(String(value))
    if (key === 'kind') return value === 'sub' ? t('暗线') : t('明线')
    if (key === 'type' && (value === 'main' || value === 'side')) return value === 'main' ? t('主线任务') : t('支线任务')
    if (key === 'status' && (value === 'planned' || value === 'active' || value === 'done' || value === 'failed')) {
      return value === 'planned' ? t('待开启') : value === 'done' ? t('已完成') : value === 'failed' ? t('已失败') : t('进行中')
    }
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const addFields = (add: any) => Object.entries(add)
    .filter(([key, value]) => key !== 'id' && key !== 'characterId' && value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0))
    .slice(0, 8)

  return (
    <Modal
      open={open}
      title={t('AI 更新看板')}
      subtitle={t('先生成增量建议，确认后再合并；不会自动删除已有条目。')}
      onClose={close}
      width={780}
      footer={(
        <>
          <div className="nwb-modal-foot-left">
            {phase === 'review' ? <Button variant="ghost" onClick={selectAll}>{selectedCount === totalCount && totalCount > 0 ? t('取消全选') : t('全选')}</Button> : null}
            {phase === 'review' || phase === 'error' ? <Button variant="ghost" onClick={() => { void generate() }}>{t('重新生成')}</Button> : null}
          </div>
          <Button variant="ghost" onClick={close}>{t('取消')}</Button>
          <Button variant="primary" onClick={apply} disabled={phase !== 'review' || selectedCount === 0}>
            {t('应用所选')} {selectedCount > 0 ? `(${selectedCount})` : ''}
          </Button>
        </>
      )}
    >
      <div className="nwb-board-ai">
        <div className="nwb-board-ai-controls">
          <label className="nwb-field nwb-field-inline">
            <span className="nwb-field-label">{t('目标看板')}</span>
            <Select
              value={board}
              onChange={value => resetFor(value as BoardId)}
              options={BOARD_OPTIONS.map(option => ({ value: option.id, label: t(option.label) }))}
              ariaLabel={t('目标看板')}
            />
          </label>
          {needsCharacter ? (
            <label className="nwb-field nwb-field-inline">
              <span className="nwb-field-label">{t('选择角色')}</span>
              <Select
                value={characterId}
                onChange={value => { seq.current += 1; setCharacterId(value); setPhase('idle'); setResult(null); setError(''); setSelectedAdds([]); setSelectedUpdates([]) }}
                options={characters.map((character: any) => ({ value: character.id, label: character.name }))}
                ariaLabel={t('选择角色')}
              />
            </label>
          ) : null}
          <Button variant="primary" onClick={() => { void generate() }} disabled={phase === 'loading' || !canGenerate}>
            <Icon name="sparkle" size={14} /> {phase === 'loading' ? t('AI 正在生成…') : t('生成建议')}
          </Button>
        </div>

        <div className="nwb-board-ai-context">
          <Badge tone="brand">{t(boardLabel)}</Badge>
          <span>{chapterTitle ? `《${chapterTitle}》` : t('未选择章节')}</span>
          <span className="nwb-muted">{t('基于当前章节正文与现有看板生成增量建议。')}</span>
        </div>

        {!canGenerate ? <EmptyState icon="users" title={t('还没有人物')} text={t('先在人物看板添加角色。')} /> : null}

        {phase === 'loading' ? (
          <div className="nwb-board-ai-loading"><Spinner label={t('AI 正在阅读本章并整理看板建议…')} /></div>
        ) : null}

        {phase === 'error' ? (
          <div className="nwb-board-ai-error">
            <div className="nwb-form-error">{error}</div>
            <Button size="sm" variant="ghost" onClick={() => { void generate() }}>{t('重试')}</Button>
          </div>
        ) : null}

        {phase === 'review' && result ? (
          <div className="nwb-board-ai-review">
            <div className="nwb-board-ai-summary">{result.summary}</div>
            {result.warnings?.length ? (
              <div className="nwb-board-ai-warnings">
                {result.warnings.map((warning: string, index: number) => <div key={index}>· {warning}</div>)}
              </div>
            ) : null}

            {result.adds.length > 0 ? (
              <div className="nwb-board-ai-section">
                <div className="nwb-subhead">{t('新增建议')} <span className="nwb-count">{result.adds.length}</span></div>
                {result.adds.map((add: any, index: number) => (
                  <label key={index} className={`nwb-proposal${selectedAdds.includes(index) ? ' is-selected' : ''}`}>
                    <input type="checkbox" checked={selectedAdds.includes(index)} onChange={() => toggle(selectedAdds, setSelectedAdds, index)} />
                    <span className="nwb-proposal-body">
                      <span className="nwb-proposal-title">
                        <Badge tone="success">{t('新增')}</Badge>
                        {proposalTitle(workbench, result.board as BoardId, add, characterId) || t('未命名')}
                      </span>
                      <span className="nwb-proposal-fields">
                        {addFields(add).map(([key, value]) => (
                          <span key={key}><b>{fieldLabel(key)}</b>{formatValue(key, value)}</span>
                        ))}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ) : null}

            {result.updates.length > 0 ? (
              <div className="nwb-board-ai-section">
                <div className="nwb-subhead">{t('更新建议')} <span className="nwb-count">{result.updates.length}</span></div>
                {result.updates.map((update: any, index: number) => {
                  const before = resolveProposalBefore(workbench, result.board as BoardId, update, characterId)
                  const changes = update.changes && typeof update.changes === 'object' ? update.changes : {}
                  const title = (before as any)?.name || (before as any)?.title
                    || ((before as any)?.from ? `${nameOf((before as any).from)} → ${nameOf((before as any).to)}` : '')
                    || proposalTitle(workbench, result.board as BoardId, update, characterId) || t('未命名')
                  return (
                    <label key={index} className={`nwb-proposal${selectedUpdates.includes(index) ? ' is-selected' : ''}`}>
                      <input type="checkbox" checked={selectedUpdates.includes(index)} onChange={() => toggle(selectedUpdates, setSelectedUpdates, index)} />
                      <span className="nwb-proposal-body">
                        <span className="nwb-proposal-title">
                          <Badge tone="brand">{t('更新')}</Badge>
                          {title}
                        </span>
                        {!before ? <span className="nwb-proposal-missing">{t('找不到对应条目，应用时将跳过。')}</span> : null}
                        <span className="nwb-proposal-diff">
                          {Object.entries(changes).map(([key, value]) => (
                            <span key={key} className="nwb-diff-row">
                              <b>{fieldLabel(key)}</b>
                              <span className="nwb-diff-before">{formatValue(key, (before as any)?.[key])}</span>
                              <span className="nwb-diff-arrow">→</span>
                              <span className="nwb-diff-after">{formatValue(key, value)}</span>
                            </span>
                          ))}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            ) : null}

            {totalCount === 0 ? <div className="nwb-hint-box">{t('AI 没有提出新的看板改动。')}</div> : null}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
