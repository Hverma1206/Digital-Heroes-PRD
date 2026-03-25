import api from './api'

export const runDraw = async (payload = {}) => {
  const response = await api.post('/api/draw/run', payload)
  return response.data
}

export const simulateDraw = async (payload = {}) => {
  const response = await api.post('/api/draw/simulate', payload)
  return response.data
}

export const publishDraw = async (payload = {}) => {
  const response = await api.post('/api/draw/publish', payload)
  return response.data
}

export const getLatestDraw = async () => {
  const response = await api.get('/api/draw/latest')
  return response.data
}
