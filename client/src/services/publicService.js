import api from './api'

export const getPublicOverview = async () => {
  const response = await api.get('/api/public/overview')
  return response.data
}

export const getPublicCharities = async () => {
  const response = await api.get('/api/public/charities')
  return response.data
}

export const getPublicCharitiesFiltered = async (params = {}) => {
  const response = await api.get('/api/public/charities', { params })
  return response.data
}

export const getPublicCharityProfile = async (charityId) => {
  const response = await api.get(`/api/public/charities/${charityId}`)
  return response.data
}
