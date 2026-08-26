import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { Milk, Moon, X, Trash2 } from 'lucide-react'
import { api } from '../api'
import type { Entry, EntryInput, EntryType } from '../types'
import { toInputValue, parseInputValue } from '../dates'
import { DIAPER_COLORS, getDiaperColor } from '../diaperColors'
import { DiaperIcon } from './DiaperIcon'

interface Props {
  open: boolean
  entry: Entry | null
  defaultDate: Date
  onClose: () => void
  onSaved: () => void
}

type TabIcon = ComponentType<{ size?: number | string }>

const TYPE_META: Record<EntryType, { label: string; icon: TabIcon }> = {
  feed: { label: 'Feed', icon: Milk },
  sleep: { label: 'Sleep', icon: Moon },
  diaper: { label: 'Diaper', icon: DiaperIcon },
}

function num(v: string): number | undefined {
  if (v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export function EntryForm({ open, entry, defaultDate, onClose, onSaved }: Props) {
  const [type, setType] = useState<EntryType>('feed')
  const [startedAt, setStartedAt] = useState('')
  const [endedAt, setEndedAt] = useState('')
  const [amountMl, setAmountMl] = useState('')
  const [durationMin, setDurationMin] = useState('')
  const [method, setMethod] = useState('bottle')
  const [side, setSide] = useState('both')
  const [wet, setWet] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [color, setColor] = useState('mustard')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (entry) {
      setType(entry.type)
      setStartedAt(toInputValue(new Date(entry.started_at)))
      setEndedAt(entry.ended_at ? toInputValue(new Date(entry.ended_at)) : '')
      setAmountMl(String((entry.details.amount_ml as number | undefined) ?? ''))
      setDurationMin(String((entry.details.duration_min as number | undefined) ?? ''))
      setMethod(String((entry.details.method as string | undefined) ?? 'bottle'))
      setSide(String((entry.details.side as string | undefined) ?? 'both'))
      setWet(Boolean(entry.details.wet))
      setDirty(Boolean(entry.details.dirty))
      setColor(String((entry.details.color as string | undefined) ?? 'mustard'))
      setNote(entry.note ?? '')
    } else {
      const start = new Date(defaultDate)
      start.setHours(new Date().getHours(), new Date().getMinutes(), 0, 0)
      setType('feed')
      setStartedAt(toInputValue(start))
      setEndedAt('')
      setAmountMl('')
      setDurationMin('')
      setMethod('bottle')
      setSide('both')
      setWet(false)
      setDirty(false)
      setColor('mustard')
      setNote('')
    }
  }, [open, entry, defaultDate])

  if (!open) return null

  function switchType(next: EntryType) {
    setType(next)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!startedAt) {
      setError('Start time is required.')
      return
    }

    const start = parseInputValue(startedAt)
    let end: string | null = null
    if (endedAt) {
      const endDate = parseInputValue(endedAt)
      if (endDate < start) {
        setError('End time must be after start time.')
        return
      }
      end = endDate.toISOString()
    }

    let details: Record<string, unknown> = {}
    if (type === 'feed') {
      details = {
        amount_ml: num(amountMl),
        duration_min: num(durationMin),
        method,
        side,
      }
    } else if (type === 'diaper') {
      details = { wet, dirty, color }
    }

    const payload: EntryInput = {
      type,
      started_at: start.toISOString(),
      ended_at: end,
      details,
      note: note.trim() || null,
    }

    setSaving(true)
    try {
      if (entry) await api.updateEntry(entry.id, payload)
      else await api.createEntry(payload)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!entry || !confirm('Delete this entry?')) return
    setSaving(true)
    try {
      await api.deleteEntry(entry.id)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <strong>{entry ? 'Edit' : 'Add'} entry</strong>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="type-tabs">
            {(Object.keys(TYPE_META) as EntryType[]).map((t) => {
              const Icon = TYPE_META[t].icon
              return (
                <button
                  key={t}
                  type="button"
                  className={`type-tab ${t}${type === t ? ' active' : ''}`}
                  onClick={() => switchType(t)}
                  disabled={!!entry}
                >
                  <Icon size={16} /> {TYPE_META[t].label}
                </button>
              )
            })}
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="field">
            <label>Start</label>
            <input
              type="datetime-local"
              required
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
            />
          </div>

          {type === 'sleep' && (
            <div className="field">
              <label>End (leave empty if still sleeping)</label>
              <input
                type="datetime-local"
                value={endedAt}
                onChange={(e) => setEndedAt(e.target.value)}
              />
            </div>
          )}

          {type === 'feed' && (
            <>
              <div className="field-row">
                <div className="field">
                  <label>Amount (ml)</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    inputMode="decimal"
                    placeholder="90"
                    value={amountMl}
                    onChange={(e) => setAmountMl(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Duration (min)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    placeholder="15"
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                  />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Method</label>
                  <select value={method} onChange={(e) => setMethod(e.target.value)}>
                    <option value="bottle">Bottle</option>
                    <option value="breast">Breast</option>
                    <option value="formula">Formula</option>
                    <option value="solids">Solids</option>
                    <option value="pumped">Pumped milk</option>
                  </select>
                </div>
                <div className="field">
                  <label>Side</label>
                  <select value={side} onChange={(e) => setSide(e.target.value)}>
                    <option value="both">Both</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="n/a">N/A</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {type === 'diaper' && (
            <>
              {dirty && (
                <div className="field">
                  <label>Color</label>
                  <div className="color-swatches">
                    {DIAPER_COLORS.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        className={`swatch${color === c.key ? ' selected' : ''}`}
                        style={{ backgroundColor: c.hex }}
                        onClick={() => setColor(c.key)}
                        title={c.label}
                        aria-label={c.label}
                      />
                    ))}
                  </div>
                  {getDiaperColor(color) && (
                    <span className="selected-color">
                      <span className="diaper-dot" style={{ backgroundColor: getDiaperColor(color)!.hex }} />
                      {getDiaperColor(color)!.label}
                    </span>
                  )}
                </div>
              )}
              <div className="checkbox-row">
                <label>
                  <input type="checkbox" checked={wet} onChange={(e) => setWet(e.target.checked)} /> Wet
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={dirty}
                    onChange={(e) => setDirty(e.target.checked)}
                  />{' '}
                  Dirty
                </label>
              </div>
            </>
          )}

          <div className="field">
            <label>Note</label>
            <textarea
              rows={2}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional…"
            />
          </div>

          <div className="modal-actions">
            {entry && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={saving}
              >
                <Trash2 size={16} /> Delete
              </button>
            )}
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? <span className="spinner" /> : entry ? 'Save changes' : 'Add'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
