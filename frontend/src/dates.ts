const DAY_MS = 24 * 60 * 60 * 1000

export function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function toInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

export function roundToNearest15(d: Date): Date {
  const copy = new Date(d)
  const minutes = copy.getMinutes()
  const rounded = Math.round(minutes / 15) * 15
  copy.setMinutes(rounded, 0, 0)
  return copy
}

export function parseInputValue(v: string): Date {
  return new Date(v)
}

export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function sleepDuration(entry: { started_at: string; ended_at: string | null }): number | null {
  const start = new Date(entry.started_at)
  const end = entry.ended_at ? new Date(entry.ended_at) : new Date()
  if (end < start) return null
  return Math.round((end.getTime() - start.getTime()) / 60000)
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function firstWeekday(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay()
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d.getTime() + n * DAY_MS)
  return copy
}
