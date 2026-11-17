import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  api, flattenChapters, normalizeClientWorkbench, type Bootstrap, type GitInfo, type TreeNode, type Work, type WorkState, type Workbench,
} from './api'
import { GitDialog } from './GitDialog'
import { Icon, WorkbenchIcon } from './icons'
import { LeftPanel } from './LeftPanel'
import { ToolsPanel } from './ToolsPanel'
import { WritingArea } from './WritingArea'
import { NodeCreateDialog, NewWorkDialog, WorkSettingsDialog, DeleteNodeDialog, RenameNodeDialog } from './WorkDialogs'
import { Button, EmptyState, Spinner, IconButton } from './ui'
import styles from './styles.css'

const WORK_KEY = 'dsh.novel-workbench.work.v1'
const MODE_KEY = 'dsh.novel-workbench.mode.v1'

type Mode = 'edit' | 'split' | 'preview'

function chapterKey(workId: string): string {
  return `dsh.novel-workbench.chapter.v1.${workId}`
}

function readStorage(key: string): string {
  try { return localStorage.getItem(key) ?? '' } catch { return '' }
}

function writeStorage(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* storage can be unavailable */ }
}

function remapPath(value: string | null, oldPath: string, newPath: string): string | null {
  if (!value) return value
  if (value === oldPath) return newPath
  if (value.startsWith(`${oldPath}/`)) return `${newPath}${value.slice(oldPath.length)}`
  return value
}

function countChapters(tree: TreeNode): number {
  return flattenChapters(tree).length
}

