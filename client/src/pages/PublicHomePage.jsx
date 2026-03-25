import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPublicCharities, getPublicOverview } from '../services/publicService'
import { toArray } from '../utils/dataHelpers'

function PublicHomePage() {
  const [overview, setOverview] = useState(null)
  const [charities, setCharities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [overviewPayload, charitiesPayload] = await Promise.all([
          getPublicOverview(),
          getPublicCharities(),
        ])

        setOverview(overviewPayload)
        const featuredFromOverview = toArray(overviewPayload, ['featuredCharities'])
        const fallbackList = toArray(charitiesPayload, ['charities'])
        setCharities(featuredFromOverview.length ? featuredFromOverview : fallbackList)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-14 pt-12 md:grid-cols-[1.4fr_1fr] md:pt-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">Golf Charity Subscription Platform</p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-white md:text-5xl">
            Win monthly prizes while funding real charitable impact.
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-300 md:text-base">
            Enter your latest five Stableford scores, join the monthly draw, and direct part of your subscription to a charity you care about.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/pricing" className="btn btn-primary">View Plans</Link>
            <Link to="/login" className="btn btn-secondary border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">Sign In</Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Users</p>
              <p className="mt-1 text-2xl font-semibold">{overview?.stats?.totalUsers ?? '--'}</p>
            </article>
            <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Charities</p>
              <p className="mt-1 text-2xl font-semibold">{overview?.stats?.totalCharities ?? '--'}</p>
            </article>
            <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Match Tiers</p>
              <p className="mt-1 text-2xl font-semibold">3 / 4 / 5</p>
            </article>
          </div>
        </div>

        <article className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="font-display text-xl text-white">How the draw works</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-300">
            <li>Keep your latest 5 scores updated (1-45 each).</li>
            <li>Admin runs the monthly draw with 5 numbers.</li>
            <li>Matching 3, 4, or 5 numbers unlocks prize tiers.</li>
            <li>Unclaimed 5-match jackpot rolls over next cycle.</li>
          </ol>
          <p className="mt-4 rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-300">
            Latest draw: {overview?.latestDraw?.numbers?.join(', ') || 'Not published yet'}
          </p>
        </article>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl text-white">Featured Charities</h2>
          <Link to="/signup" className="text-sm font-semibold text-teal-300 hover:text-teal-200">Select yours after signup</Link>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Loading charities...</p>
        ) : charities.length === 0 ? (
          <p className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">No charities added yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {charities.slice(0, 6).map((charity) => (
              <article key={charity.id || charity.name} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <h3 className="text-base font-semibold text-white">{charity.name}</h3>
                <p className="mt-2 text-sm text-slate-300">{charity.description || 'Charity details coming soon.'}</p>
                <p className="mt-1 text-xs text-slate-400">{charity.category || 'General'} • {charity.location || 'Unknown location'}</p>
                {charity.upcoming_event_title && (
                  <p className="mt-1 text-xs text-teal-300">Upcoming: {charity.upcoming_event_title}</p>
                )}
                {charity.id && (
                  <Link to={`/discover/charities/${charity.id}`} className="mt-3 inline-block text-xs font-semibold text-teal-300 hover:text-teal-200">
                    View profile
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default PublicHomePage
