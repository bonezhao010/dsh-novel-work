import React from 'react'

export type IconName =
  | 'book' | 'plus' | 'chevron' | 'chevronDown' | 'save' | 'edit' | 'preview' | 'split'
  | 'focus' | 'git' | 'users' | 'arc' | 'map' | 'event' | 'relation' | 'item' | 'plot'
  | 'foreshadow' | 'tension' | 'hook' | 'dots' | 'trash' | 'up' | 'down' | 'close'
  | 'check' | 'warning' | 'refresh' | 'commit' | 'folder' | 'file' | 'back' | 'settings'
  | 'external' | 'clock' | 'sparkle' | 'link' | 'pin' | 'quest' | 'search'

const paths: Record<IconName, React.ReactNode> = {
  book: <><path d="M4 4.5h5.2c1 0 1.8.8 1.8 1.8v10.2c0-1-.8-1.8-1.8-1.8H4V4.5Z" /><path d="M16 4.5h-3.2c-1 0-1.8.8-1.8 1.8v10.2c0-1 .8-1.8 1.8-1.8H16V4.5Z" /><path d="M4 16.5h5.2c1 0 1.8-.8 1.8-1.8M16 16.5h-3.2c-1 0-1.8-.8-1.8-1.8" /></>,
  plus: <path d="M10 4v12M4 10h12" />,
  chevron: <path d="m7.5 4.5 5 5.5-5 5.5" />,
  chevronDown: <path d="m4.5 7.5 5.5 5 5.5-5" />,
  save: <><path d="M4 3.5h9.5L16.5 6.5V16.5H4V3.5Z" /><path d="M7 3.5v5h6v-5M7 16.5v-5h6v5" /></>,
  edit: <><path d="m12.8 3.8 3.4 3.4L7 16.4l-4 1 1-4L12.8 3.8Z" /><path d="m11.2 5.4 3.4 3.4" /></>,
  preview: <><path d="M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5Z" /><circle cx="10" cy="10" r="2.2" /></>,
  split: <><rect x="3" y="4" width="14" height="12" rx="1.5" /><path d="M10 4v12" /></>,
  focus: <><path d="M3.5 7V4.5H6M14 4.5h2.5V7M16.5 13v2.5H14M6 16.5H3.5V14" /><circle cx="10" cy="10" r="2.4" /></>,
  git: <><circle cx="6" cy="5" r="2" /><circle cx="6" cy="15" r="2" /><circle cx="14" cy="8" r="2" /><path d="M6 7v6M8 8h4M12 9.5c-1.2 1-2 1.5-3 1.5" /></>,
  users: <><circle cx="8" cy="7" r="2.6" /><path d="M2.8 16c.4-2.7 2.4-4.3 5.2-4.3s4.8 1.6 5.2 4.3" /><circle cx="14.2" cy="7.6" r="2.1" /><path d="M13 11.9c2.4.1 4 1.5 4.4 3.8" /></>,
  arc: <><path d="M3 16c1.5-6.2 4-9.8 7-9.8S15.5 9.8 17 16" /><path d="M3 16h14" /><circle cx="6" cy="12" r="1" /><circle cx="10" cy="7.4" r="1" /><circle cx="15" cy="12" r="1" /></>,
  map: <><path d="m3 5 4.5-1.5 5 1.5L17 3.5v11L12.5 16l-5-1.5L3 16V5Z" /><path d="M7.5 3.5v11M12.5 5v11" /></>,
  event: <><rect x="3" y="4.5" width="14" height="12" rx="1.5" /><path d="M3 8h14M6.5 2.8v3.4M13.5 2.8v3.4" /><path d="M6.5 11h2M11 11h2M6.5 13.8h2" /></>,
  relation: <><circle cx="5" cy="6" r="2" /><circle cx="15" cy="7" r="2" /><circle cx="10" cy="15" r="2" /><path d="m6.6 7 2.6 6M13.6 8.2l-2.6 4.7M7 6h6" /></>,
  item: <><path d="m10 2.8 6 3.2v7.8l-6 3.4-6-3.4V6L10 2.8Z" /><path d="m4 6 6 3.4L16 6M10 9.4v7.8" /></>,
  plot: <><path d="M4 16.5V4M4 15h12" /><path d="M6 12.5 9.5 9l2.5 2 4-5" /><circle cx="9.5" cy="9" r="1" /><circle cx="12" cy="11" r="1" /></>,
  foreshadow: <><path d="M10 2.8V6M10 14v3.2M3.2 10H6M14 10h2.8M5.2 5.2l2 2M12.8 12.8l2 2M5.2 14.8l2-2M12.8 7.2l2-2" /><circle cx="10" cy="10" r="3" /></>,
  tension: <><path d="M3 15h14" /><path d="M3.5 12.5c2-1 3.5-5 5-5s3 7 4.5 7 2.3-3.5 3.5-4.5" /></>,
  hook: <><path d="M13.5 3.2v7.3a4.2 4.2 0 1 1-8.4 0V8.8" /><path d="M13.5 3.2 16 5.7M13.5 3.2 11 5.7" /><circle cx="5.1" cy="7.2" r="1.1" /></>,
  dots: <><circle cx="4.5" cy="10" r="1.2" /><circle cx="10" cy="10" r="1.2" /><circle cx="15.5" cy="10" r="1.2" /></>,
  trash: <><path d="M4 5.5h12M8 5.5V3.5h4v2M5.5 5.5l.8 11h7.4l.8-11M8.5 8.5v5M11.5 8.5v5" /></>,
  up: <path d="m4.5 12.5 5.5-5 5.5 5" />,
  down: <path d="m4.5 7.5 5.5 5 5.5-5" />,
  close: <path d="m5 5 10 10M15 5 5 15" />,
  check: <path d="m4 10.5 4 4 8-9" />,
  warning: <><path d="M10 3.2 17 16H3L10 3.2Z" /><path d="M10 8v4M10 14.2v.2" /></>,
  refresh: <><path d="M16 6.5V3.5l-2 2A6.5 6.5 0 1 0 16.2 12" /><path d="M16 3.5h-3" /></>,
  commit: <><circle cx="10" cy="10" r="3" /><path d="M2.5 10h4.5M13 10h4.5" /></>,
  folder: <path d="M3 5.5h5l1.5 1.8H17v8.2H3V5.5Z" />,
  file: <><path d="M5 2.8h6l4 4v10.4H5V2.8Z" /><path d="M11 2.8v4h4" /></>,
  back: <path d="M16 10H4M9 5l-5 5 5 5" />,
  settings: <><circle cx="10" cy="10" r="3" /><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" /></>,
  external: <><path d="M11 3h6v6M17 3l-7 7" /><path d="M15 11v5H4V5h5" /></>,
  clock: <><circle cx="10" cy="10" r="7" /><path d="M10 6v4.5l3 1.5" /></>,
  sparkle: <><path d="m10 2.5 1.8 5.2 5.2 1.8-5.2 1.8L10 16.5l-1.8-5.2L3 9.5l5.2-1.8L10 2.5Z" /><path d="m16 15 .6 1.4L18 17l-1.4.6L16 19l-.6-1.4L14 17l1.4-.6L16 15Z" /></>,
  link: <><path d="M8.5 11.5 11.5 8.5" /><path d="M7.2 13.8l-1.4 1.4a2.8 2.8 0 0 1-4-4l3-3a2.8 2.8 0 0 1 4 0" /><path d="m12.8 6.2 1.4-1.4a2.8 2.8 0 0 1 4 4l-3 3a2.8 2.8 0 0 1-4 0" /></>,
  pin: <><path d="M10 17s5-5 5-8.2A5 5 0 0 0 5 8.8C5 12 10 17 10 17Z" /><circle cx="10" cy="8.8" r="1.6" /></>,
  quest: <><path d="M5 3.2h6.8L15 6.4v10.4H5V3.2Z" /><path d="M11.8 3.2v3.4H15" /><path d="m7 8.6 1.4 1.4 2.3-2.6" /><path d="M7 12h6M7 14.4h4" /></>,
  search: <><circle cx="8.6" cy="8.6" r="4.8" /><path d="m12.2 12.2 4.3 4.3" /></>,
}

/** Small stroke icon; all color comes from `currentColor`. */
export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  )
}

/** Sidebar panel icon: an open book with a glint. */
export function WorkbenchIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 4.6c2.4-.3 4.4.4 5.4 1.7v9.2c-1-.9-3-1.5-5.4-1.2V4.6Z" fill="currentColor" opacity=".22" />
      <path d="M17 4.6c-2.4-.3-4.4.4-5.4 1.7v9.2c1-.9 3-1.5 5.4-1.2V4.6Z" fill="currentColor" opacity=".38" />
      <path d="M3 4.6c2.4-.3 4.4.4 5.4 1.7v9.2c-1-.9-3-1.5-5.4-1.2V4.6ZM17 4.6c-2.4-.3-4.4.4-5.4 1.7v9.2c1-.9 3-1.5 5.4-1.2V4.6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8.4 6.3v9.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="m14.4 6.8-1.8 4.1-.3 1.7 1.5-.9 1.8-4.1-1.2-.8Z" fill="currentColor" opacity=".85" />
    </svg>
  )
}
