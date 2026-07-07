import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="fullscreen-center text-muted">Laster …</div>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
