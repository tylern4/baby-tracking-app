import { useCallback, useEffect, useState } from 'react'
import { Baby, CalendarDays, LogOut, ShieldCheck, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { api, ApiError } from '../api'
import type { Role, UserAdmin } from '../types'

const STATUS_LABEL: Record<UserAdmin['status'], string> = {
  pending: 'Pending approval',
  active: 'Active',
  denied: 'Denied',
}

export function AdminPage() {
  const { user, logout } = useAuth()
  const [users, setUsers] = useState<UserAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [resetTarget, setResetTarget] = useState<UserAdmin | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSaving, setResetSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(await api.listUsers())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed.')
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetError(null)
    if (resetPassword.length < 8) {
      setResetError('Password must be at least 8 characters.')
      return
    }
    if (resetPassword !== resetConfirm) {
      setResetError('Passwords do not match.')
      return
    }
    if (!resetTarget) return
    setResetSaving(true)
    try {
      await api.resetPassword(resetTarget.id, resetPassword)
      await load()
      closeReset()
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : 'Failed to reset password.')
    } finally {
      setResetSaving(false)
    }
  }

  function openReset(u: UserAdmin) {
    setResetTarget(u)
    setResetPassword('')
    setResetConfirm('')
    setResetError(null)
  }

  function closeReset() {
    setResetTarget(null)
    setResetPassword('')
    setResetConfirm('')
    setResetError(null)
  }

  function confirmDelete(u: UserAdmin) {
    if (window.confirm(`Delete ${u.name}? This cannot be undone.`)) {
      run(() => api.deleteUser(u.id))
    }
  }

  const pendingCount = users.filter((u) => u.status === 'pending').length

  return (
    <div>
      <header className="topbar">
        <div className="brand">
          <Baby size={22} color="#e8848a" /> Baby Tracker
        </div>
        <div className="topbar-actions">
          <span>{user?.name}</span>
          <Link className="btn btn-ghost btn-sm" to="/">
            <CalendarDays size={15} /> Calendar
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            <LogOut size={15} /> Log out
          </button>
        </div>
      </header>

      <div className="layout">
        <div className="card">
          <div className="cal-header">
            <div className="cal-title">
              <ShieldCheck size={18} style={{ verticalAlign: '-3px' }} /> Users
            </div>
            {pendingCount > 0 && (
              <span className="admin-pending-badge">{pendingCount} awaiting approval</span>
            )}
          </div>

          {error && <div className="error-banner admin-error">{error}</div>}

          {loading && <div className="empty-day">Loading…</div>}

          {!loading && users.length === 0 && (
            <div className="empty-day">No users yet.</div>
          )}

          <div className="admin-list">
            {users.map((u) => (
              <div key={u.id} className="admin-row">
                <div className="admin-main">
                  <div className="admin-name">
                    {u.name}
                    {u.id === user?.id && <span className="admin-self">you</span>}
                  </div>
                  <div className="admin-email">{u.email}</div>
                </div>

                <span className={`admin-status ${u.status}`}>{STATUS_LABEL[u.status]}</span>

                <select
                  className="admin-role"
                  value={u.role}
                  disabled={u.id === user?.id}
                  title="Account type"
                  onChange={(e) => run(() => api.setUserRole(u.id, e.target.value as Role))}
                >
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                  <option value="read_only">Read-only</option>
                </select>

                <div className="admin-actions">
                  {u.status !== 'active' && (
                    <button
                      className="btn btn-sm"
                      onClick={() => run(() => api.approveUser(u.id))}
                    >
                      Approve
                    </button>
                  )}
                  {u.id !== user?.id && u.status !== 'denied' && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => run(() => api.denyUser(u.id))}
                    >
                      Deny
                    </button>
                  )}
                  <button
                    className="btn btn-sm"
                    onClick={() => openReset(u)}
                  >
                    Reset password
                  </button>
                  {u.id !== user?.id && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => confirmDelete(u)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {resetTarget && (
        <div className="modal-backdrop" role="dialog" onMouseDown={(e) => e.target === e.currentTarget && closeReset()}>
          <form className="modal" aria-label="Reset password" onSubmit={handleResetPassword}>
            <div className="modal-header">
              <strong>Reset password for {resetTarget.name}</strong>
              <button type="button" className="icon-btn" onClick={closeReset} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {resetError && <div className="error-banner">{resetError}</div>}
              <div className="field">
                <label htmlFor="reset-password">New password</label>
                <input
                  id="reset-password"
                  type="password"
                  autoFocus
                  required
                  minLength={8}
                  maxLength={128}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="reset-confirm">Confirm password</label>
                <input
                  id="reset-confirm"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={closeReset}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={resetSaving}>
                  {resetSaving ? <span className="spinner" /> : 'Reset password'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