export function NovelWorkbench({ t }: { t: (key: string) => string }) {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null)
  const [bootLoading, setBootLoading] = useState(true)
  const [bootError, setBootError] = useState('')
  const [workState, setWorkState] = useState<WorkState | null>(null)
  const [workLoading, setWorkLoading] = useState(false)
  const [activePath, setActivePath] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState('')
  const [chapterLoading, setChapterLoading] = useState(false)
  const [chapterError, setChapterError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>(() => {
    const stored = readStorage(MODE_KEY)
    return stored === 'split' || stored === 'preview' ? stored : 'edit'
  })
  const [focusMode, setFocusMode] = useState(false)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [gitOpen, setGitOpen] = useState(false)
  const [newWorkOpen, setNewWorkOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [nodeDialog, setNodeDialog] = useState<{ kind: 'volume' | 'chapter'; parent: string } | null>(null)
  const [renameNode, setRenameNode] = useState<TreeNode | null>(null)
  const [deleteNode, setDeleteNode] = useState<TreeNode | null>(null)
  const [toast, setToast] = useState<{ message: string; tone: 'info' | 'success' | 'error' } | null>(null)

  const mountedRef = useRef(true)
  const requestRef = useRef(0)
  const chapterRequestRef = useRef(0)
  const workIdRef = useRef<string | null>(null)
  const pathRef = useRef<string | null>(null)
  const draftRef = useRef('')
  const savedRef = useRef('')
  const chapterErrorRef = useRef<string | null>(null)
  const workbenchRef = useRef<Workbench | null>(null)
  const workStateRef = useRef<WorkState | null>(null)
  const saveChainRef = useRef<Promise<boolean>>(Promise.resolve(true))
  const wbChainRef = useRef<Promise<void>>(Promise.resolve())
  const wbSavedJsonRef = useRef(new Map<string, string>())
  const wbTimerRef = useRef<number | null>(null)
  const wbPendingRef = useRef<{ workId: string; snapshot: string } | null>(null)
  const wbSaveErrorRef = useRef<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  useEffect(() => { draftRef.current = draft }, [draft])
  useEffect(() => { savedRef.current = saved }, [saved])
  useEffect(() => { pathRef.current = activePath }, [activePath])
  useEffect(() => { workbenchRef.current = workState?.workbench ?? null }, [workState?.workbench])
  useEffect(() => { workStateRef.current = workState }, [workState])

  const notify = useCallback((message: string, tone: 'info' | 'success' | 'error' = 'info') => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast({ message, tone })
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3800)
  }, [])

  const patchSummary = useCallback((workId: string, patch: Partial<Bootstrap['works'][number]>) => {
    setBootstrap(previous => previous
      ? { ...previous, works: previous.works.map(work => work.id === workId ? { ...work, ...patch } : work) }
      : previous)
  }, [])

  const summaryGit = (git: GitInfo) => ({
    available: git.available,
    branch: git.branch,
    dirty: git.dirty,
    changed: git.files.length,
    error: git.error,
  })

  const saveNow = useCallback((): Promise<boolean> => {
    const run = async (): Promise<boolean> => {
      const workId = workIdRef.current
      const path = pathRef.current
      const content = draftRef.current
      if (!workId || !path || content === savedRef.current) return true
      if (chapterErrorRef.current) return false
      if (!mountedRef.current) return false
      setSaveState('saving')
      try {
        const result = await api.saveChapter(workId, path, content)
        if (!mountedRef.current) return false
        if (pathRef.current === path && workIdRef.current === workId) {
          savedRef.current = content
          setSaved(content)
          setSavedAt(result.savedAt)
          setSaveState('saved')
          const nextWorkbench = workbenchRef.current
            ? {
              ...workbenchRef.current,
              chapterMeta: {
                ...workbenchRef.current.chapterMeta,
                [path]: { ...(workbenchRef.current.chapterMeta[path] ?? {}), words: result.words, updatedAt: result.savedAt },
              },
            }
            : null
          if (nextWorkbench) workbenchRef.current = nextWorkbench
          setWorkState(previous => previous && previous.work.id === workId
            ? {
              ...previous,
              git: result.git,
              workbench: nextWorkbench ?? previous.workbench,
            }
            : previous)
        }
        patchSummary(workId, {
          git: summaryGit(result.git),
          updatedAt: new Date().toISOString(),
        })
        return true
      } catch (error) {
        if (mountedRef.current && pathRef.current === path) setSaveState('error')
        notify(error instanceof Error ? error.message : String(error), 'error')
        return false
      }
    }
    const task = saveChainRef.current.then(run, run)
    saveChainRef.current = task
    return task
  }, [notify, patchSummary])

  const flushWorkbench = useCallback((): Promise<void> => {
    if (wbTimerRef.current) {
      window.clearTimeout(wbTimerRef.current)
      wbTimerRef.current = null
    }
    const pending = wbPendingRef.current
    if (!pending) return wbChainRef.current
    wbPendingRef.current = null
    wbChainRef.current = wbChainRef.current.then(async () => {
      if (wbSavedJsonRef.current.get(pending.workId) === pending.snapshot) return
      try {
        const result = await api.saveWorkbench(pending.workId, JSON.parse(pending.snapshot))
        wbSaveErrorRef.current = null
        wbSavedJsonRef.current.set(pending.workId, JSON.stringify(result.workbench))
        if (!mountedRef.current) return
        if (workIdRef.current === pending.workId) {
          const local = JSON.stringify(workbenchRef.current)
          if (local === pending.snapshot) {
            workbenchRef.current = result.workbench
            setWorkState(previous => previous && previous.work.id === pending.workId
              ? { ...previous, workbench: result.workbench, git: result.git }
              : previous)
          } else {
            setWorkState(previous => previous && previous.work.id === pending.workId
              ? { ...previous, git: result.git }
              : previous)
          }
          patchSummary(pending.workId, { git: summaryGit(result.git), updatedAt: new Date().toISOString() })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        wbSaveErrorRef.current = message
        if (mountedRef.current) notify(message, 'error')
      }
    })
    return wbChainRef.current
  }, [notify, patchSummary])

  const updateWorkbench = useCallback((updater: (current: Workbench) => Workbench, immediate = false) => {
    const current = workbenchRef.current
    const workId = workIdRef.current
    if (!current || !workId) return
    const next = updater(current)
    workbenchRef.current = next
    setWorkState(previous => previous && previous.work.id === workId ? { ...previous, workbench: next } : previous)
    wbPendingRef.current = { workId, snapshot: JSON.stringify(next) }
    if (wbTimerRef.current) window.clearTimeout(wbTimerRef.current)
    if (immediate) {
      void flushWorkbench()
    } else {
      wbTimerRef.current = window.setTimeout(() => { wbTimerRef.current = null; flushWorkbench() }, 750)
    }
  }, [flushWorkbench])

  const loadChapter = useCallback(async (workId: string, path: string | null) => {
    const request = ++chapterRequestRef.current
    if (!path) {
      setActivePath(null)
      pathRef.current = null
      setDraft('')
      setSaved('')
      draftRef.current = ''
      savedRef.current = ''
      setSavedAt(null)
      setSaveState('idle')
      setChapterLoading(false)
      setChapterError(null)
      chapterErrorRef.current = null
      return
    }
    setActivePath(path)
    pathRef.current = path
    setChapterLoading(true)
    setSaveState('idle')
    setChapterError(null)
    chapterErrorRef.current = null
    setDraft('')
    setSaved('')
    draftRef.current = ''
    savedRef.current = ''
    writeStorage(chapterKey(workId), path)
    try {
      const result = await api.readChapter(workId, path)
      if (!mountedRef.current || request !== chapterRequestRef.current || workIdRef.current !== workId) return
      setDraft(result.content)
      setSaved(result.content)
      draftRef.current = result.content
      savedRef.current = result.content
      setSavedAt(result.updatedAt)
      setSaveState('saved')
      setChapterError(null)
      chapterErrorRef.current = null
    } catch (error) {
      if (mountedRef.current && request === chapterRequestRef.current) {
        const message = error instanceof Error ? error.message : String(error)
        setSaveState('error')
        setChapterError(message)
        chapterErrorRef.current = message
        notify(message, 'error')
      }
    } finally {
      if (request === chapterRequestRef.current) setChapterLoading(false)
    }
  }, [notify])

  const openWork = useCallback(async (id: string, preferredPath?: string | null) => {
    const request = ++requestRef.current
    workIdRef.current = id
    setWorkLoading(true)
    setWorkState(null)
    setActivePath(null)
    pathRef.current = null
    setDraft('')
    setSaved('')
    draftRef.current = ''
    savedRef.current = ''
    setChapterLoading(false)
    setChapterError(null)
    chapterErrorRef.current = null
    try {
      const data = await api.loadWork(id)
      if (!mountedRef.current || request !== requestRef.current) return
      data.workbench = normalizeClientWorkbench(data.workbench)
      setWorkState(data)
      workStateRef.current = data
      workbenchRef.current = data.workbench
      wbSaveErrorRef.current = null
      wbSavedJsonRef.current.set(id, JSON.stringify(data.workbench))
      writeStorage(WORK_KEY, id)
      setWorkLoading(false)
      const chapters = flattenChapters(data.tree)
      const remembered = readStorage(chapterKey(id))
      const candidate = [preferredPath, remembered].find(path => path && chapters.some(chapter => chapter.path === path)) ?? chapters[0]?.path ?? null
      if (candidate) await loadChapter(id, candidate)
    } catch (error) {
      if (!mountedRef.current || request !== requestRef.current) return
      setWorkLoading(false)
      notify(error instanceof Error ? error.message : String(error), 'error')
    }
  }, [loadChapter, notify])

  const refreshBootstrap = useCallback(async (): Promise<Bootstrap | null> => {
    try {
      const data = await api.bootstrap()
      if (mountedRef.current) setBootstrap(data)
      return data
    } catch (error) {
      if (mountedRef.current) notify(error instanceof Error ? error.message : String(error), 'error')
      return null
    }
  }, [notify])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await api.bootstrap()
        if (cancelled) return
        setBootstrap(data)
        const remembered = readStorage(WORK_KEY)
        const id = data.works.some(work => work.id === remembered) ? remembered : data.defaultWorkId
        if (id) await openWork(id)
        if (!cancelled) setBootLoading(false)
      } catch (error) {
        if (cancelled) return
        setBootError(error instanceof Error ? error.message : String(error))
        setBootLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [openWork])

  useEffect(() => {
    if (!activePath || chapterLoading || chapterError || draft === saved) return undefined
    setSaveState('idle')
    const timer = window.setTimeout(() => { void saveNow() }, 950)
    return () => window.clearTimeout(timer)
  }, [activePath, chapterLoading, chapterError, draft, saved, saveNow])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (draftRef.current !== savedRef.current || wbPendingRef.current) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return
      flushWorkbench()
      if (draftRef.current !== savedRef.current) void saveNow()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [flushWorkbench, saveNow])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveNow()
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        setFocusMode(value => !value)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [saveNow])

  useEffect(() => {
    writeStorage(MODE_KEY, mode)
  }, [mode])

  useEffect(() => () => {
    if (wbTimerRef.current) window.clearTimeout(wbTimerRef.current)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
  }, [])

  const ensureSaved = useCallback(async (): Promise<boolean> => {
    if (draftRef.current === savedRef.current) return true
    return saveNow()
  }, [saveNow])

  const beforeNodeMutation = useCallback(async () => {
    await flushWorkbench()
    if (wbSaveErrorRef.current) throw new Error(wbSaveErrorRef.current)
    if (!(await ensureSaved())) throw new Error(t('保存失败'))
  }, [ensureSaved, flushWorkbench, t])

  const openNewWork = useCallback(async () => {
    await flushWorkbench()
    if (wbSaveErrorRef.current) { notify(wbSaveErrorRef.current, 'error'); return }
    if (await ensureSaved()) setNewWorkOpen(true)
  }, [ensureSaved, flushWorkbench, notify])

  const selectChapter = useCallback(async (path: string) => {
    if (path === pathRef.current && !chapterErrorRef.current) return
    await flushWorkbench()
    if (wbSaveErrorRef.current) { notify(wbSaveErrorRef.current, 'error'); return }
    const workId = workIdRef.current
    if (!workId) return
    if (!(await ensureSaved())) return
    await loadChapter(workId, path)
  }, [ensureSaved, flushWorkbench, loadChapter, notify])

  const selectWork = useCallback(async (id: string) => {
    if (id === workStateRef.current?.work.id) return
    await flushWorkbench()
    if (wbSaveErrorRef.current) { notify(wbSaveErrorRef.current, 'error'); return }
    if (!(await ensureSaved())) return
    requestRef.current += 1
    await openWork(id)
  }, [ensureSaved, flushWorkbench, notify, openWork])

  const applyMutation = useCallback((result: any) => {
    const workId = workIdRef.current
    if (!workId) return
    if (result.workbench) {
      result.workbench = normalizeClientWorkbench(result.workbench)
      workbenchRef.current = result.workbench
      wbSavedJsonRef.current.set(workId, JSON.stringify(result.workbench))
    }
    setWorkState(previous => {
      if (!previous || previous.work.id !== workId) return previous
      return {
        ...previous,
        tree: result.tree ?? previous.tree,
        workbench: result.workbench ?? previous.workbench,
        git: result.git ?? previous.git,
      }
    })
    const tree = result.tree ?? workStateRef.current?.tree
    patchSummary(workId, {
      ...(tree ? { chapterCount: countChapters(tree) } : {}),
      ...(result.git ? { git: summaryGit(result.git) } : {}),
      updatedAt: new Date().toISOString(),
    })
  }, [patchSummary])

  const handleCreatedNode = useCallback(async (result: any) => {
    applyMutation(result)
    setNodeDialog(null)
    if (result.kind === 'chapter' && result.created) {
      const workId = workIdRef.current
      if (workId && await ensureSaved()) await loadChapter(workId, result.created)
    }
  }, [applyMutation, ensureSaved, loadChapter])

  const handleRenamedNode = useCallback((result: any) => {
    applyMutation(result)
    setRenameNode(null)
    const nextPath = remapPath(pathRef.current, result.oldPath, result.newPath)
    if (nextPath && nextPath !== pathRef.current) {
      pathRef.current = nextPath
      setActivePath(nextPath)
      const workId = workIdRef.current
      if (workId) {
        writeStorage(chapterKey(workId), nextPath)
        if (nextPath.toLowerCase().endsWith('.md')) void loadChapter(workId, nextPath)
      }
    }
  }, [applyMutation, loadChapter])

  const handleMovedNode = useCallback((result: any) => {
    applyMutation(result)
    let nextPath = pathRef.current
    for (const [oldPath, newPath] of result.mappings ?? []) nextPath = remapPath(nextPath, oldPath, newPath)
    if (nextPath && nextPath !== pathRef.current) {
      pathRef.current = nextPath
      setActivePath(nextPath)
      const workId = workIdRef.current
      if (workId) {
        writeStorage(chapterKey(workId), nextPath)
        if (nextPath.toLowerCase().endsWith('.md')) void loadChapter(workId, nextPath)
      }
    }
  }, [applyMutation, loadChapter])

  const confirmDeleteNode = useCallback(async () => {
    const node = deleteNode
    const workId = workIdRef.current
    if (!node || !workId) return
    await flushWorkbench()
    if (!(await ensureSaved())) return
    try {
      const result = await api.deleteNode(workId, node.path)
      applyMutation(result)
      setDeleteNode(null)
      const nextActive = pathRef.current
      if (nextActive === result.deletedPath || (nextActive && nextActive.startsWith(`${result.deletedPath}/`))) {
        const first = flattenChapters(result.tree)[0]?.path ?? null
        await loadChapter(workId, first)
      }
      notify(t('已删除'), 'success')
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), 'error')
    }
  }, [applyMutation, deleteNode, ensureSaved, flushWorkbench, loadChapter, notify, t])

  const moveNode = useCallback(async (node: TreeNode, direction: 'up' | 'down') => {
    const workId = workIdRef.current
    if (!workId) return
    await flushWorkbench()
    if (!(await ensureSaved())) return
    try {
      const result = await api.moveNode(workId, node.path, direction)
      if (result.moved === false) return
      handleMovedNode(result)
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), 'error')
    }
  }, [ensureSaved, flushWorkbench, handleMovedNode, notify])

  const handleWorkSaved = useCallback((work: Work) => {
    setWorkState(previous => previous ? { ...previous, work } : previous)
    patchSummary(work.id, { title: work.title, author: work.author, genre: work.genre, description: work.description })
    notify(t('已保存'), 'success')
    void api.git(work.id).then((git) => {
      setWorkState(previous => previous && previous.work.id === work.id ? { ...previous, git } : previous)
      patchSummary(work.id, { git: summaryGit(git) })
    }).catch(() => { /* the Git panel reports the reason when opened */ })
  }, [notify, patchSummary, t])

  const handleWorkDeleted = useCallback(async () => {
    setWorkLoading(true)
    setWorkState(null)
    setActivePath(null)
    pathRef.current = null
    const data = await refreshBootstrap()
    const next = data?.works[0]
    if (next) await openWork(next.id)
    else setWorkLoading(false)
  }, [openWork, refreshBootstrap])

  const handleWorkCreated = useCallback(async (id: string) => {
    setNewWorkOpen(false)
    if (!(await ensureSaved())) return
    const data = await refreshBootstrap()
    if (data) await openWork(id)
  }, [ensureSaved, openWork, refreshBootstrap])

  const handleGitChange = useCallback((git: GitInfo) => {
    setWorkState(previous => previous ? { ...previous, git } : previous)
    const workId = workIdRef.current
    if (workId) patchSummary(workId, { git: summaryGit(git) })
  }, [patchSummary])

  const currentWork = workState?.work ?? null
  const chapters = useMemo(() => workState ? flattenChapters(workState.tree) : [], [workState?.tree])
  const activeChapterTitle = useMemo(() => chapters.find(chapter => chapter.path === activePath)?.title ?? '', [chapters, activePath])

  return (
    <div className={`nwb${focusMode ? ' is-focus' : ''}`}>
      <style>{styles}</style>
      <header className="nwb-topbar">
        <div className="nwb-brand">
          <span className="nwb-brand-mark"><WorkbenchIcon size={22} /></span>
          <span className="nwb-brand-name">{t('小说工作台')}</span>
        </div>
        {currentWork ? (
          <div className="nwb-top-work">
            <span className="nwb-top-work-title">{currentWork.title}</span>
            {currentWork.author ? <span className="nwb-top-work-author">{currentWork.author}</span> : null}
          </div>
        ) : null}
        <div className="nwb-top-spacer" />
        <div className="nwb-top-actions">
          <IconButton
            icon="book"
            label={t('作品管理')}
            active={!focusMode && leftOpen}
            onClick={() => {
              if (focusMode) { setFocusMode(false); setLeftOpen(true); setRightOpen(true) }
              else setLeftOpen(value => !value)
            }}
            size={16}
          />
          <IconButton
            icon="sparkle"
            label={t('工具区')}
            active={!focusMode && rightOpen}
            onClick={() => {
              if (focusMode) { setFocusMode(false); setLeftOpen(true); setRightOpen(true) }
              else setRightOpen(value => !value)
            }}
            size={16}
          />
          <button
            type="button"
            className={`nwb-git-chip${workState?.git?.dirty ? ' is-dirty' : ''}`}
            onClick={() => setGitOpen(true)}
            disabled={!workState}
            title={workState?.git?.available ? `${t('分支')} ${workState.git.branch}` : t('未初始化仓库')}
          >
            <Icon name="git" size={14} />
            <span>{workState?.git?.available ? workState.git.branch || 'git' : 'Git'}</span>
            {workState?.git?.dirty ? <i className="nwb-git-count-dot">{workState.git.files.length}</i> : null}
            {workState?.git?.available && !workState.git.dirty ? <Icon name="check" size={12} /> : null}
          </button>
          <IconButton icon="focus" label={focusMode ? t('退出专注') : t('专注模式')} active={focusMode} onClick={() => setFocusMode(value => !value)} size={16} />
          <IconButton icon="settings" label={t('作品设置')} onClick={() => setSettingsOpen(true)} disabled={!currentWork} size={16} />
        </div>
      </header>

      <div className="nwb-body">
        {!focusMode && leftOpen ? (
          <LeftPanel
            t={t}
            bootstrap={bootstrap}
            workState={workState}
            activePath={activePath}
            onSelectWork={selectWork}
            onNewWork={() => { void openNewWork() }}
            onWorkSettings={() => setSettingsOpen(true)}
            onSelectChapter={selectChapter}
            onAdd={(kind, parent) => setNodeDialog({ kind, parent })}
            onRename={node => setRenameNode(node)}
            onDelete={node => setDeleteNode(node)}
            onMove={moveNode}
          />
        ) : null}

        {bootLoading ? (
          <main className="nwb-center nwb-center-state"><Spinner label={t('正在加载作品库…')} /></main>
        ) : bootError ? (
          <main className="nwb-center nwb-center-state">
            <EmptyState
              icon="warning"
              title={t('连接失败')}
              text={bootError || t('无法连接到小说工作台的后端接口。确认插件已启用并刷新页面。')}
              action={<Button variant="primary" onClick={() => window.location.reload()}>{t('重试')}</Button>}
            />
          </main>
        ) : workLoading ? (
          <main className="nwb-center nwb-center-state"><Spinner label={t('正在打开作品…')} /></main>
        ) : workState ? (
          <WritingArea
            t={t}
            workState={workState}
            activePath={activePath}
            draft={draft}
            saved={saved}
            loading={chapterLoading}
            error={chapterError}
            saveState={saveState}
            savedAt={savedAt}
            mode={mode}
            onMode={setMode}
            onDraft={(value) => { setDraft(value); draftRef.current = value; if (value !== savedRef.current) setSaveState('idle') }}
            onSave={() => { void saveNow() }}
            onRetry={() => { if (workIdRef.current && pathRef.current) void loadChapter(workIdRef.current, pathRef.current) }}
            onToast={notify}
            onMeta={(patch) => {
              if (!activePath) return
              updateWorkbench(current => ({
                ...current,
                chapterMeta: { ...current.chapterMeta, [activePath]: { ...(current.chapterMeta[activePath] ?? {}), ...patch } },
              }), true)
            }}
          />
        ) : (
          <Welcome
            t={t}
            libraryRoot={bootstrap?.libraryRoot ?? ''}
            hasWorks={(bootstrap?.works.length ?? 0) > 0}
            onCreate={() => { void openNewWork() }}
            loading={workLoading}
          />
        )}

        {!focusMode && rightOpen ? (
          workState ? (
            <ToolsPanel
              t={t}
              workbench={workState.workbench}
              chapters={chapters}
              workTitle={workState.work.title}
              chapterTitle={activeChapterTitle}
              chapterText={draft}
              onChange={updateWorkbench}
              onToast={notify}
            />
          ) : (
            <aside className="nwb-right nwb-right-empty" aria-label={t('工具区')}>
              <div className="nwb-tools-empty"><Icon name="sparkle" size={20} /><span>{t('工具区')}</span></div>
            </aside>
          )
        ) : null}
      </div>

      <NewWorkDialog open={newWorkOpen} t={t} onClose={() => setNewWorkOpen(false)} onCreated={handleWorkCreated} />
      <WorkSettingsDialog
        open={settingsOpen}
        work={currentWork}
        t={t}
        onClose={() => setSettingsOpen(false)}
        beforeMutation={() => flushWorkbench()}
        onSaved={handleWorkSaved}
        onDeleted={() => { void handleWorkDeleted() }}
      />
      <NodeCreateDialog
        open={nodeDialog !== null}
        workId={currentWork?.id ?? ''}
        kind={nodeDialog?.kind ?? 'chapter'}
        parent={nodeDialog?.parent ?? 'manuscript'}
        tree={workState?.tree ?? null}
        t={t}
        beforeMutation={beforeNodeMutation}
        onClose={() => setNodeDialog(null)}
        onCreated={(result) => { void handleCreatedNode(result) }}
      />
      <RenameNodeDialog
        open={renameNode !== null}
        workId={currentWork?.id ?? ''}
        node={renameNode}
        t={t}
        beforeMutation={beforeNodeMutation}
        onClose={() => setRenameNode(null)}
        onRenamed={handleRenamedNode}
      />
      <DeleteNodeDialog
        open={deleteNode !== null}
        node={deleteNode}
        t={t}
        onClose={() => setDeleteNode(null)}
        onConfirm={confirmDeleteNode}
      />
      <GitDialog
        open={gitOpen}
        work={currentWork}
        git={workState?.git ?? null}
        t={t}
        onClose={() => setGitOpen(false)}
        beforeCommit={beforeNodeMutation}
        onGitChange={handleGitChange}
        onToast={notify}
      />

      {toast ? (
        <div className={`nwb-toast tone-${toast.tone}`} role="status">
          <Icon name={toast.tone === 'error' ? 'warning' : toast.tone === 'success' ? 'check' : 'sparkle'} size={15} />
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} aria-label={t('关闭')}><Icon name="close" size={12} /></button>
        </div>
      ) : null}
    </div>
  )
}

