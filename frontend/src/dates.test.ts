import { describe, expect, it } from 'vitest'
import {
  addDays,
  daysInMonth,
  firstWeekday,
  formatMinutes,
  parseInputValue,
  parseISODate,
  roundToNearest15,
  sleepDuration,
  startOfDay,
  toInputValue,
  toISODate,
} from './dates'

describe('toISODate / parseISODate', () => {
  it('round-trips local dates', () => {
    const iso = toISODate(new Date(2026, 1, 5))
    expect(iso).toBe('2026-02-05')
    const parsed = parseISODate('2026-02-05')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(1)
    expect(parsed.getDate()).toBe(5)
  })

  it('pads month and day', () => {
    expect(toISODate(new Date(2026, 0, 3))).toBe('2026-01-03')
  })
})

describe('startOfDay', () => {
  it('zeroes the time portion', () => {
    const d = startOfDay(new Date(2026, 2, 15, 14, 32, 11))
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getSeconds()).toBe(0)
    expect(d.getDate()).toBe(15)
  })
})

describe('addDays', () => {
  it('moves across month boundaries', () => {
    expect(toISODate(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01')
    expect(toISODate(addDays(new Date(2026, 1, 1), -1))).toBe('2026-01-31')
  })
})

describe('formatMinutes', () => {
  it('formats durations', () => {
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(120)).toBe('2h')
    expect(formatMinutes(125)).toBe('2h 5m')
  })
})

describe('sleepDuration', () => {
  it('computes minutes between start and end', () => {
    expect(
      sleepDuration({
        started_at: '2026-02-01T21:00:00.000Z',
        ended_at: '2026-02-02T05:30:00.000Z',
      }),
    ).toBe(510)
  })

  it('returns null when end is before start', () => {
    expect(
      sleepDuration({
        started_at: '2026-02-02T05:00:00.000Z',
        ended_at: '2026-02-01T21:00:00.000Z',
      }),
    ).toBeNull()
  })

  it('returns a duration for open-ended sleep', () => {
    const minutes = sleepDuration({
      started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      ended_at: null,
    })
    expect(minutes).not.toBeNull()
  })
})

describe('calendar helpers', () => {
  it('counts days in a month', () => {
    expect(daysInMonth(2026, 1)).toBe(31)
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2028, 2)).toBe(29)
  })

  it('computes the first weekday', () => {
    expect(firstWeekday(2026, 1)).toBe(4) // Jan 1 2026 is a Thursday
  })
})

describe('datetime-local round trip', () => {
  it('converts to and from input values', () => {
    const v = toInputValue(new Date(2026, 1, 5, 14, 30))
    expect(v).toBe('2026-02-05T14:30')
    const parsed = parseInputValue(v)
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(1)
    expect(parsed.getDate()).toBe(5)
  })
})

describe('roundToNearest15', () => {
  it('rounds down below the midpoint', () => {
    expect(roundToNearest15(new Date(2026, 1, 5, 14, 5)).getMinutes()).toBe(0)
    expect(roundToNearest15(new Date(2026, 1, 5, 14, 7)).getMinutes()).toBe(0)
  })

  it('rounds up at and past the midpoint', () => {
    expect(roundToNearest15(new Date(2026, 1, 5, 14, 8)).getMinutes()).toBe(15)
    expect(roundToNearest15(new Date(2026, 1, 5, 14, 13)).getMinutes()).toBe(15)
  })

  it('aligns exact quarters', () => {
    expect(roundToNearest15(new Date(2026, 1, 5, 14, 0)).getMinutes()).toBe(0)
    expect(roundToNearest15(new Date(2026, 1, 5, 14, 15)).getMinutes()).toBe(15)
    expect(roundToNearest15(new Date(2026, 1, 5, 14, 30)).getMinutes()).toBe(30)
    expect(roundToNearest15(new Date(2026, 1, 5, 14, 45)).getMinutes()).toBe(45)
  })

  it('rolls over the hour and zeroes seconds', () => {
    const rolled = roundToNearest15(new Date(2026, 1, 5, 14, 55))
    expect(rolled.getHours()).toBe(15)
    expect(rolled.getMinutes()).toBe(0)
    expect(rolled.getSeconds()).toBe(0)
  })
})
