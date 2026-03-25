import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '../context/ToastContext'
import {
  getAdminReports,
  getAdminScores,
  getAdminSubscriptions,
  getAdminUsers,
  updateAdminScore,
  updateAdminSubscription,
  updateAdminUser,
} from '../services/adminService'
import { createCharity, deleteCharity, getCharities, updateCharity } from '../services/charityService'
import { getLatestDraw, publishDraw, runDraw, simulateDraw } from '../services/drawService'
import { getAdminWinners, markWinnerPaid, verifyWinner } from '../services/winnerService'
import { formatDateTime, getDrawNumbers, winnerGroups } from '../utils/dataHelpers'

function parseDrawNumbers(value) {
  const cleaned = String(value || '').trim()
  if (!cleaned) {
    return undefined
  }

  const parts = cleaned.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item))
  const unique = [...new Set(parts)]
  if (unique.length !== 5 || unique.some((item) => item < 1 || item > 45)) {
    throw new Error('Draw numbers must contain exactly 5 unique integers between 1 and 45.')
  }

  return unique
}

function toBool(value) {
  return String(value) === 'true'
}

function normalizeWinners(input) {
  if (Array.isArray(input)) {
    return input
  }

  if (input && typeof input === 'object') {
    return Object.values(input).flat().filter(Boolean)
  }

  return []
}

