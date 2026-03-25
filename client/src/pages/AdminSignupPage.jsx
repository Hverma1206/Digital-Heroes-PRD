import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

function AdminSignupPage() {
  const { signup, login } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const adminEmail = String(import.meta.env.VITE_ADMIN_EMAIL || 'admin@golf.com').toLowerCase()

  const [form, setForm] = useState({ email: adminEmail, password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (String(form.email || '').trim().toLowerCase() !== adminEmail) {
        throw new Error(`Admin signup is restricted to ${adminEmail}`)
      }

      await signup(form)
      await login(form)
      addToast('Admin signup successful.', 'success')
      navigate('/admin', { replace: true })
    } catch (err) {
      const message = err?.response?.data?.message || err.message || 'Unable to create admin account.'
      setError(message)
      addToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Admin Sign up" subtitle="Create the admin portal account configured for this deployment.">
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Allowed admin ID: <strong>{adminEmail}</strong>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="admin-signup-email" className="mb-1 block text-sm font-semibold text-slate-700">
            Admin Email
          </label>
          <input
            id="admin-signup-email"
            className="input"
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="admin-signup-password" className="mb-1 block text-sm font-semibold text-slate-700">
            Password
          </label>
          <input
            id="admin-signup-password"
            className="input"
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required
            autoComplete="new-password"
            minLength={6}
          />
        </div>

        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Admin Account'}
        </button>
      </form>

      <p className="mt-5 text-sm text-slate-600">
        Already have admin access?{' '}
        <Link className="font-semibold text-cyan-700 hover:text-cyan-800" to="/admin/login">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}

export default AdminSignupPage
