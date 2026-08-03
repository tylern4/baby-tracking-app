import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Calendar } from './Calendar'
import { startOfDay } from '../dates'

function renderCalendar(props: Partial<Parameters<typeof Calendar>[0]> = {}) {
  return render(
    <Calendar
      year={2026}
      month={2}
      summary={{}}
      selectedDate={startOfDay(new Date(2026, 1, 1))}
      today={new Date(2026, 1, 1)}
      onSelectDay={vi.fn()}
      {...props}
    />,
  )
}

describe('Calendar', () => {
  it('renders weekday headers and day numbers', () => {
    renderCalendar()
    for (const w of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      expect(screen.getByText(w)).toBeInTheDocument()
    }
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('28')).toBeInTheDocument()
  })

  it('renders leading empty cells for months that start mid-week', () => {
    const { container } = renderCalendar({ year: 2026, month: 1 })
    expect(container.querySelectorAll('.day-cell.other-month')).toHaveLength(4)
  })

  it('marks today and the selected day', () => {
    const { container } = renderCalendar({
      today: new Date(2026, 1, 10),
      selectedDate: startOfDay(new Date(2026, 1, 5)),
    })
    expect(container.querySelector('.day-cell.today')).toHaveTextContent('10')
    expect(container.querySelector('.day-cell.selected')).toHaveTextContent('5')
  })

  it('shows per-day summary stats', () => {
    renderCalendar({
      summary: {
        '2026-02-03': {
          feeds: 4,
          feed_ml: 120,
          feed_minutes: 0,
          sleeps: 2,
          sleep_minutes: 130,
          diapers: 5,
          wet: 3,
          dirty: 2,
        },
      },
    })
    const cell = screen.getByText('3').closest('button') as HTMLButtonElement
    expect(within(cell).getByText(/120ml/)).toBeInTheDocument()
    expect(within(cell).getByText(/2h 10m/)).toBeInTheDocument()
    expect(within(cell).getByText('5')).toBeInTheDocument()
  })

  it('calls onSelectDay when a day is clicked', async () => {
    const onSelectDay = vi.fn()
    const user = userEvent.setup()
    renderCalendar({ onSelectDay })
    await user.click(screen.getByText('15'))
    expect(onSelectDay).toHaveBeenCalledTimes(1)
    const arg = onSelectDay.mock.calls[0][0] as Date
    expect(arg.getDate()).toBe(15)
    expect(arg.getMonth()).toBe(1)
  })
})
