export const toArray = (payload, keys = []) => {
  if (Array.isArray(payload)) {
    return payload
  }

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key]
    }
  }

  return []
}

export const getScoreValue = (score) =>
  score?.score ?? score?.value ?? score?.points ?? score?.number ?? null

export const getScoreId = (score) =>
  score?.id ?? score?._id ?? `${scoreDate(score)}-${getScoreValue(score)}`

export const scoreDate = (score) =>
  score?.playedAt ??
  score?.played_at ??
  score?.createdAt ??
  score?.created_at ??
  score?.updatedAt ??
  score?.updated_at ??
  score?.date ??
  score?.timestamp ??
  null

export const latestFiveScores = (payload) => {
  const scores = toArray(payload, ['scores', 'data'])

  return scores
    .slice()
    .sort((a, b) => new Date(scoreDate(b) ?? 0) - new Date(scoreDate(a) ?? 0))
    .slice(0, 5)
}

export const formatDateTime = (value) => {
  if (!value) {
    return 'N/A'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'N/A'
  }

  return date.toLocaleString()
}

export const getDrawNumbers = (drawPayload) => {
  if (!drawPayload) {
    return []
  }

  if (Array.isArray(drawPayload.numbers)) {
    return drawPayload.numbers
  }

  if (Array.isArray(drawPayload.drawNumbers)) {
    return drawPayload.drawNumbers
  }

  if (Array.isArray(drawPayload.draw_numbers)) {
    return drawPayload.draw_numbers
  }

  if (Array.isArray(drawPayload.result)) {
    return drawPayload.result
  }

  return []
}

export const winnerGroups = (payload) => {
  const emptyGroups = { 3: [], 4: [], 5: [] }

  if (!payload) {
    return emptyGroups
  }

  const groupsObject =
    payload?.winners && typeof payload.winners === 'object' && !Array.isArray(payload.winners)
      ? payload.winners
      : typeof payload === 'object' && !Array.isArray(payload)
        ? payload
        : null

  if (groupsObject && (groupsObject[3] || groupsObject['3'] || groupsObject[4] || groupsObject['4'] || groupsObject[5] || groupsObject['5'])) {
    return [3, 4, 5].reduce((acc, count) => {
      acc[count] = Array.isArray(groupsObject[count])
        ? groupsObject[count]
        : Array.isArray(groupsObject[String(count)])
          ? groupsObject[String(count)]
          : []
      return acc
    }, { ...emptyGroups })
  }

  const winners = toArray(payload, ['winners'])
  return [3, 4, 5].reduce((acc, count) => {
    acc[count] = winners.filter((winner) => {
      const matchCount = winner?.matchCount ?? winner?.match_count ?? winner?.matches ?? winner?.matched
      return Number(matchCount) === count
    })
    return acc
  }, { ...emptyGroups })
}

export const selectedCharityFromUser = (user) => {
  if (!user) {
    return null
  }

  if (user.selectedCharity && typeof user.selectedCharity === 'object') {
    return user.selectedCharity
  }

  if (user.charity && typeof user.charity === 'object') {
    return user.charity
  }

  const charityName = user.selectedCharityName ?? user.charityName
  if (!charityName) {
    return null
  }

  return {
    name: charityName,
  }
}

export const isUserSubscribed = (user) => Boolean(user?.isSubscribed ?? user?.is_subscribed)

export const findWinnerForUser = (winnersPayload, userId) => {
  if (!userId || !winnersPayload) {
    return null
  }

  const groups = winnerGroups(winnersPayload)
  for (const count of [5, 4, 3]) {
    const match = (groups[count] || []).find((winner) => String(winner?.user_id ?? winner?.userId ?? winner?.id) === String(userId))
    if (match) {
      return {
        ...match,
        matchCount: Number(match?.matchCount ?? match?.match_count ?? count),
      }
    }
  }

  return null
}
