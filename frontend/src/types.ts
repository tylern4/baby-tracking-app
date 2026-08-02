export type EntryType = 'feed' | 'sleep' | 'diaper'

export type Role = 'admin' | 'user' | 'read_only'

export type UserStatus = 'pending' | 'active' | 'denied'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  status: UserStatus
}

export interface UserAdmin extends User {
  created_at: string
}

export interface RegisterResult {
  user: User
  access_token: string | null
}

export interface Entry {
  id: number
  user_id: number | null
  type: EntryType
  started_at: string
  ended_at: string | null
  details: Record<string, unknown>
  note: string | null
  created_at: string
  updated_at: string
}

export interface EntryInput {
  type: EntryType
  started_at: string
  ended_at?: string | null
  details?: Record<string, unknown>
  note?: string | null
}

export interface DaySummary {
  feeds: number
  feed_ml: number
  feed_minutes: number
  sleeps: number
  sleep_minutes: number
  diapers: number
  wet: number
  dirty: number
}

export interface MonthSummary {
  month: string
  days: Record<string, DaySummary>
}

export interface StatsOut {
  start: string
  end: string
  days: Record<string, DaySummary>
}
