import api from './api'

export const getAdminUsers = async () => {
  const response = await api.get('/api/admin/users')
  return response.data
}

export const updateAdminUser = async (userId, payload) => {
  const response = await api.patch(`/api/admin/users/${userId}`, payload)
  return response.data
}

export const getAdminScores = async () => {
  const response = await api.get('/api/admin/scores')
  return response.data
}

export const updateAdminScore = async (scoreId, payload) => {
  const response = await api.patch(`/api/admin/scores/${scoreId}`, payload)
  return response.data
}

export const getAdminSubscriptions = async () => {
  const response = await api.get('/api/admin/subscriptions')
  return response.data
}

export const updateAdminSubscription = async (subscriptionId, payload) => {
  const response = await api.patch(`/api/admin/subscriptions/${subscriptionId}`, payload)
  return response.data
}

export const getAdminReports = async () => {
  const response = await api.get('/api/admin/reports')
  return response.data
}
