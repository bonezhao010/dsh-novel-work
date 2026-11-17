import React from 'react'
import { NovelWorkbench } from './NovelWorkbench'
import { WorkbenchIcon } from './icons'
import { en, NS, zh } from './locale'

export const inject = ['slots', 'locale']

/** The id shared by the sidebar entry and the main panel it opens. */
const PANEL_ID = 'novel-workbench'

function PanelIcon({ size }: { size: number }) {
  return <WorkbenchIcon size={size} />
}

export function apply(ctx: any): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'novel-workbench: dictionaries')
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
    locale: NS,
  }, NovelWorkbench))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 20,
    label: () => t('小说工作台'),
    locale: NS,
  }, PanelIcon))
}
