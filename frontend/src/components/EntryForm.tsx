import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { Milk, Moon, X, Trash2 } from 'lucide-react'
import { api } from '../api'
import type { Entry, EntryInput, EntryType } from '../types'
import { parseInputValue, roundToNearest15, toInputValue } from '../dates'
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

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

function splitInput(value: string): { date: string; hour: string; minute: string } {
  const [date, time] = value.split('T')
  const [hour = '00', minute = '00'] = (time ?? ':').split(':')
  return { date: date ?? '', hour, minute }
}

function minuteToStep(minute: string): string {
  const m = Number(minute)
  if (Number.isNaN(m)) return '00'
  const within = ((Math.round(m / 15) * 15) % 60)
  return String(within === 0 ? 0 : within).padStart(2, '0')
}

interface TimePickerProps {
  date: string
  hour: string
  minute: string
  required?: boolean
  onDate: (v: string) => void
  onHour: (v: string) => void
  onMinute: (v: string) => void
  dateLabel: string
  hourLabel: string
  minuteLabel: string
}

function TimePicker({
  date,
  hour,
  minute,
  required,
  onDate,
  onHour,
  onMinute,
  dateLabel,
  hourLabel,
  minuteLabel,
}: TimePickerProps) {
  return (
    <div className="time-picker">
      <div className="field time-date">
        <label>{dateLabel}</label>
        <input type="date" required={required} value={date} onChange={(e) => onDate(e.target.value)} />
      </div>
      <div className="field time-hour">
        <label>{hourLabel}</label>
        <select value={hour} onChange={(e) => onHour(e.target.value)}>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>
      <div className="field time-minute">
        <label>{minuteLabel}</label>
        <select value={minute} onChange={(e) => onMinute(e.target.value)}>
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              :{m}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function num(v: string): number | undefined {
  if (v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export function EntryForm({ open, entry, defaultDate, onClose, onSaved }: Props) {
  const [type, setType] = useState<EntryType>('feed')
  const [startDate, setStartDate] = useState('')
  const [startHour, setStartHour] = useState('00')
  const [startMinute, setStartMinute] = useState('00')
  const [hasEnd, setHasEnd] = useState(false)
  const [endDate, setEndDate] = useState('')
  const [endHour, setEndHour] = useState('00')
  const [endMinute, setEndMinute] = useState('00')
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
      const s = splitInput(toInputValue(new Date(entry.started_at)))
      setStartDate(s.date)
      setStartHour(s.hour)
      setStartMinute(minuteToStep(s.minute))
      if (entry.ended_at) {
        const e = splitInput(toInputValue(new Date(entry.ended_at)))
        setHasEnd(true)
        setEndDate(e.date)
        setEndHour(e.hour)
        setEndMinute(minuteToStep(e.minute))
      } else {
        setHasEnd(false)
        setEndDate('')
        setEndHour('00')
        setEndMinute('00')
      }
      setAmountMl(String((entry.details.amount_ml as number | undefined) ?? ''))
      setDurationMin(String((entry.details.duration_min as number | undefined) ?? ''))
      setMethod(String((entry.details.method as string | undefined) ?? 'bottle'))
      setSide(String((entry.details.side as string | undefined) ?? 'both'))
      setWet(Boolean(entry.details.wet))
      setDirty(Boolean(entry.details.dirty))
      setColor(String((entry.details.color as string | undefined) ?? 'mustard'))
      setNote(entry.note ?? '')
    } else {
      const start = roundToNearest15(new Date(defaultDate))
      start.setHours(new Date().getHours(), new Date().getMinutes(), 0, 0)
      const rounded = roundToNearest15(start)
      const s = splitInput(toInputValue(rounded))
      setType('feed')
      setStartDate(s.date)
      setStartHour(s.hour)
      setStartMinute(s.minute)
      setHasEnd(false)
      setEndDate('')
      setEndHour('00')
      setEndMinute('00')
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

  function buildStart(): string {
    return `${startDate}T${startHour}:${startMinute}`
  }

  function buildEnd(): string | null {
    if (!hasEnd) return null
    return `${endDate}T${endHour}:${endMinute}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!startDate) {
      setError('Start date is required.')
      return
    }

    const start = parseInputValue(buildStart())
    let end: string | null = null
    if (hasEnd) {
      const endDateParsed = parseInputValue(buildEnd() as string)
      if (endDateParsed < start) {
        setError('End time must be after start time.')
        return
      }
      end = endDateParsed.toISOString()
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

          <TimePicker
            date={startDate}
            hour={startHour}
            minute={startMinute}
            required
            onDate={setStartDate}
            onHour={setStartHour}
            onMinute={setStartMinute}
            dateLabel="Start date"
            hourLabel="Hour"
            minuteLabel="Minute"
          />

          {type === 'sleep' && (
            <div className="sleep-end">
              {hasEnd ? (
                <>
                  <TimePicker
                    date={endDate}
                    hour={endHour}
                    minute={endMinute}
                    onDate={setEndDate}
                    onHour={setEndHour}
                    onMinute={setEndMinute}
                    dateLabel="End date"
                    hourLabel="Hour"
                    minuteLabel="Minute"
                  />
                  <button type="button" className="btn btn-sm" onClick={() => setHasEnd(false)}>
                    Still sleeping
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-sm" onClick={() => setHasEnd(true)}>
                  Add end time
                </button>
              )}
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
