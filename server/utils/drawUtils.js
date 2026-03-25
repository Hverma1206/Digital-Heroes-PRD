export function generateUniqueRandomNumbers(count, min, max) {
  const pool = new Set();

  while (pool.size < count) {
    const random = Math.floor(Math.random() * (max - min + 1)) + min;
    pool.add(random);
  }

  return Array.from(pool).sort((a, b) => a - b);
}

export function countMatches(userScores, drawNumbers) {
  const userSet = new Set(userScores);
  const drawSet = new Set(drawNumbers);
  let matches = 0;

  for (const score of userSet) {
    if (drawSet.has(score)) {
      matches += 1;
    }
  }

  return matches;
}

export function groupWinnersByMatch(winners) {
  return winners.reduce(
    (grouped, winner) => {
      const key = winner.match_count;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(winner);
      return grouped;
    },
    {
      3: [],
      4: [],
      5: [],
    }
  );
}

export default {
  generateUniqueRandomNumbers,
  countMatches,
  groupWinnersByMatch,
};
