import React, { useEffect, useRef, useState } from 'react'
import { Button, Field, Modal, Range, Select, TextArea, TextInput } from './ui'

export interface FormOption { value: string; label: string }

export interface FormField {
  key: string
  label: string
  type?: 'text' | 'textarea' | 'select' | 'number' | 'range' | 'tags' | 'chapter' | 'character' | 'multiselect'
  options?: (string | FormOption)[]
  placeholder?: string
  hint?: string
  required?: boolean
  min?: number
  max?: number
  step?: number
  rows?: number
  wide?: boolean
}

export function EntityForm({
  open, title, subtitle, fields, initial, onClose, onSubmit, onDelete, t, width = 560,
}: {
  open: boolean
  title: string
  subtitle?: string
  fields: FormField[]
  initial: Record<string, any>
  onClose: () => void
  onSubmit: (values: Record<string, any>) => void | Promise<void>
  onDelete?: () => void | Promise<void>
  t: (key: string) => string
  width?: number
}) {
  const [values, setValues] = useState<Record<string, any>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [armed, setArmed] = useState(false)
  const [closeArmed, setCloseArmed] = useState(false)
  const dirtyRef = useRef(false)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (!open) {
      wasOpen.current = false
      return
    }
    if (wasOpen.current) return
    wasOpen.current = true
    const next: Record<string, any> = {}
    for (const field of fields) {
      const value = initial?.[field.key]
      if (field.type === 'tags') next[field.key] = Array.isArray(value) ? value.join('，') : (value ?? '')
      else if (field.type === 'multiselect') next[field.key] = Array.isArray(value) ? value : []
      else next[field.key] = value ?? (field.type === 'range' ? 5 : '')
    }
    setValues(next)
    setError('')
    setBusy(false)
    setArmed(false)
    setCloseArmed(false)
    dirtyRef.current = false
  }, [open])

  const setValue = (key: string, value: any) => {
    setValues(current => ({ ...current, [key]: value }))
    dirtyRef.current = true
    setCloseArmed(false)
    setError('')
  }

  const requestClose = () => {
    if (busy) return
    if (dirtyRef.current && !closeArmed) {
      setCloseArmed(true)
      setError(t('有未保存的改动，再点一次关闭'))
      window.setTimeout(() => setCloseArmed(false), 3500)
      return
    }
    onClose()
  }

  const submit = async () => {
    for (const field of fields) {
      if (!field.required) continue
      const value = values[field.key]
      const empty = field.type === 'multiselect' ? !Array.isArray(value) || value.length === 0 : value === undefined || value === null || String(value).trim() === ''
      if (empty) {
        setError(`${field.label} ${t('不能为空')}`)
        return
      }
    }
    const output: Record<string, any> = {}
    for (const field of fields) {
      const value = values[field.key]
      output[field.key] = field.type === 'tags'
        ? String(value ?? '').split(/[,，]/).map(part => part.trim()).filter(Boolean)
        : field.type === 'multiselect' ? (Array.isArray(value) ? value : [])
          : field.type === 'number' || field.type === 'range' ? Number(value || 0) : value
    }
    setBusy(true)
    try {
      await onSubmit(output)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      subtitle={subtitle}
      onClose={requestClose}
      width={width}
      footer={(
        <>
          {onDelete ? (
            <div className="nwb-modal-foot-left">
              <Button
                variant={armed ? 'danger' : 'ghost'}
                onClick={() => {
                  if (!armed) {
                    setArmed(true)
                    window.setTimeout(() => setArmed(false), 3500)
                    return
                  }
                  setBusy(true)
                  Promise.resolve(onDelete())
                    .then(() => onClose())
                    .catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))
                    .finally(() => setBusy(false))
                }}
                disabled={busy}
              >
                {armed ? t('再次点击确认') : t('删除')}
              </Button>
            </div>
          ) : null}
          <Button variant="ghost" onClick={requestClose} disabled={busy}>{t('取消')}</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>{busy ? t('保存中…') : t('保存')}</Button>
        </>
      )}
    >
      <div
        className="nwb-form-grid"
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return
          if (event.key === 'Enter' && !event.shiftKey && !(event.target instanceof HTMLTextAreaElement)) {
            event.preventDefault()
            void submit()
          }
        }}
      >
        {fields.map(field => (
          <Field key={field.key} label={field.label} hint={field.hint} required={field.required}>
            <FieldControl
              field={field}
              value={values[field.key]}
              onChange={value => setValue(field.key, value)}
              t={t}
            />
          </Field>
        ))}
      </div>
      {error ? <div className="nwb-form-error">{error}</div> : null}
    </Modal>
  )
}

function FieldControl({
  field, value, onChange, t,
}: {
  field: FormField
  value: any
  onChange: (value: any) => void
  t: (key: string) => string
}) {
  const type = field.type ?? 'text'
  if (type === 'textarea') {
    return <TextArea aria-label={field.label} rows={field.rows ?? 3} value={value ?? ''} placeholder={field.placeholder} onChange={event => onChange(event.target.value)} />
  }
  if (type === 'select' || type === 'chapter' || type === 'character') {
    const options = (field.options ?? []).map(option => typeof option === 'string' ? { value: option, label: option } : option)
    return <Select value={value ?? ''} onChange={onChange} options={options} placeholder={field.placeholder ?? t('未设置')} ariaLabel={field.label} />
  }
  if (type === 'multiselect') {
    const selected = Array.isArray(value) ? value as string[] : []
    const options = (field.options ?? []).map(option => typeof option === 'string' ? { value: option, label: option } : option)
    return (
      <div className="nwb-checklist">
        {options.length === 0 ? <span className="nwb-muted">{t('暂无内容')}</span> : options.map(option => (
          <label key={option.value} className="nwb-check-option">
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={(event) => onChange(event.target.checked ? [...selected, option.value] : selected.filter(item => item !== option.value))}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    )
  }
  if (type === 'range') {
    return <Range value={Number(value ?? field.min ?? 1)} min={field.min ?? 1} max={field.max ?? 10} step={field.step ?? 1} onChange={onChange} label={field.label} />
  }
  if (type === 'number') {
    return <TextInput aria-label={field.label} type="number" value={value ?? ''} min={field.min} max={field.max} step={field.step} placeholder={field.placeholder} onChange={event => onChange(event.target.value)} />
  }
  return (
    <TextInput
      aria-label={field.label}
      value={value ?? ''}
      placeholder={field.placeholder}
      onChange={event => onChange(event.target.value)}
    />
  )
}
