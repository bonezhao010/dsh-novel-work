import React, { useEffect, useRef } from 'react'
import { Icon, type IconName } from './icons'

export type Tone = 'neutral' | 'brand' | 'success' | 'warn' | 'danger' | 'quiet'

export function Button({
  children, onClick, variant = 'default', size = 'md', disabled, title, type = 'button', className,
}: {
  children?: React.ReactNode
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  variant?: 'default' | 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  disabled?: boolean
  title?: string
  type?: 'button' | 'submit'
  className?: string
}) {
  return (
    <button
      type={type}
      className={`nwb-btn nwb-btn-${variant} nwb-btn-${size}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  )
}

export function IconButton({
  icon, label, onClick, active, disabled, size = 16, className,
}: {
  icon: IconName
  label: string
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  active?: boolean
  disabled?: boolean
  size?: number
  className?: string
}) {
  return (
    <button
      type="button"
      className={`nwb-icon-btn${active ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      <Icon name={icon} size={size} />
    </button>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`nwb-badge nwb-tone-${tone}`}>{children}</span>
}

export function Segmented<T extends string>({
  value, options, onChange, ariaLabel,
}: {
  value: T
  options: { value: T; label: React.ReactNode; title?: string }[]
  onChange: (value: T) => void
  ariaLabel?: string
}) {
  return (
    <div className="nwb-segmented" role="group" aria-label={ariaLabel}>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? 'is-active' : ''}
          onClick={() => onChange(option.value)}
          title={option.title}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Modal({
  open, title, subtitle, onClose, children, footer, width = 560, className,
}: {
  open: boolean
  title: React.ReactNode
  subtitle?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
  className?: string
}) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) return undefined
    const focusTimer = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('input, textarea, select')
      if (first) first.focus()
      else panelRef.current?.focus()
    }, 30)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div
      className="nwb-modal-backdrop"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        className={`nwb-modal${className ? ` ${className}` : ''}`}
        style={{ width: `min(${width}px, calc(100vw - 40px))`, maxWidth: 'calc(100% - 32px)' }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="nwb-modal-head">
          <div>
            <div className="nwb-modal-title">{title}</div>
            {subtitle ? <div className="nwb-modal-sub">{subtitle}</div> : null}
          </div>
          <IconButton icon="close" label="关闭" onClick={onClose} />
        </div>
        <div className="nwb-modal-body">{children}</div>
        {footer ? <div className="nwb-modal-foot">{footer}</div> : null}
      </div>
    </div>
  )
}

export function Field({ label, hint, children, required }: {
  label: React.ReactNode
  hint?: React.ReactNode
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div className="nwb-field">
      <span className="nwb-field-label">
        {label}
        {required ? <span className="nwb-required">*</span> : null}
      </span>
      {children}
      {hint ? <span className="nwb-field-hint">{hint}</span> : null}
    </div>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`nwb-input${props.className ? ` ${props.className}` : ''}`} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`nwb-textarea${props.className ? ` ${props.className}` : ''}`} />
}

export function Select({
  value, onChange, options, placeholder, disabled, ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
}) {
  return (
    <select
      className="nwb-select"
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={event => onChange(event.target.value)}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      className="nwb-toggle"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span className="nwb-toggle-knob" />
    </button>
  )
}

export function Range({
  value, min = 1, max = 10, step = 1, onChange, label,
}: {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  label: string
}) {
  return (
    <div className="nwb-range">
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onChange={event => onChange(Number(event.target.value))}
      />
      <span className="nwb-range-value">{value}</span>
    </div>
  )
}

export function EmptyState({
  icon, title, text, action,
}: {
  icon: IconName
  title: React.ReactNode
  text?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="nwb-empty">
      <div className="nwb-empty-icon"><Icon name={icon} size={26} /></div>
      <div className="nwb-empty-title">{title}</div>
      {text ? <div className="nwb-empty-text">{text}</div> : null}
      {action ? <div className="nwb-empty-action">{action}</div> : null}
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="nwb-spinner-wrap" role="status">
      <span className="nwb-spinner" />
      {label ? <span>{label}</span> : null}
    </span>
  )
}

export function useOutsideClick<T extends HTMLElement>(onOutside: () => void, active: boolean) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    if (!active) return undefined
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside()
    }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onOutside() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [active, onOutside])
  return ref
}

export function ConfirmButton({
  children, onConfirm, disabled, confirmLabel = '再次点击确认',
}: {
  children: React.ReactNode
  onConfirm: () => void
  disabled?: boolean
  confirmLabel?: string
}) {
  const [armed, setArmed] = React.useState(false)
  useEffect(() => {
    if (!armed) return undefined
    const timer = window.setTimeout(() => setArmed(false), 3500)
    return () => window.clearTimeout(timer)
  }, [armed])
  return (
    <Button
      variant={armed ? 'danger' : 'default'}
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else {
          setArmed(true)
        }
      }}
      disabled={disabled}
    >
      {armed ? confirmLabel : children}
    </Button>
  )
}

export function Divider() {
  return <div className="nwb-divider" role="separator" />
}

export function StatPill({ icon, label, value }: { icon: IconName; label: string; value: React.ReactNode }) {
  return (
    <span className="nwb-stat-pill" title={label}>
      <Icon name={icon} size={13} />
      <span>{value}</span>
    </span>
  )
}
