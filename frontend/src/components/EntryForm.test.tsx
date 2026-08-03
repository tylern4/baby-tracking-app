import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EntryForm } from './EntryForm'
import type { Entry } from '../types'

const api = vi.hoisted(() => ({
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
}))

vi.mock('../api', () => ({ api }))

const sleepEntry: Entry = {
  id: 5,
  user_id: 1,
  type: 'sleep',
  started_at: '2026-02-05T20:00:00.000Z',
  ended_at: '2026-02-05T22:15:00.000Z',
  details: {},
  note: 'nap',
  created_at: '',
  updated_at: '',
}

function renderForm(props: Partial<Parameters<typeof EntryForm>[0]> = {}) {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  const utils = render(
    <EntryForm
      open
      entry={null}
      defaultDate={new Date(2026, 1, 5)}
      onClose={onClose}
      onSaved={onSaved}
      {...props}
    />,
  )
  return { onClose, onSaved, ...utils }
}

beforeEach(() => {
  api.createEntry.mockReset()
  api.updateEntry.mockReset()
  api.deleteEntry.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('EntryForm', () => {
  it('renders nothing when closed', () => {
    renderForm({ open: false })
    expect(screen.queryByText('Add entry')).not.toBeInTheDocument()
  })

  it('requires a start time', async () => {
    const { container } = renderForm()
    const form = container.querySelector('form') as HTMLFormElement
    const start = container.querySelector('input[type="datetime-local"]') as HTMLInputElement
    fireEvent.change(start, { target: { value: '' } })
    fireEvent.submit(form)
    expect(screen.getByText('Start time is required.')).toBeInTheDocument()
    expect(api.createEntry).not.toHaveBeenCalled()
  })

  it('rejects an end time before the start time', async () => {
    const user = userEvent.setup()
    const { container } = renderForm()
    await user.click(screen.getByRole('button', { name: 'Sleep' }))
    const inputs = container.querySelectorAll('input[type="datetime-local"]')
    fireEvent.change(inputs[0], { target: { value: '2026-02-05T14:00' } })
    fireEvent.change(inputs[1], { target: { value: '2026-02-05T10:00' } })
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText('End time must be after start time.')).toBeInTheDocument()
    expect(api.createEntry).not.toHaveBeenCalled()
  })

  it('creates a diaper entry', async () => {
    const user = userEvent.setup()
    const { onClose, onSaved } = renderForm()
    await user.click(screen.getByRole('button', { name: 'Diaper' }))
    await user.click(screen.getByText('Wet'))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(api.createEntry).toHaveBeenCalledTimes(1))
    expect(api.createEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'diaper',
        ended_at: null,
        details: { wet: true, dirty: false, color: 'mustard' },
      }),
    )
    expect(onSaved).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('prefills and updates an existing entry', async () => {
    const user = userEvent.setup()
    const { container, onClose, onSaved } = renderForm({ entry: sleepEntry })
    expect(screen.getByText('Edit entry')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sleep' })).toBeDisabled()
    const inputs = container.querySelectorAll('input[type="datetime-local"]')
    expect((inputs[0] as HTMLInputElement).value).toBeTruthy()
    expect((inputs[1] as HTMLInputElement).value).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText('Optional…'), { target: { value: 'new note' } })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(api.updateEntry).toHaveBeenCalledWith(5, expect.objectContaining({ type: 'sleep', note: 'new note' })),
    )
    expect(onSaved).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('deletes an entry after confirmation', async () => {
    const user = userEvent.setup()
    const { onClose, onSaved } = renderForm({ entry: sleepEntry })
    vi.stubGlobal('confirm', vi.fn(() => true))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(api.deleteEntry).toHaveBeenCalledWith(5))
    expect(onSaved).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup()
    renderForm({ entry: sleepEntry })
    vi.stubGlobal('confirm', vi.fn(() => false))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(api.deleteEntry).not.toHaveBeenCalled()
  })
})
