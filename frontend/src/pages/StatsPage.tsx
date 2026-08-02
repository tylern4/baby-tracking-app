import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Baby, BarChart3, CalendarDays, LogOut, Milk, Moon, Sun } from 'lucide-react'
import { useAuth } from '../auth'
import { useTheme } from '../theme'
import { api } from '../api'
import type { DaySummary, EntryType, StatsOut } from '../types'
import { DiaperIcon } from '../components/DiaperIcon'
import { addDays, parseISODate, toISODate } from '../dates'

const PRESETS = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

const TYPE_OPTIONS: { value: 'all' | EntryType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'feed', label: 'Feeds' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'diaper', label: 'Diapers' },
]

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EMPTY: DaySummary = {
  feeds: 0,
  feed_ml: 0,
  feed_minutes: 0,
  sleeps: 0,
  sleep_minutes: 0,
  diapers: 0,
  wet: 0,
  dirty: 0,
}

function valueOfType(type: EntryType, s: DaySummary): number {
  if (type === 'feed') return s.feeds
  if (type === 'sleep') return s.sleep_minutes / 60
  return s.diapers
}

function barHeight(value: number, max: number, min: number) {
  if (value <= 0) return '0%'
  return `${Math.max(min, (value / max) * 100)}%`
}

function dayLabel(iso: string) {
  const d = parseISODate(iso)
  return d.getDate() === 1 ? MONTH_ABBR[d.getMonth()] : String(d.getDate())
}

function dayHeader(iso: string) {
  const d = parseISODate(iso)
  return `${WEEKDAYS[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`
}

function formatBarValue(type: EntryType, v: number) {
  if (type === 'sleep') return v % 1 === 0 ? `${v}h` : `${v.toFixed(1)}h`
  return String(Math.round(v))
}

function barPct(value: number, max: number, min: number) {
  return Math.max(min, value <= 0 ? 0 : (value / max) * 100)
}

