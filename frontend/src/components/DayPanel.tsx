import { Milk, Moon, Pencil, Plus } from 'lucide-react'
import type { Entry } from '../types'
import { formatTime, sleepDuration, formatMinutes } from '../dates'
import { getDiaperColor } from '../diaperColors'
import { DiaperIcon } from './DiaperIcon'

interface Props {
  date: Date
  entries: Entry[]
  loading: boolean
  canEdit: boolean
  onAdd: () => void
  onEdit: (entry: Entry) => void
}

function entryTitle(entry: Entry): string {
  switch (entry.type) {
    case 'feed':
      return 'Feed'
    case 'sleep':
      return 'Sleep'
    case 'diaper':
      return 'Diaper'
  }
}

function entrySub(entry: Entry): string {
  const d = entry.details
  switch (entry.type) {
    case 'feed': {
      const parts: string[] = []
      if (d.amount_ml) parts.push(`${d.amount_ml} ml`)
      if (d.method && d.method !== 'n/a') parts.push(String(d.method))
      if (d.side && d.side !== 'n/a' && d.side !== 'both') parts.push(String(d.side))
      if (d.duration_min) parts.push(`${d.duration_min} min`)
      return parts.join(' · ') || 'Feed'
    }
    case 'sleep': {
      const minutes = sleepDuration(entry)
      if (minutes === null) return 'Sleeping…'
      return formatMinutes(minutes)
    }
    case 'diaper': {
      const color = getDiaperColor(String(d.color ?? ''))
      const parts: string[] = []
      if (color) parts.push(color.label)
      if (d.wet) parts.push('Wet')
      if (d.dirty) parts.push('Dirty')
      return parts.join(' · ') || 'Changed'
    }
  }
}

const ICONS = {
  feed: Milk,
  sleep: Moon,
  diaper: DiaperIcon,
} as const

export function DayPanel({ date, entries, loading, canEdit, onAdd, onEdit }: Props) {
  return (
    <div className="card day-panel">
      <div className="day-panel-header">
        <strong>
          {date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
        </strong>
        {canEdit && (
          <button className="btn btn-primary btn-sm" onClick={onAdd}>
            <Plus size={15} /> Add
          </button>
        )}
      </div>
      <div className="day-panel-body">
        {loading && <div className="empty-day">Loading…</div>}
        {!loading && entries.length === 0 && (
          <div className="empty-day">
            Nothing logged yet. Tap “Add” to record a feed, sleep, or diaper.
          </div>
        )}
        {entries.map((entry) => {
          const Icon = ICONS[entry.type]
          const start = new Date(entry.started_at)
          const diaperColor =
            entry.type === 'diaper'
              ? getDiaperColor(String(entry.details.color ?? ''))
              : undefined
          return (
            <div key={entry.id} className="entry-row">
              {entry.type === 'diaper' ? (
                <span
                  className="diaper-tile"
                  style={{
                    backgroundColor: diaperColor?.hex ?? 'var(--diaper)',
                  }}
                  title={diaperColor?.label}
                >
                  <DiaperIcon size={20} />
                </span>
              ) : (
                <span className={`entry-icon ${entry.type}`}>
                  <Icon size={16} />
                </span>
              )}
              <div className="entry-main">
                <div className="entry-title">
                  {formatTime(start)} · {entryTitle(entry)}
                </div>
                <div className="entry-sub">
                  {diaperColor && (
                    <span
                      className="diaper-dot"
                      style={{ backgroundColor: diaperColor.hex }}
                      title={diaperColor.label}
                    />
                  )}
                  {entrySub(entry)}
                </div>
                {entry.note && <div className="entry-sub">{entry.note}</div>}
              </div>
              {canEdit && (
                <button
                  className="icon-btn"
                  onClick={() => onEdit(entry)}
                  aria-label="Edit entry"
                >
                  <Pencil size={15} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
