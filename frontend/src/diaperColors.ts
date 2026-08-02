export interface DiaperColor {
  key: string
  label: string
  hex: string
}

export const DIAPER_COLORS: DiaperColor[] = [
  { key: 'pale-yellow', label: 'Pale yellow', hex: '#f5e59c' },
  { key: 'yellow', label: 'Yellow', hex: '#f2d21f' },
  { key: 'mustard', label: 'Mustard', hex: '#e6b93d' },
  { key: 'orange', label: 'Orange', hex: '#e8963a' },
  { key: 'pale-green', label: 'Pale green', hex: '#b5d99c' },
  { key: 'green', label: 'Green', hex: '#7fb069' },
  { key: 'dark-green', label: 'Dark green', hex: '#4e6e3f' },
  { key: 'light-brown', label: 'Light brown', hex: '#c9a37e' },
  { key: 'brown', label: 'Brown', hex: '#9b6a3f' },
  { key: 'dark-brown', label: 'Dark brown', hex: '#6b4526' },
  { key: 'black', label: 'Black / meconium', hex: '#3a3530' },
]

export function getDiaperColor(key: string | undefined): DiaperColor | undefined {
  return DIAPER_COLORS.find((c) => c.key === key)
}
