import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { addScore, getScores, updateScore } from '../services/scoreService'
import { formatDateTime, getScoreId, getScoreValue, isUserSubscribed, latestFiveScores } from '../utils/dataHelpers'

function scorePlayedDate(score) {
  return score?.played_at ?? score?.playedAt ?? ''
}

function ScoresPage() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [scores, setScores] = useState([])
  const [scoreInput, setScoreInput] = useState('')
  const [scoreDate, setScoreDate] = useState('')
  const [editingScoreId, setEditingScoreId] = useState(null)
  const [editingScoreValue, setEditingScoreValue] = useState('')
  const [editingScoreDate, setEditingScoreDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [updating, setUpdating] = useState(false)

  const isSubscribed = isUserSubscribed(user)

  const loadScores = useCallback(async () => {
    setLoading(true)

    try {
      const payload = await getScores()
      setScores(latestFiveScores(payload))
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to load scores.', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    loadScores()
  }, [loadScores])

  const editingRow = useMemo(
    () => scores.find((score) => String(getScoreId(score)) === String(editingScoreId)) || null,
    [scores, editingScoreId],
  )

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!isSubscribed) {
      addToast('Subscribe to add scores.', 'error')
      return
    }

    const value = Number(scoreInput)
    if (!Number.isInteger(value) || value < 1 || value > 45) {
      addToast('Score must be between 1 and 45.', 'error')
      return
    }

    setSubmitting(true)

    try {
      await addScore(value, scoreDate || undefined)
      addToast('Score submitted successfully.', 'success')
      setScoreInput('')
      setScoreDate('')
      await loadScores()
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to submit score.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (score) => {
    setEditingScoreId(getScoreId(score))
    setEditingScoreValue(String(getScoreValue(score) ?? ''))
    setEditingScoreDate(scorePlayedDate(score) || '')
  }

  const cancelEdit = () => {
    setEditingScoreId(null)
    setEditingScoreValue('')
    setEditingScoreDate('')
  }

  const handleUpdate = async () => {
    if (!editingRow) {
      return
    }

    const value = Number(editingScoreValue)
    if (!Number.isInteger(value) || value < 1 || value > 45) {
      addToast('Score must be between 1 and 45.', 'error')
      return
    }

    setUpdating(true)

    try {
      await updateScore(editingRow.id, {
        score: value,
        played_at: editingScoreDate || null,
      })

      addToast('Score updated successfully.', 'success')
      cancelEdit()
      await loadScores()
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to update score.', 'error')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <section className="space-y-5">
      <h1 className="page-title">Scores</h1>

      <article className="panel p-4">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleSubmit}>
          <input
            type="number"
            min="1"
            max="45"
            className="input"
            placeholder="Enter score (1-45)"
            value={scoreInput}
            onChange={(event) => setScoreInput(event.target.value)}
            disabled={!isSubscribed || submitting}
          />
          <input
            type="date"
            className="input"
            value={scoreDate}
            onChange={(event) => setScoreDate(event.target.value)}
            disabled={!isSubscribed || submitting}
          />
          <button type="submit" className="btn btn-primary" disabled={!isSubscribed || submitting}>
            {submitting ? 'Submitting...' : 'Submit Score'}
          </button>
        </form>

        {!isSubscribed && (
          <p className="mt-2 text-xs text-amber-700">You need an active subscription to submit scores.</p>
        )}
      </article>

      <article className="panel overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Latest 5 Entries</p>
        </div>

        {loading ? (
          <p className="p-4 text-sm text-slate-500">Loading scores...</p>
        ) : !scores.length ? (
          <p className="p-4 text-sm text-slate-500">No scores submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Played Date</th>
                  <th className="px-4 py-3 font-semibold">Submitted At</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score, index) => {
                  const rowId = getScoreId(score) || `score-row-${index}`
                  const isEditing = String(editingScoreId) === String(rowId)

                  return (
                    <tr key={rowId} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            max="45"
                            className="input"
                            value={editingScoreValue}
                            onChange={(event) => setEditingScoreValue(event.target.value)}
                          />
                        ) : (
                          getScoreValue(score)
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {isEditing ? (
                          <input
                            type="date"
                            className="input"
                            value={editingScoreDate}
                            onChange={(event) => setEditingScoreDate(event.target.value)}
                          />
                        ) : (
                          scorePlayedDate(score) || 'N/A'
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTime(score.createdAt ?? score.created_at ?? score.updatedAt ?? score.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button className="btn btn-secondary" type="button" onClick={handleUpdate} disabled={updating}>
                              {updating ? 'Saving...' : 'Save'}
                            </button>
                            <button className="btn btn-secondary" type="button" onClick={cancelEdit} disabled={updating}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button className="btn btn-secondary" type="button" onClick={() => startEdit(score)}>
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  )
}

export default ScoresPage
