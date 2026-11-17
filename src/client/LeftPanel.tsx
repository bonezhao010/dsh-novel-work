import React from 'react'
import type { Bootstrap, TreeNode, WorkState } from './api'
import { Icon } from './icons'
import { Button, IconButton } from './ui'
import { ChapterTree } from './ChapterTree'

export function LeftPanel({
  t, bootstrap, workState, activePath, onSelectWork, onNewWork, onWorkSettings,
  onSelectChapter, onAdd, onRename, onDelete, onMove,
}: {
  t: (key: string) => string
  bootstrap: Bootstrap | null
  workState: WorkState | null
  activePath: string | null
  onSelectWork: (id: string) => void
  onNewWork: () => void
  onWorkSettings: () => void
  onSelectChapter: (path: string) => void
  onAdd: (kind: 'volume' | 'chapter', parent: string) => void
  onRename: (node: TreeNode) => void
  onDelete: (node: TreeNode) => void
  onMove: (node: TreeNode, direction: 'up' | 'down') => void
}) {
  const works = bootstrap?.works ?? []
  return (
    <aside className="nwb-left" aria-label={t('作品管理')}>
      <div className="nwb-left-section nwb-works-section">
        <div className="nwb-section-head">
          <div className="nwb-section-title">
            <Icon name="book" size={14} />
            <span>{t('作品库')}</span>
            {works.length > 0 ? <span className="nwb-count">{works.length}</span> : null}
          </div>
          <div className="nwb-section-actions">
            {workState ? <IconButton icon="settings" label={t('作品设置')} onClick={onWorkSettings} size={15} /> : null}
            <IconButton icon="plus" label={t('新建作品')} onClick={onNewWork} size={15} />
          </div>
        </div>

        {works.length === 0 ? (
          <div className="nwb-works-empty">
            <div>{t('没有找到作品')}</div>
            <Button size="sm" variant="primary" onClick={onNewWork}><Icon name="plus" size={13} /> {t('创建第一本作品')}</Button>
          </div>
        ) : (
          <div className="nwb-work-list">
            {works.map(work => (
              <button
                key={work.id}
                className={`nwb-work-row${work.id === workState?.work.id ? ' is-active' : ''}`}
                onClick={() => onSelectWork(work.id)}
                title={work.title}
              >
                <span className="nwb-work-spine" style={{ background: workSpine(work.id) }} />
                <span className="nwb-work-body">
                  <span className="nwb-work-title">{work.title}</span>
                  <span className="nwb-work-meta">
                    {t('共 {n} 章').replace('{n}', String(work.chapterCount))}
                    {work.git?.dirty ? <i className="nwb-dirty-dot" title={t('有未提交改动')} /> : null}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="nwb-left-section nwb-tree-section">
        <div className="nwb-section-head">
          <div className="nwb-section-title">
            <Icon name="file" size={14} />
            <span>{t('章节目录')}</span>
          </div>
          <div className="nwb-section-actions">
            <IconButton icon="folder" label={t('新建卷')} onClick={() => onAdd('volume', 'manuscript')} size={15} disabled={!workState} />
            <IconButton icon="plus" label={t('新建章节')} onClick={() => onAdd('chapter', 'manuscript')} size={15} disabled={!workState} />
          </div>
        </div>
        <div className="nwb-tree-scroll">
          {workState ? (
            <ChapterTree
              key={workState.work.id}
              t={t}
              tree={workState.tree}
              activePath={activePath}
              chapterMeta={workState.workbench.chapterMeta}
              onSelect={onSelectChapter}
              onAdd={onAdd}
              onRename={onRename}
              onDelete={onDelete}
              onMove={onMove}
            />
          ) : (
            <div className="nwb-tree-loading">{bootstrap ? t('加载中…') : t('正在加载作品库…')}</div>
          )}
        </div>
      </div>

      <div className="nwb-left-foot">
        <div className="nwb-left-foot-main">
          <span className="nwb-file-badge">MD</span>
          <span>{t('正文以 Markdown 保存')}</span>
        </div>
        {bootstrap?.libraryRoot ? (
          <div className="nwb-library-path" title={bootstrap.libraryRoot}>{bootstrap.libraryRoot}</div>
        ) : null}
      </div>
    </aside>
  )
}

function workSpine(id: string): string {
  const colors = [
    'linear-gradient(180deg, #3b6ea5, #2a4d72)',
    'linear-gradient(180deg, #b0764d, #7a4e33)',
    'linear-gradient(180deg, #5f8a73, #3f6352)',
    'linear-gradient(180deg, #8a6a9e, #634a75)',
    'linear-gradient(180deg, #a05e5e, #703f3f)',
  ]
  let hash = 0
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) >>> 0
  return colors[hash % colors.length]
}
