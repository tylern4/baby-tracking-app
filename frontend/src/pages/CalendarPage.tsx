import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Baby, BarChart3, ChevronLeft, ChevronRight, LogOut, Milk, Moon, ShieldCheck, Sun } from 'lucide-react'
import { useAuth } from '../auth'
import { api } from '../api'
import type { DaySummary, Entry, MonthSummary } from '../types'
import { Calendar } from '../components/Calendar'
import { DayPanel } from '../components/DayPanel'
import { EntryForm } from '../components/EntryForm'
import { DiaperIcon } from '../components/DiaperIcon'
import { startOfDay, addDays } from '../dates'
import { useTheme } from '../theme'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function CalendarPage() {
  const { user, canEdit, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()))
  const [summary, setSummary] = useState<Record<string, DaySummary>>({})
  const [entries, setEntries] = useState<Entry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Entry | null>(null)

  const loadSummary = useCallback(async (y: number, m: number) => {
    try {
      const res: MonthSummary = await api.monthSummary(y, m, new Date().getTimezoneOffset())
      setSummary(res.days)
    } catch {
      setSummary({})
    }
  }, [])

  useEffect(() => {
    loadSummary(year, month)
  }, [year, month, loadSummary])

  const loadEntries = useCallback(async (date: Date) => {
    setEntriesLoading(true)
    const from = startOfDay(date).toISOString()
    const to = startOfDay(addDays(date, 1)).toISOString()
    try {
      setEntries(await api.listEntries({ from, to }))
    } catch {
      setEntries([])
    } finally {
      setEntriesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEntries(selectedDate)
  }, [selectedDate, loadEntries])

  function changeMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1) {
      m = 12
      y -= 1
    } else if (m > 12) {
      m = 1
      y += 1
    }
    setMonth(m)
    setYear(y)
  }

  function goToday() {
    const today = new Date()
    setYear(today.getFullYear())
    setMonth(today.getMonth() + 1)
    setSelectedDate(startOfDay(today))
  }

  function refresh() {
    loadSummary(year, month)
    loadEntries(selectedDate)
  }

  return (
    <div>
      <header className="topbar">
        <div className="brand">
          <Baby size={22} color="#e8848a" /> Baby Tracker
        </div>
        <div className="topbar-actions">
          <span>{user?.name}</span>
          <Link className="btn btn-ghost btn-sm" to="/stats">
            <BarChart3 size={15} /> Stats
          </Link>
          {user?.role === 'admin' && (
            <Link className="btn btn-ghost btn-sm" to="/admin">
              <ShieldCheck size={15} /> Admin
            </Link>
          )}
          <button className="btn btn-ghost btn-sm" onClick={toggle} aria-label="Toggle dark mode">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            <LogOut size={15} /> Log out
          </button>
        </div>
      </header>

      <div className="layout">
        <div>
          <div className="cal-header">
            <div className="cal-nav">
              <button className="btn" onClick={() => changeMonth(-1)} aria-label="Previous month">
                <ChevronLeft size={18} />
              </button>
              <button className="btn" onClick={() => changeMonth(1)} aria-label="Next month">
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="cal-title">
              {MONTH_NAMES[month - 1]} {year}
            </div>
            <button className="btn" onClick={goToday}>
              Today
            </button>
          </div>

          <Calendar
            year={year}
            month={month}
            summary={summary}
            selectedDate={selectedDate}
            today={now}
            onSelectDay={setSelectedDate}
          />

          <div className="legend">
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
        </div>

        <DayPanel
          date={selectedDate}
          entries={entries}
          loading={entriesLoading}
          canEdit={canEdit}
          onAdd={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          onEdit={(entry) => {
            setEditing(entry)
            setFormOpen(true)
          }}
        />
      </div>

      <EntryForm
        open={formOpen}
        entry={editing}
        defaultDate={selectedDate}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
      />
    </div>
  )
}
