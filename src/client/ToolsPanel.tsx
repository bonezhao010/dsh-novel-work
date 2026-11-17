import React, { useEffect, useState } from 'react'
import type { IconName } from './icons'
import { Icon } from './icons'
import type { Workbench } from './api'
import { ArcPanel } from './panels/ArcPanel'
import { CharactersPanel } from './panels/CharactersPanel'
import { EventsPanel } from './panels/EventsPanel'
import { ForeshadowPanel } from './panels/ForeshadowPanel'
import { HooksPanel } from './panels/HooksPanel'
import { ItemsPanel } from './panels/ItemsPanel'
import { MapPanel } from './panels/MapPanel'
import { PlotlinesPanel } from './panels/PlotlinesPanel'
import { QuestsPanel } from './panels/QuestsPanel'
import { RelationshipsPanel } from './panels/RelationshipsPanel'
import { TensionPanel } from './panels/TensionPanel'
import { BoardAIDialog } from './BoardAIDialog'
import { Button } from './ui'
import type { ChapterRef } from './panels/types'

const TOOLS: { id: string; label: string; icon: IconName }[] = [
  { id: 'characters', label: '人物', icon: 'users' },
  { id: 'quests', label: '任务', icon: 'quest' },
  { id: 'arc', label: '弧光', icon: 'arc' },
  { id: 'map', label: '地图', icon: 'map' },
  { id: 'events', label: '事件', icon: 'event' },
  { id: 'relations', label: '关系', icon: 'relation' },
  { id: 'items', label: '道具', icon: 'item' },
  { id: 'plots', label: '明暗线', icon: 'plot' },
  { id: 'foreshadow', label: '伏笔', icon: 'foreshadow' },
  { id: 'tension', label: '起伏', icon: 'tension' },
  { id: 'hooks', label: '钩子', icon: 'hook' },
]

const STORAGE_KEY = 'dsh.novel-workbench.tool.v1'

export function ToolsPanel({
  t, workbench, chapters, workTitle, chapterTitle, chapterText, onChange, onToast,
}: {
  t: (key: string) => string
  workbench: Workbench
  chapters: ChapterRef[]
  workTitle: string
  chapterTitle: string
  chapterText: string
  onChange: (updater: (current: Workbench) => Workbench, immediate?: boolean) => void
  onToast: (message: string, tone?: 'info' | 'success' | 'error') => void
}) {
  const [aiOpen, setAiOpen] = useState(false)
  const [active, setActive] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'characters' } catch { return 'characters' }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, active) } catch { /* storage can be unavailable */ }
  }, [active])

  const props = { t, workbench, chapters, onChange, onToast }
  const panel = active === 'characters' ? <CharactersPanel {...props} />
    : active === 'quests' ? <QuestsPanel {...props} />
      : active === 'arc' ? <ArcPanel {...props} />
      : active === 'map' ? <MapPanel {...props} />
        : active === 'events' ? <EventsPanel {...props} />
          : active === 'relations' ? <RelationshipsPanel {...props} />
            : active === 'items' ? <ItemsPanel {...props} />
              : active === 'plots' ? <PlotlinesPanel {...props} />
                : active === 'foreshadow' ? <ForeshadowPanel {...props} />
                  : active === 'tension' ? <TensionPanel {...props} />
                    : <HooksPanel {...props} />

  return (
    <aside className="nwb-right" aria-label={t('工具区')}>
      <div className="nwb-tools-top">
        <div className="nwb-tools-heading">
          <div className="nwb-tools-heading-main">
            <span>{t('工具区')}</span>
            <span className="nwb-muted">{t('故事工作台')}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setAiOpen(true)} title={t('AI 更新看板')}>
            <Icon name="sparkle" size={13} /> {t('AI 更新')}
          </Button>
        </div>
        <div className="nwb-tool-tabs" role="tablist" aria-label={t('工具区')}>
          {TOOLS.map(tool => (
            <button
              key={tool.id}
              role="tab"
              aria-selected={active === tool.id}
              className={active === tool.id ? 'is-active' : ''}
              onClick={() => setActive(tool.id)}
              title={t(tool.label)}
            >
              <Icon name={tool.icon} size={15} />
              <span>{t(tool.label)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="nwb-tools-scroll" role="tabpanel">
        {panel}
      </div>
      <BoardAIDialog
        open={aiOpen}
        t={t}
        workbench={workbench}
        chapters={chapters}
        activeTool={active}
        workTitle={workTitle}
        chapterTitle={chapterTitle}
        chapterText={chapterText}
        onClose={() => setAiOpen(false)}
        onChange={onChange}
        onToast={onToast}
      />
    </aside>
  )
}
