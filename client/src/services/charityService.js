import api from './api'

export const getCharities = async (params = {}) => {
  const response = await api.get('/api/charities', { params })
  return response.data
}

export const getCharityById = async (charityId) => {
  const response = await api.get(`/api/charities/${charityId}`)
  return response.data
}

export const createCharity = async (payload) => {
  const response = await api.post('/api/charities', payload)
  return response.data
}

export const updateCharity = async (charityId, payload) => {
  const response = await api.patch(`/api/charities/${charityId}`, payload)
  return response.data
}

export const deleteCharity = async (charityId) => {
  const response = await api.delete(`/api/charities/${charityId}`)
  return response.data
}