function AdminPage() {
  const { addToast } = useToast()

  const [latestDraw, setLatestDraw] = useState(null)
  const [winners, setWinners] = useState([])
  const [reports, setReports] = useState(null)
  const [users, setUsers] = useState([])
  const [scores, setScores] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [charities, setCharities] = useState([])

  const [drawMode, setDrawMode] = useState('random')
  const [drawNumbersInput, setDrawNumbersInput] = useState('')

  const [editingUserId, setEditingUserId] = useState(null)
  const [editingUserEmail, setEditingUserEmail] = useState('')
  const [editingUserSubscribed, setEditingUserSubscribed] = useState('false')
  const [editingUserCharityId, setEditingUserCharityId] = useState('')

  const [editingScoreId, setEditingScoreId] = useState(null)
  const [editingScoreValue, setEditingScoreValue] = useState('')
  const [editingScoreDate, setEditingScoreDate] = useState('')

  const [charityDraft, setCharityDraft] = useState({
    name: '',
    description: '',
    image_url: '',
    category: '',
    location: '',
    is_featured: false,
    upcoming_event_title: '',
    upcoming_event_date: '',
  })
  const [editingCharityId, setEditingCharityId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [runningDraw, setRunningDraw] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [simulationResult, setSimulationResult] = useState(null)
  const [actionWinnerId, setActionWinnerId] = useState(null)

  const groupedWinners = useMemo(() => winnerGroups(winners), [winners])

  const loadLatest = useCallback(async () => {
    const payload = await getLatestDraw()
    const draw = payload?.latestDraw ?? payload?.draw ?? payload
    setLatestDraw(draw)
    setWinners(normalizeWinners(payload?.winners ?? draw?.winners ?? []))
  }, [])

  const loadAdminModules = useCallback(async () => {
    const [reportsResult, usersResult, scoresResult, subscriptionsResult, winnersResult, charitiesResult] = await Promise.allSettled([
      getAdminReports(),
      getAdminUsers(),
      getAdminScores(),
      getAdminSubscriptions(),
      getAdminWinners(),
      getCharities(),
    ])

    if (reportsResult.status === 'fulfilled') {
      setReports(reportsResult.value?.reports ?? null)
    }

    if (usersResult.status === 'fulfilled') {
      setUsers(usersResult.value?.users ?? [])
    }

    if (scoresResult.status === 'fulfilled') {
      setScores(scoresResult.value?.scores ?? [])
    }

    if (subscriptionsResult.status === 'fulfilled') {
      setSubscriptions(subscriptionsResult.value?.subscriptions ?? [])
    }

    if (winnersResult.status === 'fulfilled') {
      setWinners(normalizeWinners(winnersResult.value?.winners ?? []))
    }

    if (charitiesResult.status === 'fulfilled') {
      setCharities(charitiesResult.value?.charities ?? [])
    }
  }, [])

  const bootstrap = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([loadLatest(), loadAdminModules()])
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to load admin data.', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast, loadAdminModules, loadLatest])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  const handleRunDraw = async () => {
    setRunningDraw(true)

    try {
      const numbers = parseDrawNumbers(drawNumbersInput)
      await runDraw({ mode: drawMode, numbers })
      await bootstrap()
      addToast('Draw published successfully.', 'success')
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to run draw.', 'error')
    } finally {
      setRunningDraw(false)
    }
  }

  const handleSimulateDraw = async () => {
    setSimulating(true)

    try {
      const numbers = parseDrawNumbers(drawNumbersInput)
      const payload = await simulateDraw({ mode: drawMode, numbers })
      setSimulationResult(payload)
      addToast('Simulation completed. Review and publish.', 'success')
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to simulate draw.', 'error')
    } finally {
      setSimulating(false)
    }
  }

  const handlePublishFromSimulation = async () => {
    const simulationId = simulationResult?.draw?.id
    if (!simulationId) {
      addToast('Run simulation first.', 'error')
      return
    }

    setPublishing(true)

    try {
      await publishDraw({ simulationDrawId: simulationId, mode: drawMode })
      setSimulationResult(null)
      await bootstrap()
      addToast('Simulation published successfully.', 'success')
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to publish simulation draw.', 'error')
    } finally {
      setPublishing(false)
    }
  }

  const handleVerify = async (winnerId, action) => {
    setActionWinnerId(winnerId)

    try {
      await verifyWinner(winnerId, action)
      await bootstrap()
      addToast(`Winner ${action === 'approve' ? 'approved' : 'rejected'}.`, 'success')
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to verify winner.', 'error')
    } finally {
      setActionWinnerId(null)
    }
  }

  const handleMarkPaid = async (winnerId) => {
    setActionWinnerId(winnerId)

    try {
      await markWinnerPaid(winnerId)
      await bootstrap()
      addToast('Winner payout marked paid.', 'success')
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to update payout.', 'error')
    } finally {
      setActionWinnerId(null)
    }
  }

  const handleCancelSubscription = async (subscriptionId) => {
    try {
      await updateAdminSubscription(subscriptionId, { status: 'canceled', ended_at: new Date().toISOString() })
      await bootstrap()
      addToast('Subscription updated.', 'success')
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to update subscription.', 'error')
    }
  }

  const startEditUser = (user) => {
    setEditingUserId(user.id)
    setEditingUserEmail(user.email || '')
    setEditingUserSubscribed(String(Boolean(user.is_subscribed)))
    setEditingUserCharityId(user.charity_id ? String(user.charity_id) : '')
  }

  const saveEditUser = async () => {
    if (!editingUserId) {
      return
    }

    try {
      await updateAdminUser(editingUserId, {
        email: editingUserEmail,
        is_subscribed: toBool(editingUserSubscribed),
        charity_id: editingUserCharityId ? Number(editingUserCharityId) : null,
      })
      setEditingUserId(null)
      await bootstrap()
      addToast('User updated.', 'success')
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to update user.', 'error')
    }
  }

  const startEditScore = (score) => {
    setEditingScoreId(score.id)
    setEditingScoreValue(String(score.score || ''))
    setEditingScoreDate(score.played_at || '')
  }

  const saveEditScore = async () => {
    if (!editingScoreId) {
      return
    }

    try {
      await updateAdminScore(editingScoreId, {
        score: Number(editingScoreValue),
        played_at: editingScoreDate || null,
      })
      setEditingScoreId(null)
      await bootstrap()
      addToast('Score updated.', 'success')
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to update score.', 'error')
    }
  }

  const handleCreateCharity = async (event) => {
    event.preventDefault()

    if (!charityDraft.name.trim()) {
      addToast('Charity name is required.', 'error')
      return
    }

    try {
      await createCharity({
        name: charityDraft.name.trim(),
        description: charityDraft.description.trim() || null,
        image_url: charityDraft.image_url.trim() || null,
        category: charityDraft.category.trim() || null,
        location: charityDraft.location.trim() || null,
        is_featured: charityDraft.is_featured,
        upcoming_event_title: charityDraft.upcoming_event_title.trim() || null,
        upcoming_event_date: charityDraft.upcoming_event_date || null,
      })
      setCharityDraft({
        name: '',
        description: '',
        image_url: '',
        category: '',
        location: '',
        is_featured: false,
        upcoming_event_title: '',
        upcoming_event_date: '',
      })
      await bootstrap()
      addToast('Charity created.', 'success')
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to create charity.', 'error')
    }
  }

  const handleDeleteCharity = async (charityId) => {
    try {
      await deleteCharity(charityId)
      await bootstrap()
      addToast('Charity deleted.', 'success')
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to delete charity.', 'error')
    }
  }

  const startEditCharity = (charity) => {
    setEditingCharityId(charity.id)
    setCharityDraft({
      name: charity.name || '',
      description: charity.description || '',
      image_url: charity.image_url || '',
      category: charity.category || '',
      location: charity.location || '',
      is_featured: Boolean(charity.is_featured),
      upcoming_event_title: charity.upcoming_event_title || '',
      upcoming_event_date: charity.upcoming_event_date || '',
    })
  }

  const saveEditCharity = async () => {
    if (!editingCharityId) {
      return
    }

    try {
      await updateCharity(editingCharityId, {
        name: charityDraft.name,
        description: charityDraft.description || null,
        image_url: charityDraft.image_url || null,
        category: charityDraft.category || null,
        location: charityDraft.location || null,
        is_featured: charityDraft.is_featured,
        upcoming_event_title: charityDraft.upcoming_event_title || null,
        upcoming_event_date: charityDraft.upcoming_event_date || null,
      })
      setEditingCharityId(null)
      await bootstrap()
      addToast('Charity updated.', 'success')
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to update charity.', 'error')
    }
  }

  const cancelEditCharity = () => {
    setEditingCharityId(null)
    setCharityDraft({
      name: '',
      description: '',
      image_url: '',
      category: '',
      location: '',
      is_featured: false,
      upcoming_event_title: '',
      upcoming_event_date: '',
    })
  }

  const numbers = getDrawNumbers(latestDraw)

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Admin</h1>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" onClick={handleSimulateDraw} disabled={simulating || publishing || runningDraw}>
            {simulating ? 'Simulating...' : 'Simulate Draw'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handlePublishFromSimulation}
            disabled={publishing || !simulationResult?.draw?.id || runningDraw}
          >
            {publishing ? 'Publishing...' : 'Publish Simulation'}
          </button>
          <button className="btn btn-primary" onClick={handleRunDraw} disabled={runningDraw || simulating || publishing}>
            {runningDraw ? 'Publishing...' : 'Publish Random Draw'}
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading admin dashboard...</p>}

      {reports && (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-8">
          <article className="panel p-3"><p className="text-xs text-slate-500">Users</p><p className="text-lg font-semibold">{reports.totalUsers}</p></article>
          <article className="panel p-3"><p className="text-xs text-slate-500">Subscribers</p><p className="text-lg font-semibold">{reports.activeSubscribers}</p></article>
          <article className="panel p-3"><p className="text-xs text-slate-500">Charities</p><p className="text-lg font-semibold">{reports.totalCharities}</p></article>
          <article className="panel p-3"><p className="text-xs text-slate-500">Draws</p><p className="text-lg font-semibold">{reports.totalDraws}</p></article>
          <article className="panel p-3"><p className="text-xs text-slate-500">Revenue (INR)</p><p className="text-lg font-semibold">{reports.totalRevenue}</p></article>
          <article className="panel p-3"><p className="text-xs text-slate-500">Charity Share (INR)</p><p className="text-lg font-semibold">{reports.totalCharityContribution ?? 0}</p></article>
          <article className="panel p-3"><p className="text-xs text-slate-500">Donations (INR)</p><p className="text-lg font-semibold">{reports.totalDonations ?? 0}</p></article>
          <article className="panel p-3"><p className="text-xs text-slate-500">Rollover (INR)</p><p className="text-lg font-semibold">{reports.totalRolloverOutstanding}</p></article>
        </div>
      )}

      {reports?.drawStatistics && (
        <article className="panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Draw Statistics</p>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <p className="text-sm text-slate-700">Published: <strong>{reports.drawStatistics.published ?? 0}</strong></p>
            <p className="text-sm text-slate-700">Simulation: <strong>{reports.drawStatistics.simulation ?? 0}</strong></p>
            <p className="text-sm text-slate-700">Random: <strong>{reports.drawStatistics.random ?? 0}</strong></p>
            <p className="text-sm text-slate-700">Algorithmic: <strong>{reports.drawStatistics.algorithmic ?? 0}</strong></p>
          </div>
        </article>
      )}

      <article className="panel p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Draw Configuration</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <select className="input" value={drawMode} onChange={(event) => setDrawMode(event.target.value)}>
            <option value="random">Random</option>
            <option value="algorithmic-most">Algorithmic Most Frequent</option>
            <option value="algorithmic-least">Algorithmic Least Frequent</option>
            <option value="algorithmic">Algorithmic Balanced</option>
          </select>
          <input
            className="input"
            placeholder="Optional manual numbers: 3,7,11,22,45"
            value={drawNumbersInput}
            onChange={(event) => setDrawNumbersInput(event.target.value)}
          />
        </div>
      </article>

      <article className="panel p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Latest Draw</p>
        {numbers.length ? (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {numbers.map((number) => (
                <span key={`${number}`} className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
                  {number}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Published: {formatDateTime(latestDraw?.published_at ?? latestDraw?.created_at)}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No draw has been executed yet.</p>
        )}
      </article>

      {simulationResult?.draw && (
        <article className="panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Simulation Preview</p>
          <p className="mt-2 text-sm text-slate-600">Simulation ID: {simulationResult.draw.id}</p>
          <p className="text-sm text-slate-600">Pools: 3-match {simulationResult?.pools?.tier3Pool ?? 0}, 4-match {simulationResult?.pools?.tier4Pool ?? 0}, 5-match {simulationResult?.pools?.tier5Pool ?? 0}</p>
        </article>
      )}

      <article className="panel p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Winners Management</p>
        <div className="mt-3 space-y-2">
          {winners.length === 0 ? (
            <p className="text-sm text-slate-500">No winners yet.</p>
          ) : (
            winners.map((winner) => (
              <div key={winner.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-800">{winner.user_email || winner.email || `User #${winner.user_id}`} • Match {winner.match_count}</p>
                <p className="text-xs text-slate-600">Verification: {winner.verification_status || 'pending'} | Payout: {winner.payout_status || 'pending'} | Amount: {winner.payout_amount ?? 0}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="btn btn-secondary" disabled={actionWinnerId === winner.id} onClick={() => handleVerify(winner.id, 'approve')}>
                    Approve
                  </button>
                  <button className="btn btn-secondary" disabled={actionWinnerId === winner.id} onClick={() => handleVerify(winner.id, 'reject')}>
                    Reject
                  </button>
                  <button className="btn btn-primary" disabled={actionWinnerId === winner.id} onClick={() => handleMarkPaid(winner.id)}>
                    Mark Paid
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </article>

      <article className="panel p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Subscriptions Management</p>
        <div className="mt-3 space-y-2">
          {subscriptions.slice(0, 12).map((subscription) => (
            <div key={subscription.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm text-slate-700">
                {subscription.user_email || `User #${subscription.user_id}`} • {subscription.plan_name || subscription.plan_code || `Plan #${subscription.plan_id}`} • {subscription.status}
              </p>
              <button className="btn btn-secondary" onClick={() => handleCancelSubscription(subscription.id)}>
                Cancel
              </button>
            </div>
          ))}
          {subscriptions.length === 0 && <p className="text-sm text-slate-500">No subscriptions found.</p>}
        </div>
      </article>

      <article className="panel p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">User Management</p>
        <div className="mt-3 space-y-2">
          {users.slice(0, 30).map((user) => {
            const isEditing = editingUserId === user.id
            return (
              <div key={user.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid gap-2 md:grid-cols-4">
                  <input
                    className="input"
                    value={isEditing ? editingUserEmail : user.email || ''}
                    disabled={!isEditing}
                    onChange={(event) => setEditingUserEmail(event.target.value)}
                  />
                  <select
                    className="input"
                    value={isEditing ? editingUserSubscribed : String(Boolean(user.is_subscribed))}
                    disabled={!isEditing}
                    onChange={(event) => setEditingUserSubscribed(event.target.value)}
                  >
                    <option value="true">Subscribed</option>
                    <option value="false">Not Subscribed</option>
                  </select>
                  <input
                    className="input"
                    value={isEditing ? editingUserCharityId : user.charity_id || ''}
                    disabled={!isEditing}
                    onChange={(event) => setEditingUserCharityId(event.target.value)}
                    placeholder="Charity ID"
                  />
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <button className="btn btn-secondary" onClick={() => startEditUser(user)}>Edit</button>
                    ) : (
                      <>
                        <button className="btn btn-primary" onClick={saveEditUser}>Save</button>
                        <button className="btn btn-secondary" onClick={() => setEditingUserId(null)}>Cancel</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {users.length === 0 && <p className="text-sm text-slate-500">No users found.</p>}
        </div>
      </article>

      <article className="panel p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Edit Golf Scores</p>
        <div className="mt-3 space-y-2">
          {scores.slice(0, 40).map((score) => {
            const isEditing = editingScoreId === score.id
            return (
              <div key={score.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid gap-2 md:grid-cols-5">
                  <p className="text-sm text-slate-700 md:self-center">{score.user_email || `User #${score.user_id}`}</p>
                  <input
                    type="number"
                    min="1"
                    max="45"
                    className="input"
                    value={isEditing ? editingScoreValue : score.score}
                    disabled={!isEditing}
                    onChange={(event) => setEditingScoreValue(event.target.value)}
                  />
                  <input
                    type="date"
                    className="input"
                    value={isEditing ? editingScoreDate : score.played_at || ''}
                    disabled={!isEditing}
                    onChange={(event) => setEditingScoreDate(event.target.value)}
                  />
                  <p className="text-xs text-slate-500 md:self-center">Created: {formatDateTime(score.created_at)}</p>
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <button className="btn btn-secondary" onClick={() => startEditScore(score)}>Edit</button>
                    ) : (
                      <>
                        <button className="btn btn-primary" onClick={saveEditScore}>Save</button>
                        <button className="btn btn-secondary" onClick={() => setEditingScoreId(null)}>Cancel</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {scores.length === 0 && <p className="text-sm text-slate-500">No scores found.</p>}
        </div>
      </article>

      <article className="panel p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Charity Management</p>
        <form className="mt-3 grid gap-2 md:grid-cols-2" onSubmit={handleCreateCharity}>
          <input
            className="input"
            value={charityDraft.name}
            onChange={(event) => setCharityDraft((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Charity name"
          />
          <input
            className="input"
            value={charityDraft.description}
            onChange={(event) => setCharityDraft((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Description"
          />
          <input
            className="input"
            value={charityDraft.image_url}
            onChange={(event) => setCharityDraft((prev) => ({ ...prev, image_url: event.target.value }))}
            placeholder="Image URL"
          />
          <input
            className="input"
            value={charityDraft.category}
            onChange={(event) => setCharityDraft((prev) => ({ ...prev, category: event.target.value }))}
            placeholder="Category"
          />
          <input
            className="input"
            value={charityDraft.location}
            onChange={(event) => setCharityDraft((prev) => ({ ...prev, location: event.target.value }))}
            placeholder="Location"
          />
          <input
            className="input"
            value={charityDraft.upcoming_event_title}
            onChange={(event) => setCharityDraft((prev) => ({ ...prev, upcoming_event_title: event.target.value }))}
            placeholder="Upcoming event title"
          />
          <input
            type="date"
            className="input"
            value={charityDraft.upcoming_event_date}
            onChange={(event) => setCharityDraft((prev) => ({ ...prev, upcoming_event_date: event.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={charityDraft.is_featured}
              onChange={(event) => setCharityDraft((prev) => ({ ...prev, is_featured: event.target.checked }))}
            />
            Featured charity
          </label>
          <div className="flex gap-2">
            {!editingCharityId ? (
              <button type="submit" className="btn btn-primary">Add Charity</button>
            ) : (
              <>
                <button type="button" className="btn btn-primary" onClick={saveEditCharity}>Save Charity</button>
                <button type="button" className="btn btn-secondary" onClick={cancelEditCharity}>Cancel Edit</button>
              </>
            )}
          </div>
        </form>

        <div className="mt-3 space-y-2">
          {charities.length === 0 && <p className="text-sm text-slate-500">No charities found.</p>}
          {charities.map((charity) => (
            <div key={charity.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">{charity.name}</p>
                <p className="text-xs text-slate-600">{charity.description || 'No description'}</p>
                <p className="text-xs text-slate-500">{charity.category || 'General'} | {charity.location || 'N/A'} | Featured: {String(Boolean(charity.is_featured))}</p>
                {charity.image_url && <p className="text-xs text-slate-500">Media: {charity.image_url}</p>}
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={() => startEditCharity(charity)}>Edit</button>
                <button className="btn btn-secondary" onClick={() => handleDeleteCharity(charity.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="panel p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Winners By Match</p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {[3, 4, 5].map((count) => {
            const list = groupedWinners[count] || []

            return (
              <div key={count} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">Match {count}</p>
                {!list.length ? (
                  <p className="mt-2 text-xs text-slate-500">No winners</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {list.map((winner, index) => (
                      <li key={`${winner?.id ?? winner?.email ?? index}`}>{winner?.email ?? winner?.user_email ?? `User #${winner?.user_id}`}</li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </article>
    </section>
  )
}

export default AdminPage
