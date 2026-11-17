import React from 'react'
import { api, type TreeNode, type Work, type WorkState } from './api'
import { EntityForm, type FormField } from './EntityForm'
import { Button, ConfirmButton, Modal } from './ui'

export function NewWorkDialog({
  open, t, onClose, onCreated,
}: {
  open: boolean
  t: (key: string) => string
  onClose: () => void
  onCreated: (workId: string) => void
}) {
  const fields: FormField[] = [
    { key: 'title', label: t('标题'), required: true, placeholder: t('未命名') },
    { key: 'author', label: t('作者'), placeholder: t('作者') },
    { key: 'genre', label: t('题材'), placeholder: t('悬疑 / 海港') },
    { key: 'logline', label: t('一句话简介'), placeholder: t('一句话简介') },
    { key: 'description', label: t('作品简介'), type: 'textarea', rows: 4 },
  ]
  return (
    <EntityForm
      open={open}
      title={t('新建作品')}
      subtitle={t('创建第一本作品')}
      fields={fields}
      initial={{}}
      onClose={onClose}
      onSubmit={async (values) => {
        const result = await api.createWork(values)
        onCreated(result.work.id)
        onClose()
      }}
      t={t}
    />
  )
}

export function WorkSettingsDialog({
  open, work, t, onClose, beforeMutation, onSaved, onDeleted,
}: {
  open: boolean
  work: Work | null
  t: (key: string) => string
  onClose: () => void
  beforeMutation: () => Promise<void>
  onSaved: (work: Work) => void
  onDeleted: () => void
}) {
  if (!work) return null
  const fields: FormField[] = [
    { key: 'title', label: t('标题'), required: true },
    { key: 'author', label: t('作者') },
    { key: 'genre', label: t('题材') },
    { key: 'logline', label: t('一句话简介') },
    { key: 'description', label: t('作品简介'), type: 'textarea', rows: 5 },
  ]
  return (
    <EntityForm
      open={open}
      title={t('作品设置')}
      subtitle={work.title}
      fields={fields}
      initial={work}
      onClose={onClose}
      onSubmit={async (values) => {
        await beforeMutation()
        const result = await api.updateWork(work.id, values)
        onSaved(result.work)
        onClose()
      }}
      onDelete={async () => {
        await beforeMutation()
        await api.deleteWork(work.id)
        onDeleted()
        onClose()
      }}
      t={t}
      width={600}
    />
  )
}

export function NodeCreateDialog({
  open, workId, kind, parent, tree, t, onClose, beforeMutation, onCreated,
}: {
  open: boolean
  workId: string
  kind: 'volume' | 'chapter'
  parent: string
  tree: TreeNode | null
  t: (key: string) => string
  onClose: () => void
  beforeMutation: () => Promise<void>
  onCreated: (result: any) => void
}) {
  const volumes = (tree?.children ?? []).filter(node => node.type === 'volume')
  const fields: FormField[] = [
    { key: 'title', label: kind === 'volume' ? t('输入卷名') : t('输入章节标题'), required: true, placeholder: t('未命名') },
    ...(kind === 'chapter' ? [{
      key: 'parent',
      label: t('所属卷'),
      type: 'select' as const,
      options: [{ value: 'manuscript', label: t('根目录') }, ...volumes.map(node => ({ value: node.path, label: node.title ?? node.path }))],
    }] : []),
  ]
  return (
    <EntityForm
      open={open}
      title={kind === 'volume' ? t('新建卷') : t('新建章节')}
      fields={fields}
      initial={kind === 'chapter' ? { parent: parent || 'manuscript' } : {}}
      onClose={onClose}
      onSubmit={async (values) => {
        await beforeMutation()
        const result = await api.createNode(
          workId,
          { kind, parent: values.parent ?? parent ?? 'manuscript', title: values.title },
        )
        onCreated(result)
        onClose()
      }}
      t={t}
    />
  )
}


export function RenameNodeDialog({
  open, workId, node, t, onClose, beforeMutation, onRenamed,
}: {
  open: boolean
  workId: string
  node: TreeNode | null
  t: (key: string) => string
  onClose: () => void
  beforeMutation: () => Promise<void>
  onRenamed: (result: any) => void
}) {
  if (!node) return null
  return (
    <EntityForm
      open={open}
      title={t('重命名')}
      subtitle={node.title}
      fields={[{ key: 'title', label: t('标题'), required: true }]}
      initial={{ title: node.title ?? '' }}
      onClose={onClose}
      onSubmit={async (values) => {
        await beforeMutation()
        const result = await api.renameNode(workId, node.path, values.title)
        onRenamed(result)
        onClose()
      }}
      t={t}
    />
  )
}

export function DeleteNodeDialog({
  open, node, t, onClose, onConfirm,
}: {
  open: boolean
  node: TreeNode | null
  t: (key: string) => string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  return (
    <Modal
      open={open}
      title={t('确认删除')}
      subtitle={node?.title}
      onClose={onClose}
      width={440}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>{t('取消')}</Button>
          <ConfirmButton confirmLabel={t('再次点击确认')} onConfirm={() => { void onConfirm() }}>{t('删除')}</ConfirmButton>
        </>
      )}
    >
      <div className="nwb-confirm-copy">
        {t('删除后文件会移入作品库的 .trash 目录，可从那里找回。')}
      </div>
    </Modal>
  )
}
