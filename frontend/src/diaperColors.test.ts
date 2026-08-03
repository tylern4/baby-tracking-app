import { describe, expect, it } from 'vitest'
import { DIAPER_COLORS, getDiaperColor } from './diaperColors'

describe('getDiaperColor', () => {
  it('looks up colors by key', () => {
    expect(getDiaperColor('mustard')?.label).toBe('Mustard')
    expect(getDiaperColor('black')?.label).toBe('Black / meconium')
  })

  it('returns undefined for unknown keys', () => {
    expect(getDiaperColor('chartreuse')).toBeUndefined()
    expect(getDiaperColor(undefined)).toBeUndefined()
  })

  it('defines unique keys with valid hex colors', () => {
    const keys = new Set(DIAPER_COLORS.map((c) => c.key))
    expect(keys.size).toBe(DIAPER_COLORS.length)
    for (const c of DIAPER_COLORS) {
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})
