import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import type { ReactNode } from 'react'
import type { User } from './types'

const useAuthMock = vi.hoisted(() => vi.fn())

vi.mock('./auth', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => useAuthMock(),
}))

const activeUser: User = { id: 1, name: 'Tester', email: 't@t.com', role: 'admin', status: 'active' }

function authState(overrides: Record<string, unknown> = {}) {
  return {
    user: null,
    loading: false,
    canEdit: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  }
}

describe('App routing', () => {
  it('redirects unauthenticated users to the login page', async () => {
    useAuthMock.mockReturnValue(authState({ user: null }))
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('shows loading while authentication is in progress', () => {
    useAuthMock.mockReturnValue(authState({ loading: true }))
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders the calendar for an authenticated user', async () => {
    useAuthMock.mockReturnValue(authState({ user: activeUser, canEdit: true }))
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('button', { name: 'Today' })).toBeInTheDocument()
  })
})
