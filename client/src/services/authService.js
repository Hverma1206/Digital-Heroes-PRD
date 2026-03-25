import api from './api'

export const login = async (credentials) => {
  const response = await api.post('/api/auth/login', credentials)
  return response.data
}

export const signup = async (credentials) => {
  const response = await api.post('/api/auth/signup', credentials)
  return response.data
}

export const getCurrentUser = async () => {
  const response = await api.get('/api/user/me')
  return response.data
}