function Welcome({
  t, libraryRoot, hasWorks, onCreate, loading,
}: {
  t: (key: string) => string
  libraryRoot: string
  hasWorks: boolean
  onCreate: () => void
  loading: boolean
}) {
  return (
    <main className="nwb-center nwb-welcome">
      <div className="nwb-welcome-card">
        <div className="nwb-welcome-mark"><WorkbenchIcon size={42} /></div>
        <h1>{t('小说工作台')}</h1>
        <p>{t('三栏写作、Markdown 章节目录与 Git 版本历史，加上角色任务和故事看板。')}</p>
        {loading ? <Spinner label={t('正在打开作品…')} /> : (
          <Button variant="primary" onClick={onCreate}>
            <Icon name="plus" size={15} /> {hasWorks ? t('新建作品') : t('创建第一本作品')}
          </Button>
        )}
        <div className="nwb-welcome-features">
          <div><Icon name="edit" size={18} /><b>{t('写作区')}</b><span>{t('编辑、分栏与预览，自动保存到 Markdown。')}</span></div>
          <div><Icon name="git" size={18} /><b>{t('Markdown + Git')}</b><span>{t('每章一个文件，每次改动都能回溯。')}</span></div>
          <div><Icon name="sparkle" size={18} /><b>{t('故事看板')}</b><span>{t('角色目标、弧光、关系、地图、伏笔与剧情起伏。')}</span></div>
        </div>
        {libraryRoot ? <div className="nwb-welcome-path" title={libraryRoot}><Icon name="folder" size={13} /> {libraryRoot}</div> : null}
      </div>
    </main>
  )
}
