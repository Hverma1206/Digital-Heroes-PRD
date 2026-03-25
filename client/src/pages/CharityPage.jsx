import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getCharities } from '../services/charityService'
import { createDonation, getMyDonations, selectCharity, setCharityContribution } from '../services/userService'
import { selectedCharityFromUser, toArray } from '../utils/dataHelpers'

function CharityPage() {
  const { user, refreshUser } = useAuth()
  const { addToast } = useToast()

  const [charities, setCharities] = useState([])
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [charityPercent, setCharityPercentInput] = useState(String(Number(user?.charityPercent ?? 10)))
  const [donationCharityId, setDonationCharityId] = useState('')
  const [donationAmount, setDonationAmount] = useState('')
  const [donationNote, setDonationNote] = useState('')

  const selected = useMemo(() => selectedCharityFromUser(user), [user])

  const loadCharities = useCallback(async () => {
    setLoading(true)

    try {
      const payload = await getCharities({
        q: query || undefined,
        category: category || undefined,
        featured: featuredOnly ? true : undefined,
      })
      setCharities(toArray(payload, ['charities', 'data']))
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to fetch charities.', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast, category, featuredOnly, query])

  const loadDonations = useCallback(async () => {
    try {
      const payload = await getMyDonations()
      setDonations(payload?.donations || [])
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to fetch donations.', 'error')
    }
  }, [addToast])

  useEffect(() => {
    loadCharities()
    loadDonations()
  }, [loadCharities, loadDonations])

  const handleSelect = async (charity) => {
    const id = charity?.id ?? charity?._id
    if (!id) {
      addToast('Invalid charity selected.', 'error')
      return
    }

    setActionId(id)

    try {
      await selectCharity(id)
      await refreshUser()
      addToast('Charity selected.', 'success')
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to select charity.', 'error')
    } finally {
      setActionId(null)
    }
  }

  const handleApplyFilters = async (event) => {
    event.preventDefault()
    await loadCharities()
  }

  const handleContributionUpdate = async (event) => {
    event.preventDefault()

    try {
      await setCharityContribution(Number(charityPercent))
      await refreshUser()
      addToast('Charity contribution percentage updated.', 'success')
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to update contribution percentage.', 'error')
    }
  }

  const handleCreateDonation = async (event) => {
    event.preventDefault()

    const charityId = Number(donationCharityId)
    const amountInr = Number(donationAmount)

    if (!Number.isInteger(charityId) || charityId <= 0) {
      addToast('Select a valid charity for donation.', 'error')
      return
    }

    if (!Number.isFinite(amountInr) || amountInr <= 0) {
      addToast('Donation amount must be greater than 0.', 'error')
      return
    }

    try {
      await createDonation({
        charity_id: charityId,
        amount_inr: amountInr,
        note: donationNote.trim() || undefined,
      })

      setDonationAmount('')
      setDonationNote('')
      await loadDonations()
      addToast('Donation recorded successfully.', 'success')
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to create donation.', 'error')
    }
  }

  const categories = [...new Set(charities.map((charity) => charity.category).filter(Boolean))]

  return (
    <section className="space-y-5">
      <div>
        <h1 className="page-title">Charity</h1>
        <p className="mt-1 text-sm text-slate-500">Explore charities, choose your recipient, and manage your contribution settings.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Contribution Percentage</p>
          <form onSubmit={handleContributionUpdate} className="mt-3 flex flex-wrap gap-2">
            <input
              type="number"
              min="10"
              max="100"
              step="0.01"
              className="input"
              value={charityPercent}
              onChange={(event) => setCharityPercentInput(event.target.value)}
            />
            <button type="submit" className="btn btn-primary">Update</button>
          </form>
          <p className="mt-2 text-xs text-slate-500">Minimum contribution is 10% of your subscription fee.</p>
        </article>

        <article className="panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Independent Donation</p>
          <form onSubmit={handleCreateDonation} className="mt-3 space-y-2">
            <select
              className="input"
              value={donationCharityId}
              onChange={(event) => setDonationCharityId(event.target.value)}
            >
              <option value="">Select charity</option>
              {charities.map((charity) => (
                <option key={charity.id} value={charity.id}>{charity.name}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              step="0.01"
              className="input"
              placeholder="Amount (INR)"
              value={donationAmount}
              onChange={(event) => setDonationAmount(event.target.value)}
            />
            <input
              className="input"
              placeholder="Optional note"
              value={donationNote}
              onChange={(event) => setDonationNote(event.target.value)}
            />
            <button type="submit" className="btn btn-secondary">Donate</button>
          </form>
        </article>
      </div>

      {selected?.name && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Currently selected: <span className="font-semibold">{selected.name}</span>
        </p>
      )}

      <article className="panel p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Search and Filter</p>
        <form onSubmit={handleApplyFilters} className="mt-3 grid gap-2 md:grid-cols-[2fr_1fr_auto_auto]">
          <input
            className="input"
            placeholder="Search charities"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={featuredOnly} onChange={(event) => setFeaturedOnly(event.target.checked)} />
            Featured only
          </label>
          <button className="btn btn-secondary" type="submit">Apply</button>
        </form>
      </article>

      {loading ? (
        <p className="text-sm text-slate-500">Loading charities...</p>
      ) : !charities.length ? (
        <p className="panel p-4 text-sm text-slate-500">No charities available right now.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {charities.map((charity) => {
            const id = charity?.id ?? charity?._id
            const isSelected =
              id &&
              (String(selected?.id) === String(id) ||
                String(selected?._id) === String(id) ||
                String(selected?.charity_id) === String(id) ||
                selected?.name === charity.name)

            return (
              <article
                key={id || charity.name}
                className={`panel p-4 transition ${isSelected ? 'ring-2 ring-emerald-300' : ''}`}
              >
                <h2 className="font-display text-lg text-slate-900">{charity.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{charity.description || 'No description available.'}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {charity.category || 'General'} • {charity.location || 'Unknown location'}
                </p>
                {charity.upcoming_event_title && (
                  <p className="mt-1 text-xs text-teal-700">Upcoming: {charity.upcoming_event_title}</p>
                )}
                <button
                  className={`btn mt-4 ${isSelected ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => handleSelect(charity)}
                  disabled={actionId === id || isSelected}
                >
                  {isSelected ? 'Selected' : actionId === id ? 'Selecting...' : 'Select Charity'}
                </button>
              </article>
            )
          })}
        </div>
      )}

      <article className="panel p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Recent Donations</p>
        {!donations.length ? (
          <p className="mt-2 text-sm text-slate-500">No donations yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {donations.slice(0, 8).map((donation) => (
              <li key={donation.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                INR {Number(donation.amount_inr || 0).toLocaleString('en-IN')} • Status: {donation.status}
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}

export default CharityPage
