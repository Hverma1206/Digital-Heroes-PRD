import api from './api'

export const addScore = async (score, playedAt) => {
  const response = await api.post('/api/scores', {
    score,
    played_at: playedAt || undefined,
  })
  return response.data
}

export const updateScore = async (scoreId, payload) => {
  const response = await api.patch(`/api/scores/${scoreId}`, payload)
  return response.data
}

export const getScores = async () => {
  const response = await api.get('/api/scores')
  return response.data
}
