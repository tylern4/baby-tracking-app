import type { Entry, EntryInput, MonthSummary, RegisterResult, Role, StatsOut, User, UserAdmin } from './types'

const TOKEN_KEY = 'baby_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`/api${path}`, { ...options, headers })

  if (res.status === 401) {
    clearToken()
    if (!path.startsWith('/auth/login')) window.location.assign('/login')
    throw new ApiError(401, 'Not authenticated')
  }

  if (res.status === 204) return undefined as T

  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }

  if (!res.ok) {
    const detail =
      typeof (body as { detail?: unknown })?.detail === 'string'
        ? ((body as { detail: string }).detail)
        : res.statusText
    throw new ApiError(res.status, detail)
  }

  return body as T
}

export const api = {
  register: (data: { name: string; email: string; password: string; invite_code: string }) =>
    request<RegisterResult>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  me: () => request<User>('/auth/me'),
  listEntries: (params: { from?: string; to?: string; type?: string } = {}) => {
    const qs = new URLSearchParams()
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    if (params.type) qs.set('type', params.type)
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return request<Entry[]>(`/entries${suffix}`)
  },
  createEntry: (data: EntryInput) =>
    request<Entry>('/entries', { method: 'POST', body: JSON.stringify(data) }),
  updateEntry: (id: number, data: Partial<EntryInput>) =>
    request<Entry>(`/entries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEntry: (id: number) => request<void>(`/entries/${id}`, { method: 'DELETE' }),
  monthSummary: (year: number, month: number, tzOffset: number) =>
    request<MonthSummary>(
      `/summary?year=${year}&month=${month}&tz_offset=${tzOffset}`,
    ),
  stats: (from: string, to: string, tzOffset: number) =>
    request<StatsOut>(`/stats?from=${from}&to=${to}&tz_offset=${tzOffset}`),
  listUsers: () => request<UserAdmin[]>('/users'),
  approveUser: (id: number) => request<UserAdmin>(`/users/${id}/approve`, { method: 'POST' }),
  denyUser: (id: number) => request<UserAdmin>(`/users/${id}/deny`, { method: 'POST' }),
  setUserRole: (id: number, role: Role) =>
    request<UserAdmin>(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  deleteUser: (id: number) => request<void>(`/users/${id}`, { method: 'DELETE' }),
}
