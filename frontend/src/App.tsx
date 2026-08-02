import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import { CalendarPage } from './pages/CalendarPage'
import { AdminPage } from './pages/AdminPage'
import { StatsPage } from './pages/StatsPage'
import { LoginPage } from './pages/Login'
import { RegisterPage } from './pages/Register'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="centered">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="centered">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <CalendarPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/stats"
        element={
          <RequireAuth>
            <StatsPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
