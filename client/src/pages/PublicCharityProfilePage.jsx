import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPublicCharityProfile } from '../services/publicService'

function PublicCharityProfilePage() {
  const { charityId } = useParams()

  const [charity, setCharity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const payload = await getPublicCharityProfile(charityId)
        setCharity(payload?.charity || null)
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load charity profile.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [charityId])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-4xl px-4 py-12">
        <Link to="/" className="text-sm font-semibold text-teal-300 hover:text-teal-200">Back to home</Link>

        {loading ? (
          <p className="mt-4 text-sm text-slate-300">Loading charity profile...</p>
        ) : error ? (
          <p className="mt-4 rounded-2xl border border-rose-700 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</p>
        ) : !charity ? (
          <p className="mt-4 text-sm text-slate-300">Charity not found.</p>
        ) : (
          <article className="mt-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h1 className="font-display text-3xl text-white">{charity.name}</h1>
            <p className="mt-2 text-sm text-slate-300">{charity.description || 'No description available.'}</p>
            <p className="mt-3 text-xs text-slate-400">{charity.category || 'General'} • {charity.location || 'Unknown location'}</p>
            {charity.image_url && (
              <img src={charity.image_url} alt={charity.name} className="mt-4 max-h-80 w-full rounded-2xl object-cover" />
            )}
            {charity.upcoming_event_title && (
              <div className="mt-4 rounded-xl bg-slate-800 px-4 py-3 text-sm text-slate-200">
                Upcoming event: {charity.upcoming_event_title}
                {charity.upcoming_event_date ? ` (${charity.upcoming_event_date})` : ''}
              </div>
            )}
            <Link to="/signup" className="btn btn-primary mt-6 inline-flex">Sign up and support this charity</Link>
          </article>
        )}
      </section>
    </main>
  )
}

export default PublicCharityProfilePage
