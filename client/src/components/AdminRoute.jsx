import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function AdminRoute() {
  const { user, isAuthenticated, isAuthLoading } = useAuth()
  const location = useLocation()

  const adminEmail = String(import.meta.env.VITE_ADMIN_EMAIL || 'admin@golf.com').toLowerCase()
  const isAdmin = String(user?.email || '').toLowerCase() === adminEmail

  if (isAuthLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-600">Loading your account...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default AdminRoute
