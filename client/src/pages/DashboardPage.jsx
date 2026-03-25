import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getLatestDraw } from '../services/drawService'
import { addScore, getScores } from '../services/scoreService'
import { getUserWinnerResult, submitWinnerProof, uploadWinnerProofFile } from '../services/winnerService'
import {
  findWinnerForUser,
  formatDateTime,
  getDrawNumbers,
  getScoreId,
  getScoreValue,
  isUserSubscribed,
  latestFiveScores,
  selectedCharityFromUser,
} from '../utils/dataHelpers'

function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()

  const [scoreInput, setScoreInput] = useState('')
  const [scores, setScores] = useState([])
  const [latestDraw, setLatestDraw] = useState(null)
  const [winnerResult, setWinnerResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submittingScore, setSubmittingScore] = useState(false)
  const [proofUrl, setProofUrl] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [submittingProof, setSubmittingProof] = useState(false)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [scoresResult, drawResult, winnerResultPayload] = await Promise.allSettled([
        getScores(),
        getLatestDraw(),
        getUserWinnerResult(),
      ])

      if (scoresResult.status === 'fulfilled') {
        setScores(latestFiveScores(scoresResult.value))
      } else {
        setScores([])
      }

      const drawPayload = drawResult.status === 'fulfilled' ? drawResult.value : null
      const parsedDraw = drawPayload?.latestDraw ?? drawPayload?.draw ?? drawPayload
      setLatestDraw(parsedDraw)

      if (winnerResultPayload.status === 'fulfilled') {
        const winnerPayload = winnerResultPayload.value
        setWinnerResult(winnerPayload?.winner ?? winnerPayload?.result ?? winnerPayload?.data ?? winnerPayload)
      } else {
        setWinnerResult(findWinnerForUser(drawPayload?.winners ?? drawPayload, user?.id))
      }

      if (scoresResult.status === 'rejected' && drawResult.status === 'rejected') {
        setError('Unable to load your dashboard data right now.')
      }
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const selectedCharity = useMemo(() => selectedCharityFromUser(user), [user])
  const isSubscribed = isUserSubscribed(user)

  const handleSubscribe = () => {
    navigate('/pricing')
  }

  const handleAddScore = async (event) => {
    event.preventDefault()

    if (!isSubscribed) {
      addToast('Subscribe first to submit scores.', 'error')
      return
    }

    const value = Number(scoreInput)
    if (!Number.isInteger(value) || value < 1 || value > 45) {
      addToast('Score must be an integer between 1 and 45.', 'error')
      return
    }

    setSubmittingScore(true)

    try {
      await addScore(value)
      setScoreInput('')
      addToast('Score added.', 'success')
      const nextScores = await getScores()
      setScores(latestFiveScores(nextScores))
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to add score.', 'error')
    } finally {
      setSubmittingScore(false)
    }
  }

  const handleSubmitProof = async (event) => {
    event.preventDefault()

    const winnerId = winnerResult?.id
    if (!winnerId) {
      addToast('No winner record available for proof submission.', 'error')
      return
    }

    if (!proofUrl.trim() && !proofFile) {
      addToast('Provide proof URL or upload a proof file.', 'error')
      return
    }

    setSubmittingProof(true)

    try {
      if (proofFile) {
        await uploadWinnerProofFile(winnerId, proofFile)
      } else {
        await submitWinnerProof(winnerId, proofUrl.trim())
      }
      addToast('Winner proof submitted.', 'success')
      setProofUrl('')
      setProofFile(null)
      await loadDashboard()
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to submit proof.', 'error')
    } finally {
      setSubmittingProof(false)
    }
  }

  const drawNumbers = getDrawNumbers(latestDraw)

  return (
    <section className="space-y-5">
      <h1 className="page-title">Dashboard</h1>

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading dashboard data...</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Subscription</p>
          <p className={`mt-2 text-lg font-semibold ${isSubscribed ? 'text-emerald-700' : 'text-amber-700'}`}>
            {isSubscribed ? 'Active' : 'Inactive'}
          </p>
          <button className="btn btn-primary mt-4" onClick={handleSubscribe} disabled={isSubscribed}>
            {isSubscribed ? 'Subscribed' : 'View Plans'}
          </button>
        </article>

        <article className="panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Selected Charity</p>
          {selectedCharity ? (
            <>
              <p className="mt-2 text-lg font-semibold text-slate-900">{selectedCharity.name || 'Your charity'}</p>
              <p className="text-sm text-slate-500">{selectedCharity.description || 'You can change this in Charity page.'}</p>
              <p className="mt-1 text-xs text-slate-500">Contribution: {Number(user?.charityPercent ?? 10)}%</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No charity selected yet.</p>
          )}
        </article>

        <article className="panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Latest Draw</p>
          {drawNumbers.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {drawNumbers.map((number) => (
                <span key={`${number}`} className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
                  {number}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No draw result yet.</p>
          )}
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Add Score</p>
          <form onSubmit={handleAddScore} className="mt-3 flex gap-2">
            <input
              type="number"
              min="1"
              max="45"
              className="input"
              placeholder="Enter score 1-45"
              value={scoreInput}
              onChange={(event) => setScoreInput(event.target.value)}
              disabled={!isSubscribed || submittingScore}
            />
            <button type="submit" className="btn btn-primary" disabled={!isSubscribed || submittingScore}>
              {submittingScore ? 'Saving...' : 'Add'}
            </button>
          </form>
          {!isSubscribed && (
            <p className="mt-2 text-xs text-amber-700">Score submission is disabled until subscription is active.</p>
          )}
        </article>

        <article className="panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Your Match Result</p>
          {winnerResult?.matchCount || winnerResult?.match_count || winnerResult?.matches ? (
            <div className="mt-3">
              <p className="text-lg font-semibold text-slate-900">
                {winnerResult.matchCount ?? winnerResult.match_count ?? winnerResult.matches} matched numbers
              </p>
              <p className="text-sm text-slate-500">{winnerResult.prize ? `Prize: ${winnerResult.prize}` : 'No prize metadata returned.'}</p>
              <p className="mt-1 text-xs text-slate-500">
                Verification: {winnerResult.verification_status || 'pending'} | Payout: {winnerResult.payout_status || 'pending'}
              </p>

              <form onSubmit={handleSubmitProof} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="url"
                  className="input"
                  value={proofUrl}
                  onChange={(event) => setProofUrl(event.target.value)}
                  placeholder="Paste score proof URL"
                  disabled={submittingProof}
                />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="input"
                  onChange={(event) => setProofFile(event.target.files?.[0] || null)}
                  disabled={submittingProof}
                />
                <button type="submit" className="btn btn-secondary" disabled={submittingProof}>
                  {submittingProof ? 'Submitting...' : 'Submit Proof'}
                </button>
              </form>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No winning result for your account yet.</p>
          )}
        </article>
      </div>

      <article className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Latest 5 Scores</p>
          <span className="text-xs text-slate-500">Latest first</span>
        </div>

        {!scores.length ? (
          <p className="text-sm text-slate-500">No scores yet. Add your first score to get started.</p>
        ) : (
          <ul className="space-y-2">
            {scores.map((score, index) => (
              <li
                key={getScoreId(score) || `score-${index}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <span className="font-semibold text-slate-800">Score: {getScoreValue(score)}</span>
                <span className="text-xs text-slate-500">{formatDateTime(score.createdAt ?? score.created_at ?? score.updatedAt ?? score.updated_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}

export default DashboardPage
