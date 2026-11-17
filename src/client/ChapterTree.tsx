import React, { useEffect, useRef, useState } from 'react'
import type { TreeNode } from './api'
import { Icon } from './icons'
import { Button, useOutsideClick } from './ui'

interface TreeMenu {
  node: TreeNode
  top: number
  right: number
}

export function ChapterTree({
  t, tree, activePath, chapterMeta, onSelect, onAdd, onRename, onDelete, onMove,
}: {
  t: (key: string) => string
  tree: TreeNode
  activePath: string | null
  chapterMeta: Record<string, any>
  onSelect: (path: string) => void
  onAdd: (kind: 'volume' | 'chapter', parent: string) => void
  onRename: (node: TreeNode) => void
  onDelete: (node: TreeNode) => void
  onMove: (node: TreeNode, direction: 'up' | 'down') => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [menu, setMenu] = useState<TreeMenu | null>(null)
  const menuRef = useOutsideClick<HTMLDivElement>(() => setMenu(null), menu !== null)
  const seen = useRef<Set<string>>(new Set())

  useEffect(() => {
    const volumes: string[] = []
    const walk = (node: TreeNode) => {
      for (const child of node.children ?? []) {
        if (child.type === 'volume') {
          volumes.push(child.path)
          walk(child)
        }
      }
    }
    walk(tree)
    setExpanded(current => {
      const next = new Set(current)
      let changed = false
      for (const path of volumes) {
        if (!seen.current.has(path)) {
          seen.current.add(path)
          next.add(path)
          changed = true
        }
      }
      return changed ? next : current
    })
  }, [tree])

  const toggle = (path: string) => {
    setExpanded(current => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const countChapters = (node: TreeNode): number => (node.children ?? []).reduce((total, child) => {
    if (child.type === 'chapter') return total + 1
    return total + countChapters(child)
  }, 0)

  const allChapters = (node: TreeNode): number => (node.type === 'chapter' ? 1 : countChapters(node))

  const statusTone = (status?: string) => {
    if (status === '已完成') return 'done'
    if (status === '修改中') return 'revising'
    if (status === '大纲') return 'outline'
    return 'draft'
  }

  useEffect(() => {
    if (!menu) return undefined
    const timer = window.setTimeout(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [menu, menuRef])

  const openMenu = (node: TreeNode, event: React.MouseEvent<HTMLButtonElement>) => {
    if (menu?.node.path === node.path) { setMenu(null); return }
    const button = event.currentTarget
    const rect = button.getBoundingClientRect()
    const host = button.closest('.nwb')?.getBoundingClientRect()
    const contained = host ? getComputedStyle(button.closest('.nwb') as Element).containerType !== 'normal' : false
    const hostTop = contained && host ? host.top : 0
    const hostRight = contained && host ? host.right : window.innerWidth
    const hostBottom = contained && host ? host.bottom : window.innerHeight
    const right = Math.max(8, hostRight - rect.right)
    const top = Math.min(Math.max(8, (hostBottom - hostTop) - 196), Math.max(8, rect.bottom - hostTop + 4))
    setMenu({ node, top, right })
  }

  const closeMenu = () => setMenu(null)

  const renderNode = (node: TreeNode, depth: number) => {
    if (node.type === 'volume') {
      const isOpen = expanded.has(node.path)
      return (
        <div key={node.path} className="nwb-tree-branch">
          <NodeRow
            node={node}
            depth={depth}
            isOpen={isOpen}
            count={allChapters(node)}
            status={undefined}
            active={false}
            onMenu={openMenu}
            onToggle={() => toggle(node.path)}
            onSelect={() => toggle(node.path)}
            onAdd={onAdd}
            t={t}
          />
          {isOpen ? (
            <div className="nwb-tree-children">
              {(node.children ?? []).length === 0 ? (
                <div className="nwb-tree-empty">{t('空卷')} · <button onClick={() => onAdd('chapter', node.path)}>{t('添加章节')}</button></div>
              ) : (node.children ?? []).map(child => renderNode(child, depth + 1))}
            </div>
          ) : null}
        </div>
      )
    }
    return (
      <NodeRow
        key={node.path}
        node={node}
        depth={depth}
        isOpen={false}
        count={0}
        status={statusTone(chapterMeta[node.path]?.status)}
        active={activePath === node.path}
        onMenu={openMenu}
        onToggle={() => onSelect(node.path)}
        onSelect={() => onSelect(node.path)}
        onAdd={onAdd}
        t={t}
      />
    )
  }

  const children = tree.children ?? []
  if (children.length === 0) {
    return (
      <div className="nwb-tree nwb-tree-empty-root">
        <div className="nwb-tree-empty-copy">{t('还没有章节')}<br />{t('在工作台里新建第一卷和第一章。')}</div>
        <div className="nwb-tree-empty-actions">
          <Button size="sm" onClick={() => onAdd('volume', 'manuscript')}><Icon name="plus" size={13} /> {t('新建卷')}</Button>
          <Button size="sm" onClick={() => onAdd('chapter', 'manuscript')}><Icon name="plus" size={13} /> {t('新建章节')}</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="nwb-tree">
      {children.map(node => renderNode(node, 0))}
      {menu ? (
        <div
          ref={menuRef}
          className="nwb-row-menu nwb-row-menu-fixed"
          style={{ top: menu.top, right: menu.right }}
          role="menu"
        >
          {menu.node.type === 'volume' ? (
            <button role="menuitem" onClick={() => { closeMenu(); onAdd('chapter', menu.node.path) }}><Icon name="plus" size={13} /> {t('新建章节')}</button>
          ) : null}
          <button role="menuitem" onClick={() => { closeMenu(); onRename(menu.node) }}><Icon name="edit" size={13} /> {t('重命名')}</button>
          <button role="menuitem" onClick={() => { closeMenu(); onMove(menu.node, 'up') }}><Icon name="up" size={13} /> {t('上移')}</button>
          <button role="menuitem" onClick={() => { closeMenu(); onMove(menu.node, 'down') }}><Icon name="down" size={13} /> {t('下移')}</button>
          <div className="nwb-menu-sep" />
          <button role="menuitem" className="is-danger" onClick={() => { closeMenu(); onDelete(menu.node) }}><Icon name="trash" size={13} /> {t('删除')}</button>
        </div>
      ) : null}
    </div>
  )
}

function NodeRow({
  node, depth, isOpen, count, status, active, onMenu, onToggle, onSelect, onAdd, t,
}: {
  node: TreeNode
  depth: number
  isOpen: boolean
  count: number
  status?: string
  active: boolean
  onMenu: (node: TreeNode, event: React.MouseEvent<HTMLButtonElement>) => void
  onToggle: () => void
  onSelect: () => void
  onAdd: (kind: 'volume' | 'chapter', parent: string) => void
  t: (key: string) => string
}) {
  const isVolume = node.type === 'volume'
  return (
    <div
      className={`nwb-tree-row${active ? ' is-active' : ''}${isVolume ? ' is-volume' : ''}`}
      style={{ paddingLeft: 8 + depth * 14 }}
    >
      <button
        type="button"
        className="nwb-tree-main"
        onClick={isVolume ? onToggle : onSelect}
        title={node.title}
      >
        {isVolume ? (
          <span className={`nwb-tree-chevron${isOpen ? ' is-open' : ''}`}><Icon name="chevron" size={12} /></span>
        ) : (
          <span className={`nwb-tree-status status-${status ?? 'draft'}`} title={t(status === 'done' ? '已完成' : status === 'revising' ? '修改中' : status === 'outline' ? '大纲' : '草稿')} />
        )}
        {isVolume ? <Icon name="folder" size={14} /> : <Icon name="file" size={13} />}
        <span className="nwb-tree-title">{node.title}</span>
        {isVolume ? <span className="nwb-tree-count">{count}</span> : null}
      </button>
      <div className="nwb-tree-actions">
        {isVolume ? (
          <button type="button" className="nwb-tree-action" title={t('在下方添加章节')} onClick={() => onAdd('chapter', node.path)}>
            <Icon name="plus" size={13} />
          </button>
        ) : null}
        <button
          type="button"
          className="nwb-tree-action"
          title={t('更多')}
          aria-label={t('更多')}
          onClick={event => onMenu(node, event)}
        >
          <Icon name="dots" size={14} />
        </button>
      </div>
    </div>
  )
}
