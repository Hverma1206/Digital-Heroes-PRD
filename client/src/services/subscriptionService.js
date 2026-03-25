import api from './api'

export const getPlans = async () => {
  const response = await api.get('/api/subscriptions/plans')
  return response.data
}

export const getSubscriptionStatus = async () => {
  const response = await api.get('/api/subscriptions/status')
  return response.data
}

export const createRazorpayOrder = async (planCode) => {
  const response = await api.post('/api/subscriptions/create-order', { planCode })
  return response.data
}

export const verifyRazorpayPayment = async (payload) => {
  const response = await api.post('/api/subscriptions/verify-payment', payload)
  return response.data
}

export const cancelSubscription = async () => {
  const response = await api.post('/api/subscriptions/cancel')
  return response.data
}
