import { useCallback, useEffect, useState } from 'react'
import { Baby, CalendarDays, LogOut, ShieldCheck } from 'lucide-react'
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
                  {u.id !== user?.id && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => run(() => api.deleteUser(u.id))}
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
    </div>
  )
}
