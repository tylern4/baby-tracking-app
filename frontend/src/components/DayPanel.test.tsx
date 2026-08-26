import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DayPanel } from './DayPanel'
import type { Entry } from '../types'

const date = new Date(2026, 1, 5)

const entries: Entry[] = [
  {
    id: 1,
    user_id: 1,
    type: 'feed',
    started_at: '2026-02-05T14:00:00.000Z',
    ended_at: null,
    details: { amount_ml: 90, method: 'bottle' },
    note: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: 2,
    user_id: 1,
    type: 'sleep',
    started_at: '2026-02-05T20:00:00.000Z',
    ended_at: '2026-02-05T22:15:00.000Z',
    details: {},
    note: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: 3,
    user_id: 1,
    type: 'diaper',
    started_at: '2026-02-05T09:00:00.000Z',
    ended_at: null,
    details: { color: 'green', wet: true, dirty: false },
    note: null,
    created_at: '',
    updated_at: '',
  },
]

function renderPanel(props: Partial<Parameters<typeof DayPanel>[0]> = {}) {
  return render(
    <DayPanel
      date={date}
      entries={entries}
      loading={false}
      canEdit
      onAdd={vi.fn()}
      onEdit={vi.fn()}
      {...props}
    />,
  )
}

describe('DayPanel', () => {
  it('shows an empty state', () => {
    renderPanel({ entries: [] })
    expect(screen.getByText(/Nothing logged yet/)).toBeInTheDocument()
  })

  it('shows loading', () => {
    renderPanel({ loading: true, entries: [] })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders entries with details and durations', () => {
    renderPanel()
    expect(screen.getByText(/· Feed/)).toBeInTheDocument()
    expect(screen.getByText(/90 ml · bottle/)).toBeInTheDocument()
    expect(screen.getByText(/2h 15m/)).toBeInTheDocument()
    expect(screen.getByText(/Wet/)).toBeInTheDocument()
  })

  it('shows the diaper color only when the diaper is dirty', () => {
    const { rerender } = renderPanel()
    expect(screen.queryByText(/Green/)).not.toBeInTheDocument()
    const dirtyDiaper: Entry = {
      ...entries[2],
      details: { color: 'green', wet: false, dirty: true },
    }
    rerender(
      <DayPanel
        date={date}
        entries={[dirtyDiaper]}
        loading={false}
        canEdit
        onAdd={vi.fn()}
        onEdit={vi.fn()}
      />,
    )
    expect(screen.getByText(/Green · Dirty/)).toBeInTheDocument()
  })

  it('shows sleeping state when the end is before the start', () => {
    const openSleep: Entry = {
      ...entries[1],
      started_at: '2026-12-25T00:00:00.000Z',
      ended_at: null,
    }
    renderPanel({ entries: [openSleep] })
    expect(screen.getByText('Sleeping…')).toBeInTheDocument()
  })

  it('hides edit controls when canEdit is false', () => {
    renderPanel({ canEdit: false })
    expect(screen.queryByRole('button', { name: 'Edit entry' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
  })

  it('calls onEdit with the entry', async () => {
    const onEdit = vi.fn()
    const user = userEvent.setup()
    renderPanel({ onEdit })
    await user.click(screen.getAllByRole('button', { name: 'Edit entry' })[0])
    expect(onEdit).toHaveBeenCalledWith(entries[0])
  })
})