export function StatsPage() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const [end, setEnd] = useState(() => toISODate(new Date()))
  const [start, setStart] = useState(() => toISODate(addDays(new Date(), -13)))
  const [type, setType] = useState<'all' | EntryType>('all')
  const [stats, setStats] = useState<StatsOut | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .stats(start, end, new Date().getTimezoneOffset())
      .then((res) => {
        if (!cancelled) setStats(res)
      })
      .catch(() => {
        if (!cancelled) setStats(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [start, end])

  const days = useMemo(() => {
    const list: { iso: string; summary: DaySummary }[] = []
    let cur = parseISODate(start)
    const last = parseISODate(end)
    while (cur <= last) {
      const iso = toISODate(cur)
      list.push({ iso, summary: stats?.days[iso] ?? EMPTY })
      cur = addDays(cur, 1)
    }
    return list
  }, [start, end, stats])

  const totals = useMemo(() => {
    const t = { ...EMPTY }
    for (const d of days) {
      t.feeds += d.summary.feeds
      t.feed_ml += d.summary.feed_ml
      t.feed_minutes += d.summary.feed_minutes
      t.sleeps += d.summary.sleeps
      t.sleep_minutes += d.summary.sleep_minutes
      t.diapers += d.summary.diapers
      t.wet += d.summary.wet
      t.dirty += d.summary.dirty
    }
    return t
  }, [days])

  const single = type !== 'all'
  const compact = days.length > 45
  const barMin = compact ? 8 : 4
  const maxFeed = Math.max(1, ...days.map((d) => d.summary.feeds))
  const maxSleepHours = Math.max(1, ...days.map((d) => d.summary.sleep_minutes / 60))
  const maxDiaper = Math.max(1, ...days.map((d) => d.summary.diapers))

  const maxValue = single
    ? niceMax(Math.max(1, ...days.map((d) => valueOfType(type as EntryType, d.summary))))
    : niceMax(Math.max(maxFeed, maxSleepHours, maxDiaper))

  const hasData = single
    ? totals[type === 'feed' ? 'feeds' : type === 'sleep' ? 'sleep_minutes' : 'diapers'] > 0
    : totals.feeds > 0 || totals.sleep_minutes > 0 || totals.diapers > 0

  const emptyMessage =
    type === 'all'
      ? 'No entries in this range.'
      : type === 'feed'
        ? 'No feeds in this range.'
        : type === 'sleep'
          ? 'No sleep entries in this range.'
          : 'No diapers in this range.'

  function niceMax(raw: number) {
    return Math.max(1, Math.ceil(raw / 4) * 4)
  }

  function formatAxis(v: number) {
    if (type === 'all' || type === 'feed' || type === 'diaper') return String(Math.round(v))
    return v % 1 === 0 ? `${v}h` : `${v.toFixed(1)}h`
  }

  const AXIS_TICKS = [1, 0.75, 0.5, 0.25, 0]

  function setPreset(days: number) {
    const today = new Date()
    setEnd(toISODate(today))
    setStart(toISODate(addDays(today, -(days - 1))))
  }

  function onStartChange(v: string) {
    if (v > end) {
      setStart(end)
      setEnd(v)
    } else {
      setStart(v)
    }
  }

  function onEndChange(v: string) {
    if (v < start) {
      setEnd(start)
      setStart(v)
    } else {
      setEnd(v)
    }
  }

  function shouldLabel(index: number, iso: string) {
    if (days.length <= 31) return true
    const d = parseISODate(iso)
    return index === 0 || d.getDate() === 1 || index % 7 === 0
  }

  return (
    <div>
      <header className="topbar">
        <div className="brand">
          <Baby size={22} color="#e8848a" /> Baby Tracker
        </div>
        <div className="topbar-actions">
          <span>{user?.name}</span>
          <Link className="btn btn-ghost btn-sm" to="/">
            <CalendarDays size={15} /> Calendar
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={toggle} aria-label="Toggle dark mode">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            <LogOut size={15} /> Log out
          </button>
        </div>
      </header>

      <div className="layout stats-layout">
        <div className="card">
          <div className="cal-header">
            <div className="cal-title">
              <BarChart3 size={18} style={{ verticalAlign: '-3px' }} /> Statistics
            </div>
            <div className="stats-range-presets">
              {PRESETS.map((p) => (
                <button key={p.days} className="btn btn-sm" onClick={() => setPreset(p.days)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="stats-controls">
            <label className="field stats-field">
              <span>From</span>
              <input type="date" value={start} max={end} onChange={(e) => onStartChange(e.target.value)} />
            </label>
            <label className="field stats-field">
              <span>To</span>
              <input type="date" value={end} min={start} onChange={(e) => onEndChange(e.target.value)} />
            </label>
            <div className="stats-type-tabs">
              {TYPE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  className={`type-tab${type === o.value ? ` active ${o.value}` : ''}`}
                  onClick={() => setType(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div className="stats-total">
              {type === 'feed' && (
                <span className="stat-line feed">
                  <Milk size={14} /> {totals.feeds} feeds · {Math.round(totals.feed_ml)} ml
                </span>
              )}
              {type === 'sleep' && (
                <span className="stat-line sleep">
                  <Moon size={14} /> {(totals.sleep_minutes / 60).toFixed(1)}h sleep
                </span>
              )}
              {type === 'diaper' && (
                <span className="stat-line diaper">
                  <DiaperIcon size={14} /> {totals.diapers} diapers
                </span>
              )}
              {type === 'all' && (
                <>
                  <span className="stat-line feed">
                    <Milk size={14} /> {totals.feeds} feeds · {Math.round(totals.feed_ml)} ml
                  </span>
                  <span className="stat-line sleep">
                    <Moon size={14} /> {(totals.sleep_minutes / 60).toFixed(1)}h sleep
                  </span>
                  <span className="stat-line diaper">
                    <DiaperIcon size={14} /> {totals.diapers} diapers
                  </span>
                </>
              )}
            </div>
          </div>

          {loading && <div className="empty-day">Loading…</div>}

          {!loading && !hasData && <div className="empty-day">{emptyMessage}</div>}

          {!loading && hasData && (
            <>
              {!single && (
                <div className="stats-legend">
                  <span className="stat-line feed">
                    <Milk size={14} /> feeds
                  </span>
                  <span className="stat-line sleep">
                    <Moon size={14} /> sleep
                  </span>
                  <span className="stat-line diaper">
                    <DiaperIcon size={14} /> diapers
                  </span>
                </div>
              )}

              <div className={`stats-chart${single ? ' single' : ''}${compact ? ' compact' : ''}`}>
                <div className="stats-plot-wrap">
                  <div className="stats-axis">
                    {AXIS_TICKS.map((f) => (
                      <span key={f} className="stats-tick" style={{ top: `${(1 - f) * 100}%` }}>
                        {formatAxis(maxValue * f)}
                      </span>
                    ))}
                  </div>
                  <div className="stats-bars">
                    <div className="stats-gridlines">
                      <div className="stats-gridline" style={{ top: '25%' }} />
                      <div className="stats-gridline" style={{ top: '50%' }} />
                      <div className="stats-gridline" style={{ top: '75%' }} />
                      <div className="stats-gridline" style={{ top: '100%' }} />
                    </div>
                    {days.map(({ iso, summary }) => {
                      const tp = type as EntryType
                      const singleValue = valueOfType(tp, summary)
                      const tooltipBottom = single
                        ? barPct(singleValue, maxValue, barMin)
                        : Math.max(
                            barPct(summary.feeds, maxValue, barMin),
                            barPct(summary.sleep_minutes / 60, maxValue, barMin),
                            barPct(summary.diapers, maxValue, barMin),
                          )
                      return (
                        <div key={iso} className="stats-col">
                          <div className="stats-tooltip" style={{ bottom: `calc(${tooltipBottom}% + 8px)` }}>
                            <div className="tooltip-date">{dayHeader(iso)}</div>
                            {single ? (
                              <div className="tooltip-value">{formatBarValue(tp, singleValue)}</div>
                            ) : (
                              <div className="tooltip-lines">
                                <div className="tooltip-line">
                                  <span className="tooltip-dot feed" />Feeds {summary.feeds}
                                </div>
                                <div className="tooltip-line">
                                  <span className="tooltip-dot sleep" />Sleep {(summary.sleep_minutes / 60).toFixed(1)}h
                                </div>
                                <div className="tooltip-line">
                                  <span className="tooltip-dot diaper" />Diapers {summary.diapers}
                                </div>
                              </div>
                            )}
                          </div>
                          {single ? (
                            <div
                              className={`stats-bar ${type}`}
                              style={{ height: barHeight(singleValue, maxValue, barMin) }}
                            />
                          ) : (
                            <>
                              <div className="stats-bar feed" style={{ height: barHeight(summary.feeds, maxValue, barMin) }} />
                              <div className="stats-bar sleep" style={{ height: barHeight(summary.sleep_minutes / 60, maxValue, barMin) }} />
                              <div className="stats-bar diaper" style={{ height: barHeight(summary.diapers, maxValue, barMin) }} />
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="stats-x-labels">
                  <div className="stats-axis-spacer" />
                  <div className="stats-x-inner">
                    {days.map(({ iso }, i) => (
                      <div key={iso} className="stats-day">
                        {shouldLabel(i, iso) ? dayLabel(iso) : ''}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
