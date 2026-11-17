import React, { useEffect, useState } from 'react'
import { api, type GitInfo, type Work } from './api'
import { Badge, Button, EmptyState, IconButton, Modal, Spinner, TextInput } from './ui'
import { Icon } from './icons'

function statusLabel(status: string, t: (key: string) => string): string {
  if (status.includes('?')) return t('未跟踪')
  if (status.includes('A')) return t('新增')
  if (status.includes('D')) return t('删除')
  if (status.includes('R')) return t('重命名')
  if (status.includes('M')) return t('修改')
  return status || t('修改')
}

function statusTone(status: string): 'success' | 'danger' | 'brand' | 'neutral' {
  if (status.includes('A') || status.includes('?')) return 'success'
  if (status.includes('D')) return 'danger'
  if (status.includes('R')) return 'brand'
  return 'neutral'
}

export function GitDialog({
  open, work, git, t, onClose, beforeCommit, onGitChange, onToast,
}: {
  open: boolean
  work: Work | null
  git: GitInfo | null
  t: (key: string) => string
  onClose: () => void
  beforeCommit: () => Promise<void>
  onGitChange: (git: GitInfo) => void
  onToast: (message: string, tone?: 'info' | 'success' | 'error') => void
}) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [diff, setDiff] = useState<{ path: string; text: string } | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)

  useEffect(() => {
    if (!open || !work) return
    setMessage(`保存《${work.title}》的改动`)
    setDiff(null)
    setDiffLoading(false)
    setBusy(false)
    void api.git(work.id).then(onGitChange).catch((error) => {
      onToast(error instanceof Error ? error.message : String(error), 'error')
    })
  }, [open, work?.id, onGitChange, onToast])

  if (!work) return null

  const refresh = async () => {
    setRefreshing(true)
    try {
      const next = await api.git(work.id)
      onGitChange(next)
    } catch (error) {
      onToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setRefreshing(false)
    }
  }

  const commit = async () => {
    setBusy(true)
    try {
      await beforeCommit()
      const result = await api.commit(work.id, message.trim() || `保存《${work.title}》`)
      onGitChange(result.git)
      onToast(result.noop ? t('没有需要提交的改动') : t('提交成功'), result.noop ? 'info' : 'success')
    } catch (error) {
      onToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  const init = async () => {
    setBusy(true)
    try {
      await beforeCommit()
      const result = await api.initGit(work.id)
      onGitChange(result.git)
      onToast(t('已初始化 Git'), 'success')
    } catch (error) {
      onToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  const showDiff = async (path: string) => {
    setDiffLoading(true)
    try {
      const result = await api.diff(work.id, path)
      setDiff({ path: result.path, text: result.diff })
    } catch (error) {
      onToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setDiffLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title={t('Git')}
      subtitle={work.title}
      onClose={onClose}
      width={760}
      footer={(
        <>
          <div className="nwb-modal-foot-left">
            <Button variant="ghost" onClick={refresh} disabled={refreshing}>
              <Icon name="refresh" size={14} /> {t('刷新')}
            </Button>
          </div>
          <Button variant="ghost" onClick={onClose}>{t('关闭')}</Button>
          {git?.available ? <Button variant="primary" onClick={commit} disabled={busy || !git.dirty}>{busy ? t('保存中…') : t('提交')}</Button> : null}
        </>
      )}
    >
      {!git ? (
        <Spinner label={t('加载中…')} />
      ) : !git.available ? (
        <EmptyState
          icon="git"
          title={t('未初始化仓库')}
          text={git.error || t('初始化后，保存的章节会进入版本历史。')}
          action={<Button variant="primary" onClick={init} disabled={busy}>{t('初始化 Git')}</Button>}
        />
      ) : diff ? (
        <div className="nwb-diff-view">
          <div className="nwb-diff-head">
            <Button variant="ghost" size="sm" onClick={() => setDiff(null)}><Icon name="back" size={14} /> {t('返回')}</Button>
            <span className="nwb-mono">{diff.path}</span>
          </div>
          {diffLoading ? <Spinner label={t('加载中…')} /> : (
            <pre className="nwb-diff">
              {diff.text.split('\n').map((line, index) => (
                <span key={index} className={line.startsWith('+') && !line.startsWith('+++') ? 'is-add' : line.startsWith('-') && !line.startsWith('---') ? 'is-del' : line.startsWith('@@') ? 'is-hunk' : ''}>
                  {line || ' '}
                  {'\n'}
                </span>
              ))}
            </pre>
          )}
        </div>
      ) : (
        <div className="nwb-git-body">
          <div className="nwb-git-status">
            <div className="nwb-git-branch">
              <Icon name="git" size={15} />
              <span>{t('分支')}</span>
              <b>{git.branch || '—'}</b>
              {git.dirty ? <Badge tone="warn">{t('有未提交改动')}</Badge> : <Badge tone="success">{t('工作区干净')}</Badge>}
            </div>
            <div className="nwb-git-count">{git.files.length} {t('修改')}</div>
          </div>

          <div className="nwb-git-commit-row">
            <TextInput
              value={message}
              onChange={event => setMessage(event.target.value)}
              onKeyDown={(event) => { if (!event.nativeEvent.isComposing && event.key === 'Enter' && git.dirty && !busy) void commit() }}
              placeholder={t('提交信息')}
            />
            <Button variant="primary" onClick={commit} disabled={busy || !git.dirty}>{busy ? t('保存中…') : t('提交改动')}</Button>
          </div>

          <div className="nwb-git-grid">
            <div>
              <div className="nwb-subhead">{t('修改')} · {git.files.length}</div>
              {git.files.length === 0 ? (
                <div className="nwb-hint-box">{t('工作区干净')}。{t('保存')}章节后会出现改动。</div>
              ) : (
                <div className="nwb-file-list">
                  {git.files.map(file => (
                    <button key={`${file.status}-${file.path}`} className="nwb-file-row" onClick={() => { void showDiff(file.path) }}>
                      <Badge tone={statusTone(file.status)}>{statusLabel(file.status, t)}</Badge>
                      <span className="nwb-file-path" title={file.path}>{file.path}</span>
                      <Icon name="chevron" size={12} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="nwb-subhead">{t('最近提交')}</div>
              {git.log.length === 0 ? (
                <div className="nwb-hint-box">{t('没有提交记录')}</div>
              ) : (
                <div className="nwb-commit-list">
                  {git.log.map(commit => (
                    <div key={commit.hash} className="nwb-commit-row">
                      <span className="nwb-commit-hash">{commit.hash}</span>
                      <span className="nwb-commit-subject">{commit.subject}</span>
                      <span className="nwb-commit-date">{commit.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {diffLoading ? <div className="nwb-git-loading"><Spinner label={t('加载中…')} /></div> : null}
        </div>
      )}
    </Modal>
  )
}
