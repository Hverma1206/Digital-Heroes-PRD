import api from './api'

export const subscribeUser = async () => {
  const response = await api.post('/api/user/subscribe')
  return response.data
}

export const updateMyProfile = async (payload) => {
  const response = await api.patch('/api/user/me', payload)
  return response.data
}

export const selectCharity = async (charityId) => {
  const response = await api.post('/api/user/select-charity', { charity_id: Number(charityId) })
  return response.data
}

export const setCharityContribution = async (charityPercent) => {
  const response = await api.post('/api/user/charity-contribution', {
    charity_percent: Number(charityPercent),
  })
  return response.data
}

export const createDonation = async (payload) => {
  const response = await api.post('/api/user/donations', payload)
  return response.data
}

export const getMyDonations = async () => {
  const response = await api.get('/api/user/donations')
  return response.data
}
