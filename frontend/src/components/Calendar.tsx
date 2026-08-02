import { Milk, Moon } from 'lucide-react'
import type { DaySummary } from '../types'
import { daysInMonth, firstWeekday, toISODate, addDays } from '../dates'
import { DiaperIcon } from './DiaperIcon'

interface Props {
  year: number
  month: number
  summary: Record<string, DaySummary>
  selectedDate: Date
  today: Date
  onSelectDay: (date: Date) => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function Calendar({ year, month, summary, selectedDate, today, onSelectDay }: Props) {
  const offset = firstWeekday(year, month)
  const totalDays = daysInMonth(year, month)
  const todayKey = toISODate(today)
  const selectedKey = toISODate(selectedDate)

  const cells: (Date | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month - 1, d))
  const trailing = 7 - (cells.length % 7)
  if (trailing < 7) {
    for (let i = 1; i <= trailing; i++) {
      cells.push(addDays(new Date(year, month - 1, totalDays), i))
    }
  }

  const rows: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))

  return (
    <div className="card">
      <div className="cal-weekdays">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="cal-grid">
        {rows.flat().map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="day-cell other-month" />
          const key = toISODate(date)
          const data = summary[key]
          const inCurrentMonth = date.getMonth() === month - 1
          const cls = [
            'day-cell',
            key === todayKey ? 'today' : '',
            key === selectedKey ? 'selected' : '',
            inCurrentMonth ? '' : 'other-month',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button key={key} className={cls} onClick={() => onSelectDay(date)} type="button">
              <span className="day-num">{date.getDate()}</span>
              {data && (
                <>
                  {data.feeds > 0 && (
                    <span className="stat-line feed">
                      <Milk size={13} />
                      {data.feeds}
                      {data.feed_ml > 0 ? ` · ${Math.round(data.feed_ml)}ml` : ''}
                    </span>
                  )}
                  {data.sleeps > 0 && (
                    <span className="stat-line sleep">
                      <Moon size={13} />
                      {formatSleep(data.sleep_minutes)}
                    </span>
                  )}
                  {data.diapers > 0 && (
                    <span className="stat-line diaper">
                      <DiaperIcon size={13} />
                      {data.diapers}
                    </span>
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function formatSleep(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
