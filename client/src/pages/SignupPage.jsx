import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getPublicCharities } from '../services/publicService'

function SignupPage() {
  const { signup, login } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '', charity_id: '', charity_percent: '10' })
  const [charities, setCharities] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadCharities = async () => {
      try {
        const payload = await getPublicCharities()
        const list = payload?.charities || []
        setCharities(list)
      } catch {
        setCharities([])
      }
    }

    loadCharities()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const charityId = Number(form.charity_id)
      const charityPercent = Number(form.charity_percent)

      if (!Number.isInteger(charityId) || charityId <= 0) {
        throw new Error('Please select a charity.')
      }

      if (!Number.isFinite(charityPercent) || charityPercent < 10 || charityPercent > 100) {
        throw new Error('Contribution percentage must be between 10 and 100.')
      }

      const signupPayload = {
        email: form.email,
        password: form.password,
        charity_id: charityId,
        charity_percent: charityPercent,
      }

      await signup(signupPayload)
      await login({ email: form.email, password: form.password })
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

        <div>
          <label htmlFor="charity" className="mb-1 block text-sm font-semibold text-slate-700">
            Select Charity
          </label>
          <select
            id="charity"
            className="input"
            value={form.charity_id}
            onChange={(event) => setForm((prev) => ({ ...prev, charity_id: event.target.value }))}
            required
          >
            <option value="">Choose a charity</option>
            {charities.map((charity) => (
              <option key={charity.id} value={charity.id}>{charity.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="charity-percent" className="mb-1 block text-sm font-semibold text-slate-700">
            Charity Contribution (%)
          </label>
          <input
            id="charity-percent"
            className="input"
            type="number"
            min="10"
            max="100"
            step="0.01"
            value={form.charity_percent}
            onChange={(event) => setForm((prev) => ({ ...prev, charity_percent: event.target.value }))}
            required
          />
          <p className="mt-1 text-xs text-slate-500">Minimum contribution is 10%.</p>
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
