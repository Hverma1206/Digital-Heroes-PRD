import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

function SignupPage() {
  const { signup, login } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signup(form)
      await login(form)
      addToast('Signup successful.', 'success')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const message = err?.response?.data?.message || err.message || 'Unable to create account.'
      setError(message)
      addToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Create account" subtitle="Join the platform and start contributing through your subscriptions and scores.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold text-slate-700">
            Email
          </label>
          <input
            id="email"
            className="input"
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold text-slate-700">
            Password
          </label>
          <input
            id="password"
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
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      <p className="mt-5 text-sm text-slate-600">
        Already have an account?{' '}
        <Link className="font-semibold text-cyan-700 hover:text-cyan-800" to="/login">
          Sign in
        </Link>
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Need admin portal account?{' '}
        <Link className="font-semibold text-cyan-700 hover:text-cyan-800" to="/admin/signup">
          Admin signup
        </Link>
      </p>
    </AuthShell>
  )
}

export default SignupPage
