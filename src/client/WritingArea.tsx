import React, { useEffect, useMemo, useRef, useState } from 'react'
import { assistApi, countWords, type AssistAction, type TreeNode, type WorkState } from './api'
import { Icon } from './icons'
import { Markdown } from './markdown'
import { CHAPTER_STATUS } from './panels/types'
import { findSelectionRange, MAX_SELECTION, replaceRange } from './selection'
import { Badge, Button, EmptyState, IconButton, Modal, Select, Spinner } from './ui'

type Mode = 'edit' | 'split' | 'preview'

interface SelectionBubble { text: string; count: number; top: number; left: number }
interface AssistState {
  action: AssistAction
  text: string
  count: number
  top: number
  left: number
  range: [number, number] | null
  phase: 'loading' | 'done' | 'error'
  result?: string
  error?: string
}

const ASSIST_LABELS: Record<AssistAction, string> = { rewrite: '改写', expand: '扩写', analyze: '分析', suggest: '后续建议' }

function chapterContext(tree: TreeNode, target: string | null): { volume: string; title: string; path: string } | null {
  if (!target) return null
  const walk = (node: TreeNode, volume: string): { volume: string; title: string; path: string } | null => {
    for (const child of node.children ?? []) {
      if (child.type === 'chapter' && child.path === target) return { volume, title: child.title ?? child.path, path: child.path }
      if (child.type === 'volume') {
        const found = walk(child, child.title ?? volume)
        if (found) return found
      }
    }
    return null
  }
  return walk(tree, '')
}

