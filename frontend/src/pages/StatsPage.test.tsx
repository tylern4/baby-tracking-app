import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { StatsPage } from './StatsPage'
import { defaultAuth } from '../test/utils'
import { addDays, parseISODate, toISODate } from '../dates'

const mocks = vi.hoisted(() => {
  const api = { stats: vi.fn() }
  const useAuth = vi.fn()
  return { api, useAuth }
})

vi.mock('../api', () => ({ api: mocks.api }))
vi.mock('../auth', () => ({
  AuthProvider: ({ children }: { children: import('react').ReactNode }) => children,
  useAuth: () => mocks.useAuth(),
}))

function daySummary(overrides: Record<string, unknown> = {}) {
  return {
    feeds: 3,
    feed_ml: 90,
    feed_minutes: 10,
    sleeps: 1,
    sleep_minutes: 60,
    diapers: 2,
    wet: 1,
    dirty: 1,
    ...overrides,
  }
}

function isoDaysBetween(a: string, b: string) {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86400000)
}

function buildRange(days: number) {
  const end = new Date()
  const start = addDays(end, -(days - 1))
  const result: Record<string, ReturnType<typeof daySummary>> = {}
  let cur = start
  while (cur <= end) {
    result[toISODate(cur)] = daySummary()
    cur = addDays(cur, 1)
  }
  return { start: toISODate(start), end: toISODate(end), days: result }
}

beforeEach(() => {
  mocks.api.stats.mockReset()
  mocks.useAuth.mockReset()
  mocks.useAuth.mockReturnValue(defaultAuth())
})

describe('StatsPage', () => {
  it('loads stats and shows totals across the range', async () => {
    const data = buildRange(14)
    mocks.api.stats.mockResolvedValue(data)
    render(
      <MemoryRouter>
        <StatsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('feeds')).toBeInTheDocument()
    expect(screen.getByText(/42 feeds · 1260 ml/)).toBeInTheDocument()
    expect(screen.getByText(/14\.0h sleep/)).toBeInTheDocument()
    expect(screen.getByText(/28 diapers/)).toBeInTheDocument()

    const call = mocks.api.stats.mock.calls[0]
    expect(isoDaysBetween(call[0] as string, call[1] as string)).toBe(13)
  })

  it('renders a tooltip per day with values', async () => {
    mocks.api.stats.mockResolvedValue(buildRange(14))
    render(
      <MemoryRouter>
        <StatsPage />
      </MemoryRouter>,
    )
    await screen.findByText('feeds')
    expect(screen.getAllByText('Feeds 3')).toHaveLength(14)
    expect(screen.getAllByText('Sleep 1.0h')).toHaveLength(14)
    expect(screen.getAllByText('Diapers 2')).toHaveLength(14)
  })

  it('switches to a single-type view', async () => {
    const user = userEvent.setup()
    mocks.api.stats.mockResolvedValue(buildRange(14))
    render(
      <MemoryRouter>
        <StatsPage />
      </MemoryRouter>,
    )
    await screen.findByText('feeds')
    await user.click(screen.getByRole('button', { name: 'Sleep' }))
    expect(await screen.findByText(/14\.0h sleep/)).toBeInTheDocument()
    expect(screen.queryByText('feeds')).not.toBeInTheDocument()
  })

  it('refetches when a range preset is clicked', async () => {
    const user = userEvent.setup()
    mocks.api.stats.mockResolvedValue(buildRange(14))
    render(
      <MemoryRouter>
        <StatsPage />
      </MemoryRouter>,
    )
    await screen.findByText('feeds')
    await user.click(screen.getByRole('button', { name: '7d' }))
    await waitFor(() => expect(mocks.api.stats).toHaveBeenCalledTimes(2))
    const call = mocks.api.stats.mock.calls[1]
    expect(isoDaysBetween(call[0] as string, call[1] as string)).toBe(6)
  })

  it('shows an empty message when there is no data', async () => {
    mocks.api.stats.mockResolvedValue({ start: '2026-01-01', end: '2026-01-14', days: {} })
    render(
      <MemoryRouter>
        <StatsPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('No entries in this range.')).toBeInTheDocument()
  })
})
