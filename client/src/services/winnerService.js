import api from './api'

export const getUserWinnerResult = async () => {
  const response = await api.get('/api/winners/user/me')
  return response.data
}

export const submitWinnerProof = async (winnerId, proofUrl) => {
  const response = await api.post(`/api/winners/${winnerId}/proof`, { proof_url: proofUrl })
  return response.data
}

export const uploadWinnerProofFile = async (winnerId, file) => {
  const formData = new FormData()
  formData.append('proof', file)

  const response = await api.post(`/api/winners/${winnerId}/proof-upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export const getAdminWinners = async () => {
  const response = await api.get('/api/winners/admin/all')
  return response.data
}

export const verifyWinner = async (winnerId, action, notes = '') => {
  const response = await api.post(`/api/winners/${winnerId}/verify`, { action, notes })
  return response.data
}

export const markWinnerPaid = async (winnerId) => {
  const response = await api.post(`/api/winners/${winnerId}/payout`)
  return response.data
}