function fmtTime(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

export function WritingArea({
  t, workState, activePath, draft, saved, loading, error, saveState, savedAt, mode, onMode, onDraft, onSave, onRetry, onMeta, onToast,
}: {
  t: (key: string) => string
  workState: WorkState | null
  activePath: string | null
  draft: string
  saved: string
  loading: boolean
  error: string | null
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  savedAt: string | null
  mode: Mode
  onMode: (mode: Mode) => void
  onDraft: (value: string) => void
  onSave: () => void
  onRetry: () => void
  onMeta: (patch: Record<string, any>) => void
  onToast: (message: string, tone?: 'info' | 'success' | 'error') => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const bubbleRef = useRef<HTMLDivElement | null>(null)
  const assistSeq = useRef(0)
  const draftRef = useRef(draft)
  draftRef.current = draft
  const [selection, setSelection] = useState<SelectionBubble | null>(null)
  const [assist, setAssist] = useState<AssistState | null>(null)
  const context = useMemo(() => workState ? chapterContext(workState.tree, activePath) : null, [workState?.tree, activePath])
  const words = useMemo(() => countWords(draft), [draft])
  const characters = useMemo(() => Array.from(draft.replace(/\s/g, '')).length, [draft])
  const dirty = activePath !== null && draft !== saved
  const meta = activePath && workState ? workState.workbench.chapterMeta[activePath] ?? {} : {}
  const storyContext = useMemo(() => {
    const workbench = workState?.workbench
    if (!workbench) return ''
    const characters = (workbench.characters ?? []).slice(0, 12).map((character: any) => {
      const quests = (character.quests ?? []).filter((quest: any) => quest.status !== 'done').slice(0, 3).map((quest: any) => quest.title).join('、')
      return `${character.name}（${character.role ?? '角色'}；终极目标：${character.ultimateGoal || character.goal || '未设置'}${quests ? `；任务：${quests}` : ''}）`
    })
    const plotlines = (workbench.plotlines ?? []).slice(0, 8).map((line: any) => `${line.title}（${line.kind === 'main' ? '明线' : '暗线'}，${line.status ?? '进行中'}）`)
    const foreshadows = (workbench.foreshadows ?? []).slice(0, 8).map((entry: any) => `${entry.title}（${entry.status ?? '未埋设'}）`)
    return [characters.length ? `人物：${characters.join('；')}` : '', plotlines.length ? `明暗线：${plotlines.join('；')}` : '', foreshadows.length ? `伏笔：${foreshadows.join('；')}` : ''].filter(Boolean).join('\n').slice(0, 4000)
  }, [workState?.workbench])

  useEffect(() => {
    if (!activePath || loading) return
    const timer = window.setTimeout(() => {
      const node = textareaRef.current
      if (!node) return
      node.focus()
      node.setSelectionRange(node.value.length, node.value.length)
    }, 60)
    return () => window.clearTimeout(timer)
  }, [activePath, loading])

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Tab' || event.metaKey || event.ctrlKey || event.altKey) return
    event.preventDefault()
    const element = event.currentTarget
    const value = draft
    const start = element.selectionStart ?? 0
    const end = element.selectionEnd ?? 0
    if (event.shiftKey) {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const block = value.slice(lineStart, end)
      const nextBlock = block.replace(/^( {1,2}|\t)/gm, '')
      const removed = block.length - nextBlock.length
      onDraft(value.slice(0, lineStart) + nextBlock + value.slice(end))
      requestAnimationFrame(() => {
        element.selectionStart = Math.max(lineStart, start - removed)
        element.selectionEnd = Math.max(element.selectionStart, end - removed)
      })
      return
    }
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    if (value.slice(start, end).includes('\n')) {
      const block = value.slice(lineStart, end)
      const nextBlock = block.replace(/^/gm, '  ')
      const added = nextBlock.length - block.length
      onDraft(value.slice(0, lineStart) + nextBlock + value.slice(end))
      requestAnimationFrame(() => {
        element.selectionStart = start + 2
        element.selectionEnd = end + added
      })
      return
    }
    onDraft(value.slice(0, start) + '  ' + value.slice(end))
    requestAnimationFrame(() => {
      element.selectionStart = start + 2
      element.selectionEnd = start + 2
    })
  }

  useEffect(() => {
    setSelection(null)
    assistSeq.current += 1
    setAssist(null)
  }, [activePath, mode])

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (bubbleRef.current?.contains(target) || previewRef.current?.contains(target)) return
      setSelection(null)
    }
    const onScroll = () => setSelection(null)
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelection(null) }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const handlePreviewSelection = () => {
    const root = previewRef.current
    const current = window.getSelection()
    if (!root) return
    if (!current || current.isCollapsed || current.rangeCount === 0) {
      setSelection(null)
      return
    }
    const anchor = current.anchorNode
    const focus = current.focusNode
    if (!anchor || !focus || !root.contains(anchor) || !root.contains(focus)) return
    const text = current.toString().trim()
    if (!text) { setSelection(null); return }
    const count = Array.from(text).length
    if (count > MAX_SELECTION) {
      setSelection(null)
      onToast(t('选区最多 {n} 字').replace('{n}', String(MAX_SELECTION)), 'error')
      return
    }
    const range = current.getRangeAt(0).cloneRange()
    const rect = range.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return
    const host = root.closest('.nwb')?.getBoundingClientRect()
    const contained = host ? getComputedStyle(root.closest('.nwb') as Element).containerType !== 'normal' : false
    const baseTop = contained && host ? host.top : 0
    const baseLeft = contained && host ? host.left : 0
    const width = contained && host ? host.width : window.innerWidth
    const height = contained && host ? host.height : window.innerHeight
    const top = Math.min(Math.max(8, rect.bottom - baseTop + 8), Math.max(8, height - 150))
    const left = Math.min(Math.max(140, rect.left - baseLeft + rect.width / 2), Math.max(140, width - 140))
    setSelection({ text, count, top, left })
  }

  const closeAssist = () => {
    assistSeq.current += 1
    setAssist(null)
  }

  const requestAssist = async (action: AssistAction) => {
    if (!selection) return
    const text = selection.text
    const range = findSelectionRange(draftRef.current, text)
    const before = range ? draftRef.current.slice(Math.max(0, range[0] - 1600), range[0]) : ''
    const after = range ? draftRef.current.slice(range[1], range[1] + 1600) : ''
    const base = { action, text, count: selection.count, top: selection.top, left: selection.left, range }
    const seq = ++assistSeq.current
    setSelection(null)
    setAssist({ ...base, phase: 'loading' })
    try {
      const result = await assistApi.run({
        action,
        text,
        workTitle: workState?.work.title ?? '',
        chapterTitle: context?.title ?? '',
        before,
        after,
        storyContext,
      })
      if (seq !== assistSeq.current) return
      setAssist({ ...base, phase: 'done', result: result.text })
    } catch (error) {
      if (seq !== assistSeq.current) return
      setAssist({ ...base, phase: 'error', error: error instanceof Error ? error.message : String(error) })
    }
  }

  const copyAssist = async () => {
    if (!assist?.result) return
    try {
      await navigator.clipboard.writeText(assist.result)
      onToast(t('已复制'), 'success')
    } catch {
      onToast(t('复制失败'), 'error')
    }
  }

  const applyAssist = () => {
    if (!assist?.result) return
    const current = draftRef.current
    const range = findSelectionRange(current, assist.text) ?? assist.range
    if (assist.action === 'rewrite' || assist.action === 'expand') {
      if (!range) return
      onDraft(replaceRange(current, range, assist.result))
      closeAssist()
      onToast(t('已替换选区'), 'success')
      return
    }
    const lineEnd = range ? current.indexOf('\n', range[1]) : -1
    const point = range ? (lineEnd < 0 ? current.length : lineEnd) : current.length
    const label = t(ASSIST_LABELS[assist.action])
    const block = `\n\n> ${t('AI 助手')} · ${label}：\n${assist.result.split('\n').map(line => `> ${line}`).join('\n')}\n`
    onDraft(current.slice(0, point) + block + current.slice(point))
    closeAssist()
    onToast(t('已插入批注'), 'success')
  }

  return (
    <section className="nwb-center" aria-label={t('写作区')}>
      <div className="nwb-writing-head">
        <div className="nwb-breadcrumb">
          {context?.volume ? <span>{context.volume}</span> : null}
          {context?.volume ? <Icon name="chevron" size={11} /> : null}
          <span className={context ? 'is-current' : ''}>{context?.title ?? t('未选择章节')}</span>
        </div>
        <div className="nwb-writing-title-row">
          <h1 className="nwb-writing-title">{context?.title ?? t('写作区')}</h1>
          <div className="nwb-writing-actions">
            {activePath ? (
              <Select
                value={String(meta.status ?? '草稿')}
                onChange={(value) => onMeta({ status: value })}
                options={CHAPTER_STATUS.map(value => ({ value, label: t(value) }))}
              />
            ) : null}
            <div className="nwb-mode-switch">
              <IconButton icon="edit" label={t('编辑')} active={mode === 'edit'} onClick={() => onMode('edit')} size={15} />
              <IconButton icon="split" label={t('分栏')} active={mode === 'split'} onClick={() => onMode('split')} size={15} />
              <IconButton icon="preview" label={t('预览')} active={mode === 'preview'} onClick={() => onMode('preview')} size={15} />
            </div>
            <Button size="sm" onClick={onSave} disabled={!activePath || !dirty || saveState === 'saving'}>
              <Icon name="save" size={14} />
              {saveState === 'saving' ? t('保存中…') : t('保存')}
            </Button>
          </div>
        </div>
        <div className="nwb-writing-meta">
          <span className="nwb-save-state">
            <span className={`nwb-save-dot ${saveState}${dirty ? ' is-dirty' : ''}`} />
            {saveState === 'saving' ? t('保存中…')
              : saveState === 'error' ? t('保存失败')
                : dirty ? t('未保存') : saveState === 'saved' ? t('已保存') : t('本地文件')}
          </span>
          {saveState === 'error' ? <button type="button" className="nwb-link-btn" onClick={onSave}>{t('重试')}</button> : null}
          {savedAt ? <span className="nwb-muted">{t('最后保存于 {time}').replace('{time}', fmtTime(savedAt))}</span> : null}
          <span className="nwb-muted">{t('字数')} {words.toLocaleString()}</span>
          <span className="nwb-muted">{t('阅读时间')} {t('约 {n} 分钟').replace('{n}', String(Math.max(1, Math.round(characters / 500))))}</span>
          <span className="nwb-muted nwb-hide-narrow">Markdown</span>
        </div>
      </div>

      <div className="nwb-writing-body">
        {!workState ? (
          <EmptyState icon="book" title={t('正在打开作品…')} />
        ) : !activePath ? (
          <EmptyState
            icon="edit"
            title={t('选择左侧章节开始写作')}
            text={t('正文以 Markdown 保存')}
          />
        ) : loading ? (
          <div className="nwb-writing-loading"><Spinner label={t('加载中…')} /></div>
        ) : error ? (
          <EmptyState
            icon="warning"
            title={t('读取出错')}
            text={error}
            action={<Button variant="primary" onClick={onRetry}>{t('重试')}</Button>}
          />
        ) : mode === 'edit' ? (
          <textarea
            ref={textareaRef}
            className="nwb-editor"
            value={draft}
            spellCheck={false}
            onChange={event => onDraft(event.target.value)}
            onKeyDown={handleEditorKeyDown}
            placeholder={t('写下一句')}
            aria-label={context?.title ?? t('写作区')}
          />
        ) : mode === 'preview' ? (
          <div ref={previewRef} className="nwb-preview-scroll" onMouseUp={handlePreviewSelection}>
            <Markdown source={draft} />
          </div>
        ) : (
          <div className="nwb-split">
            <textarea
              ref={textareaRef}
              className="nwb-editor nwb-editor-split"
              value={draft}
              spellCheck={false}
              onChange={event => onDraft(event.target.value)}
              onKeyDown={handleEditorKeyDown}
              placeholder={t('写下一句')}
              aria-label={context?.title ?? t('写作区')}
            />
            <div ref={previewRef} className="nwb-preview-scroll nwb-preview-split" onMouseUp={handlePreviewSelection}>
              <Markdown source={draft} />
            </div>
          </div>
        )}
      </div>

      <div className="nwb-writing-foot">
        <span>{workState?.work.title ?? ''}</span>
        <span className="nwb-foot-sep">·</span>
        <span>{t('章节文件')}: <span className="nwb-mono">{activePath ? activePath.split('/').pop() : '—'}</span></span>
        <span className="nwb-foot-spacer" />
        <Badge tone={saveState === 'error' ? 'danger' : dirty ? 'warn' : 'neutral'}>
          {saveState === 'error' ? t('保存失败') : dirty ? t('未保存') : t('已保存')}
        </Badge>
        <span className="nwb-muted">{t('Tab 缩进')} · {t('⌘/Ctrl + S 保存')}</span>
      </div>

      {selection ? (
        <div
          ref={bubbleRef}
          className="nwb-ai-bubble"
          style={{ top: selection.top, left: selection.left }}
          onMouseDown={event => event.preventDefault()}
          role="toolbar"
          aria-label={t('AI 助手')}
        >
          <div className="nwb-ai-bubble-title">
            <span>{t('AI 助手')}</span>
            <span>{selection.count}/{MAX_SELECTION}</span>
          </div>
          <div className="nwb-ai-bubble-actions">
            <button type="button" onClick={() => { void requestAssist('rewrite') }}><Icon name="edit" size={13} /> {t('改写')}</button>
            <button type="button" onClick={() => { void requestAssist('expand') }}><Icon name="sparkle" size={13} /> {t('扩写')}</button>
            <button type="button" onClick={() => { void requestAssist('analyze') }}><Icon name="search" size={13} /> {t('分析')}</button>
            <button type="button" onClick={() => { void requestAssist('suggest') }}><Icon name="hook" size={13} /> {t('后续建议')}</button>
          </div>
        </div>
      ) : null}

      <Modal
        open={assist !== null}
        title={assist ? `${t(ASSIST_LABELS[assist.action])} · ${t('AI 助手')}` : t('AI 助手')}
        subtitle={assist ? t('选中 {n} 字').replace('{n}', String(assist.count)) : undefined}
        onClose={closeAssist}
        width={640}
        footer={assist ? (
          <>
            <Button variant="ghost" onClick={closeAssist}>{t('关闭')}</Button>
            <Button variant="ghost" onClick={() => { void copyAssist() }} disabled={!assist.result}>{t('复制')}</Button>
            {assist.phase === 'done' && assist.result && (assist.action === 'analyze' || assist.action === 'suggest')
              ? <Button variant="primary" onClick={applyAssist}>{t('插入批注')}</Button>
              : null}
            {assist.phase === 'done' && assist.result && (assist.action === 'rewrite' || assist.action === 'expand') && (findSelectionRange(draftRef.current, assist.text) ?? assist.range)
              ? <Button variant="primary" onClick={applyAssist}>{t('替换选区')}</Button>
              : null}
          </>
        ) : undefined}
      >
        {assist && assist.phase !== 'loading' ? (
          <div className="nwb-assist-original">
            <div className="nwb-assist-original-label">{t('原文')}</div>
            <div className="nwb-assist-original-text">{assist.text}</div>
          </div>
        ) : null}
        {assist?.phase === 'loading' ? <Spinner label={t('AI 正在处理…')} /> : null}
        {assist?.phase === 'error' ? <div className="nwb-form-error">{assist.error}</div> : null}
        {assist?.phase === 'done' && assist.result ? <div className="nwb-assist-result"><Markdown source={assist.result} /></div> : null}
        {assist?.phase === 'done' && assist.result && (assist.action === 'rewrite' || assist.action === 'expand')
          ? <div className="nwb-assist-format-hint">{t('替换会按 Markdown 源文定位；若选区跨过加粗、链接等格式，请先复制核对。')}</div>
          : null}
        {assist?.phase === 'done' && assist.result && (assist.action === 'rewrite' || assist.action === 'expand') && !(findSelectionRange(draftRef.current, assist.text) ?? assist.range)
          ? <div className="nwb-hint-box">{t('无法在 Markdown 中定位选区，请复制结果后手动替换。')}</div>
          : null}
      </Modal>
    </section>
  )
}
