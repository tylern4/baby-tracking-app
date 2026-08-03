import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CalendarPage } from './CalendarPage'
import { defaultAuth } from '../test/utils'
import { startOfDay, addDays } from '../dates'

const mocks = vi.hoisted(() => {
  const api = {
    monthSummary: vi.fn(),
    listEntries: vi.fn(),
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
  }
  const useAuth = vi.fn()
  return { api, useAuth }
})

vi.mock('../api', () => ({ api: mocks.api }))
vi.mock('../auth', () => ({
  AuthProvider: ({ children }: { children: import('react').ReactNode }) => children,
  useAuth: () => mocks.useAuth(),
}))

const feedEntry = {
  id: 1,
  user_id: 1,
  type: 'feed',
  started_at: '2026-02-05T14:00:00.000Z',
  ended_at: null,
  details: { amount_ml: 90, method: 'bottle' },
  note: null,
  created_at: '',
  updated_at: '',
}

beforeEach(() => {
  for (const fn of Object.values(mocks.api)) {
    fn.mockReset()
  }
  mocks.useAuth.mockReset()
  mocks.useAuth.mockReturnValue(defaultAuth())
  mocks.api.monthSummary.mockResolvedValue({ month: '2026-02', days: {} })
  mocks.api.listEntries.mockResolvedValue([])
  mocks.api.createEntry.mockResolvedValue(feedEntry)
})

describe('CalendarPage', () => {
  it('loads the month summary and entries for the selected day', async () => {
    mocks.api.listEntries.mockResolvedValue([feedEntry])
    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText(/· Feed/)).toBeInTheDocument()
    const now = new Date()
    expect(mocks.api.monthSummary).toHaveBeenCalledWith(
      now.getFullYear(),
      now.getMonth() + 1,
      expect.any(Number),
    )
    expect(mocks.api.listEntries).toHaveBeenCalledTimes(1)
  })

  it('navigates months and reloads the summary', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>,
    )
    await screen.findByText('Loading…').catch(() => undefined)
    await waitFor(() => expect(mocks.api.monthSummary).toHaveBeenCalledTimes(1))
    await user.click(screen.getByLabelText('Next month'))
    await waitFor(() => expect(mocks.api.monthSummary).toHaveBeenCalledTimes(2))

    const now = new Date()
    const expectedMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2
    const expectedYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()
    expect(mocks.api.monthSummary).toHaveBeenLastCalledWith(expectedYear, expectedMonth, expect.any(Number))
  })

  it('loads entries when a day is selected', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>,
    )
    await waitFor(() => expect(mocks.api.listEntries).toHaveBeenCalledTimes(1))
    await user.click(screen.getByText('15'))
    await waitFor(() => expect(mocks.api.listEntries).toHaveBeenCalledTimes(2))

    const now = new Date()
    const selected = new Date(now.getFullYear(), now.getMonth(), 15)
    const expectedFrom = startOfDay(selected).toISOString()
    const expectedTo = startOfDay(addDays(selected, 1)).toISOString()
    expect(mocks.api.listEntries).toHaveBeenLastCalledWith({ from: expectedFrom, to: expectedTo })
  })

  it('creates an entry through the add flow', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>,
    )
    await waitFor(() => expect(mocks.api.listEntries).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: 'Add' }))

    const modal = screen.getByText('Add entry').closest('.modal') as HTMLElement
    await user.click(within(modal).getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(mocks.api.createEntry).toHaveBeenCalledTimes(1))
    expect(mocks.api.createEntry).toHaveBeenCalledWith(expect.objectContaining({ type: 'feed' }))
  })
})
