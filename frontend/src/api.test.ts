import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, clearToken, getToken, setToken } from './api'

const assignMock = vi.fn()

Object.defineProperty(window, 'location', {
  writable: true,
  value: { ...window.location, assign: assignMock },
})

function mockFetch(status: number, body: unknown) {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

beforeEach(() => {
  localStorage.clear()
  assignMock.mockClear()
  vi.stubGlobal('fetch', vi.fn())
})

describe('token storage', () => {
  it('round-trips the token', () => {
    expect(getToken()).toBeNull()
    setToken('abc')
    expect(getToken()).toBe('abc')
    clearToken()
    expect(getToken()).toBeNull()
  })
})

describe('request', () => {
  it('sends the auth header when a token is stored', async () => {
    setToken('tok123')
    mockFetch(200, [{ id: 1 }])
    await api.listEntries()
    expect(fetch).toHaveBeenCalledWith(
      '/api/entries',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok123' }),
      }),
    )
  })

  it('sends a JSON content-type when a body is present', async () => {
    mockFetch(200, { access_token: 'x' })
    await api.login({ email: 'a@b.com', password: 'secret1' })
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
  })

  it('returns parsed JSON on success', async () => {
    mockFetch(200, { ok: true })
    await expect(api.me()).resolves.toEqual({ ok: true })
  })

  it('returns undefined for 204 responses', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
    await expect(api.deleteEntry(3)).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith(
      '/api/entries/3',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('surfaces the API detail message on errors', async () => {
    mockFetch(400, { detail: 'End time must be after start time' })
    await expect(api.createEntry({ type: 'feed', started_at: '2026-01-01T00:00:00Z' })).rejects.toThrow(
      'End time must be after start time',
    )
  })

  it('throws ApiError with the status code', async () => {
    mockFetch(500, { detail: 'boom' })
    const error = await api
      .listEntries()
      .then(() => null)
      .catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(500)
  })

  it('clears the token and redirects to login on 401', async () => {
    setToken('expired')
    mockFetch(401, { detail: 'Not authenticated' })
    await expect(api.listEntries()).rejects.toMatchObject({ status: 401 })
    expect(getToken()).toBeNull()
    expect(assignMock).toHaveBeenCalledWith('/login')
  })

  it('does not redirect for a failed login', async () => {
    mockFetch(401, { detail: 'Incorrect email or password' })
    await expect(
      api.login({ email: 'a@b.com', password: 'wrong' }),
    ).rejects.toMatchObject({ status: 401 })
    expect(assignMock).not.toHaveBeenCalled()
  })
})
