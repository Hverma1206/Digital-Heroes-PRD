import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

function AdminLoginPage() {
  const { login, logout } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const adminEmail = String(import.meta.env.VITE_ADMIN_EMAIL || 'admin@golf.com').toLowerCase()
  const defaultPassword = String(import.meta.env.VITE_ADMIN_DEFAULT_PASSWORD || '')
  const redirectTo = location.state?.from?.pathname || '/admin'

  const [form, setForm] = useState({ email: adminEmail, password: defaultPassword })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await login(form)
      const isAdmin = String(user?.email || '').toLowerCase() === adminEmail

      if (!isAdmin) {
        logout()
        throw new Error('This account is not an admin account.')
      }

      addToast('Admin login successful.', 'success')
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const message = err?.response?.data?.message || err.message || 'Unable to login to admin portal.'
      setError(message)
      addToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Admin Sign in" subtitle="Use admin credentials to access draw operations and reporting.">
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Admin ID: <strong>{adminEmail}</strong>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="admin-email" className="mb-1 block text-sm font-semibold text-slate-700">
            Admin Email
          </label>
          <input
            id="admin-email"
            className="input"
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="admin-password" className="mb-1 block text-sm font-semibold text-slate-700">
            Password
          </label>
          <input
            id="admin-password"
            className="input"
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required
            autoComplete="current-password"
          />
        </div>

        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Login to Admin Portal'}
        </button>
      </form>

      <p className="mt-5 text-sm text-slate-600">
        Need admin account setup?{' '}
        <Link className="font-semibold text-cyan-700 hover:text-cyan-800" to="/admin/signup">
          Create admin account
        </Link>
      </p>
    </AuthShell>
  )
}

export default AdminLoginPage
