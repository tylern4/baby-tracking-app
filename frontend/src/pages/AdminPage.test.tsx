import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AdminPage } from './AdminPage'
import { defaultAuth } from '../test/utils'
import type { UserAdmin } from '../types'

const mocks = vi.hoisted(() => {
  const api = {
    listUsers: vi.fn(),
    approveUser: vi.fn(),
    denyUser: vi.fn(),
    setUserRole: vi.fn(),
    deleteUser: vi.fn(),
  }
  const useAuth = vi.fn()
  class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }
  return { api, useAuth, ApiError }
})

vi.mock('../api', () => ({ api: mocks.api, ApiError: mocks.ApiError }))
vi.mock('../auth', () => ({
  AuthProvider: ({ children }: { children: import('react').ReactNode }) => children,
  useAuth: () => mocks.useAuth(),
}))

const users: UserAdmin[] = [
  { id: 1, name: 'Admin', email: 'admin@x.com', role: 'admin', status: 'active', created_at: '2026-01-01T00:00:00Z' },
  { id: 2, name: 'Pending', email: 'pending@x.com', role: 'user', status: 'pending', created_at: '2026-01-02T00:00:00Z' },
  { id: 3, name: 'Active', email: 'active@x.com', role: 'user', status: 'active', created_at: '2026-01-03T00:00:00Z' },
]

function renderAdmin() {
  return render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  for (const fn of Object.values(mocks.api)) {
    fn.mockReset()
  }
  mocks.useAuth.mockReset()
  mocks.useAuth.mockReturnValue(defaultAuth())
  mocks.api.listUsers.mockResolvedValue(users)
  mocks.api.approveUser.mockResolvedValue(users[1])
  mocks.api.denyUser.mockResolvedValue(users[1])
  mocks.api.setUserRole.mockResolvedValue(users[2])
})

describe('AdminPage', () => {
  it('lists users and shows the pending badge', async () => {
    renderAdmin()
    expect(await screen.findByText('admin@x.com')).toBeInTheDocument()
    expect(screen.getByText('pending@x.com')).toBeInTheDocument()
    expect(screen.getByText('active@x.com')).toBeInTheDocument()
    expect(screen.getByText('1 awaiting approval')).toBeInTheDocument()
  })

  it('approves a pending user', async () => {
    const user = userEvent.setup()
    renderAdmin()
    await screen.findByText('pending@x.com')
    await user.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(mocks.api.approveUser).toHaveBeenCalledWith(2))
    expect(mocks.api.listUsers).toHaveBeenCalledTimes(2)
  })

  it('changes a user role', async () => {
    renderAdmin()
    await screen.findByText('active@x.com')
    const row = screen.getByText('active@x.com').closest('.admin-row') as HTMLElement
    fireEvent.change(within(row).getByRole('combobox'), { target: { value: 'read_only' } })
    await waitFor(() => expect(mocks.api.setUserRole).toHaveBeenCalledWith(3, 'read_only'))
  })

  it('marks the current user as self and disables their controls', async () => {
    renderAdmin()
    expect(await screen.findByText('you')).toBeInTheDocument()
    const row = screen.getByText('admin@x.com').closest('.admin-row') as HTMLElement
    expect(within(row).getByRole('combobox')).toBeDisabled()
    expect(within(row).queryByRole('button', { name: 'Deny' })).not.toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('shows an error banner when loading users fails', async () => {
    mocks.api.listUsers.mockRejectedValue(new mocks.ApiError(500, 'boom'))
    renderAdmin()
    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
