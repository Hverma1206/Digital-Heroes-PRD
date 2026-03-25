import { from } from "../supabaseClient.js";
import { generateUniqueRandomNumbers, countMatches, groupWinnersByMatch } from "../utils/drawUtils.js";

const TIER_SPLITS = {
  5: 0.4,
  4: 0.35,
  3: 0.25,
};

function toMonthYear(inputMonth, inputYear) {
  const now = new Date();
  const month = Number.isInteger(Number(inputMonth)) ? Number(inputMonth) : now.getMonth() + 1;
  const year = Number.isInteger(Number(inputYear)) ? Number(inputYear) : now.getFullYear();

  return { month, year };
}

function weightedPickUniqueNumbers(weightsMap, count) {
  const candidates = Array.from(weightsMap.entries()).map(([number, weight]) => ({ number, weight: Number(weight) }));
  const result = [];

  while (result.length < count && candidates.length) {
    const totalWeight = candidates.reduce((sum, item) => sum + Math.max(0.0001, item.weight), 0);
    let random = Math.random() * totalWeight;
    let pickedIndex = 0;

    for (let i = 0; i < candidates.length; i += 1) {
      random -= Math.max(0.0001, candidates[i].weight);
      if (random <= 0) {
        pickedIndex = i;
        break;
      }
    }

    result.push(candidates[pickedIndex].number);
    candidates.splice(pickedIndex, 1);
  }

  return result.sort((a, b) => a - b);
}

async function buildScoreFrequencyMap() {
  const { data: activeSubscriptions, error: usersError } = await from("user_subscriptions")
    .select("user_id")
    .in("status", ["active", "trialing"]);

  if (usersError) {
    throw new Error(`Failed to fetch subscribed users: ${usersError.message}`);
  }

  const userIds = [...new Set((activeSubscriptions ?? []).map((row) => row.user_id))];
  if (!userIds.length) {
    return new Map();
  }

  const { data: scores, error: scoresError } = await from("scores")
    .select("user_id, score, created_at")
    .in("user_id", userIds)
    .order("created_at", { ascending: false });

  if (scoresError) {
    throw new Error(`Failed to fetch score frequencies: ${scoresError.message}`);
  }

  const byUser = new Map();
  for (const row of scores ?? []) {
    const key = row.user_id;
    if (!byUser.has(key)) {
      byUser.set(key, []);
    }

    const current = byUser.get(key);
    if (current.length < 5) {
      current.push(row.score);
    }
  }

  const frequency = new Map();
  for (let number = 1; number <= 45; number += 1) {
    frequency.set(number, 0);
  }

  for (const userScores of byUser.values()) {
    for (const score of userScores) {
      frequency.set(score, Number(frequency.get(score) || 0) + 1);
    }
  }

  return frequency;
}

async function generateNumbersByMode(mode, requestedNumbers) {
  if (Array.isArray(requestedNumbers) && requestedNumbers.length === 5) {
    const parsed = [...new Set(requestedNumbers.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 1 && value <= 45))];
    if (parsed.length !== 5) {
      throw new Error("Custom draw numbers must include exactly 5 unique values between 1 and 45");
    }

    return parsed.sort((a, b) => a - b);
  }

  if (mode === "algorithmic-most" || mode === "algorithmic-least" || mode === "algorithmic") {
    const frequency = await buildScoreFrequencyMap();
    if (!frequency.size) {
      return generateUniqueRandomNumbers(5, 1, 45);
    }

    const maxFrequency = Math.max(...Array.from(frequency.values()));
    const weighted = new Map();

    for (let number = 1; number <= 45; number += 1) {
      const freq = Number(frequency.get(number) || 0);

      if (mode === "algorithmic-least") {
        weighted.set(number, maxFrequency - freq + 1);
      } else {
        weighted.set(number, freq + 1);
      }
    }

    return weightedPickUniqueNumbers(weighted, 5);
  }

  return generateUniqueRandomNumbers(5, 1, 45);
}

async function getUsersByIds(userIds) {
  if (!userIds.length) {
    return [];
  }

  const { data: users, error } = await from("users")
    .select("id, email")
    .in("id", userIds);

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return users;
}

async function getGroupedWinnersForDraw(drawId) {
  const { data: winners, error } = await from("winners")
    .select(
      "id, user_id, draw_id, match_count, payout_amount, payout_status, verification_status, proof_url, created_at"
    )
    .eq("draw_id", drawId)
    .order("match_count", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch winners: ${error.message}`);
  }

  const users = await getUsersByIds((winners ?? []).map((winner) => winner.user_id));
  const userMap = new Map(users.map((user) => [String(user.id), user]));

  const winnersWithEmail = (winners ?? []).map((winner) => ({
    ...winner,
    email: userMap.get(String(winner.user_id))?.email || null,
  }));

  return groupWinnersByMatch(winnersWithEmail);
}

async function getCurrentRollover() {
  const { data: latestPublishedDraw, error } = await from("draws")
    .select("id, jackpot_rollover_out")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch rollover: ${error.message}`);
  }

  return Number(latestPublishedDraw?.jackpot_rollover_out || 0);
}

async function getActiveSubscriptionRevenueSnapshot() {
  const { data: activeSubscriptions, error: activeError } = await from("user_subscriptions")
    .select("id, plan_id, status")
    .in("status", ["active", "trialing"]);

  if (activeError) {
    throw new Error(`Failed to fetch active subscriptions: ${activeError.message}`);
  }

  const planIds = [...new Set((activeSubscriptions ?? []).map((row) => row.plan_id))];

  const { data: plans, error: plansError } = planIds.length
    ? await from("subscription_plans").select("id, price_inr").in("id", planIds)
    : { data: [], error: null };

  if (plansError) {
    throw new Error(`Failed to fetch plan prices: ${plansError.message}`);
  }

  const planPriceMap = new Map((plans ?? []).map((plan) => [plan.id, Number(plan.price_inr || 0)]));
  const totalRevenue = (activeSubscriptions ?? []).reduce(
    (sum, subscription) => sum + Number(planPriceMap.get(subscription.plan_id) || 0),
    0
  );

  return {
    activeSubscriberCount: (activeSubscriptions ?? []).length,
    totalRevenue,
  };
}

async function evaluateWinnersForNumbers(numbers) {
  const { data: activeSubscriptions, error: usersError } = await from("user_subscriptions")
    .select("user_id")
    .in("status", ["active", "trialing"]);

  if (usersError) {
    throw new Error(`Failed to fetch subscribed users: ${usersError.message}`);
  }

  const participantIds = [...new Set((activeSubscriptions ?? []).map((row) => row.user_id))];

  const winnerRows = [];

  for (const userId of participantIds) {
    const { data: userScores, error: scoresError } = await from("scores")
      .select("score")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (scoresError) {
      throw new Error(`Failed to fetch user scores: ${scoresError.message}`);
    }

    const scoreValues = (userScores ?? []).map((entry) => entry.score);
    const matchCount = countMatches(scoreValues, numbers);

    if (matchCount >= 3) {
      winnerRows.push({
        user_id: userId,
        match_count: matchCount,
      });
    }
  }

  return winnerRows;
}

function buildPoolSnapshot(totalRevenue, rolloverIn) {
  const tier3Pool = Number((totalRevenue * TIER_SPLITS[3]).toFixed(2));
  const tier4Pool = Number((totalRevenue * TIER_SPLITS[4]).toFixed(2));
  const tier5Base = Number((totalRevenue * TIER_SPLITS[5]).toFixed(2));
  const tier5Pool = Number((tier5Base + rolloverIn).toFixed(2));

  return {
    tier3Pool,
    tier4Pool,
    tier5Pool,
  };
}

async function createPublishedDraw({ simulationDrawId = null, month, year, mode = "random" }) {
  const { month: drawMonth, year: drawYear } = toMonthYear(month, year);

  const { data: alreadyPublished, error: checkError } = await from("draws")
    .select("id")
    .eq("status", "published")
    .eq("draw_month", drawMonth)
    .eq("draw_year", drawYear)
    .limit(1)
    .maybeSingle();

  if (checkError) {
    throw new Error(`Failed to validate publish window: ${checkError.message}`);
  }

  if (alreadyPublished) {
    throw new Error("A published draw already exists for this month");
  }

  let requestedNumbers = null;
  if (simulationDrawId) {
    const { data: simulationDraw, error: simulationError } = await from("draws")
      .select("id, numbers, status")
      .eq("id", simulationDrawId)
      .maybeSingle();

    if (simulationError) {
      throw new Error(`Failed to load simulation draw: ${simulationError.message}`);
    }

    if (!simulationDraw || String(simulationDraw.status || "").toLowerCase() !== "simulation") {
      throw new Error("Simulation draw not found");
    }

    requestedNumbers = simulationDraw.numbers;
  }

  const numbers = await generateNumbersByMode(mode, requestedNumbers);

  const [winnerRows, revenueSnapshot, rolloverIn] = await Promise.all([
    evaluateWinnersForNumbers(numbers),
    getActiveSubscriptionRevenueSnapshot(),
    getCurrentRollover(),
  ]);

  const pools = buildPoolSnapshot(revenueSnapshot.totalRevenue, rolloverIn);
  const groupedWinners = groupWinnersByMatch(winnerRows);

  const tier3WinnersCount = (groupedWinners[3] ?? []).length;
  const tier4WinnersCount = (groupedWinners[4] ?? []).length;
  const tier5WinnersCount = (groupedWinners[5] ?? []).length;

  const tier3PerWinner = tier3WinnersCount ? Number((pools.tier3Pool / tier3WinnersCount).toFixed(2)) : 0;
  const tier4PerWinner = tier4WinnersCount ? Number((pools.tier4Pool / tier4WinnersCount).toFixed(2)) : 0;
  const tier5PerWinner = tier5WinnersCount ? Number((pools.tier5Pool / tier5WinnersCount).toFixed(2)) : 0;
  const jackpotRolloverOut = tier5WinnersCount === 0 ? pools.tier5Pool : 0;

  const { data: publishedDraw, error: drawError } = await from("draws")
    .insert({
      numbers,
      status: "published",
      draw_mode: mode,
      draw_month: drawMonth,
      draw_year: drawYear,
      active_subscribers_snapshot: revenueSnapshot.activeSubscriberCount,
      subscription_revenue_snapshot: revenueSnapshot.totalRevenue,
      prize_pool_total: revenueSnapshot.totalRevenue,
      tier_3_pool: pools.tier3Pool,
      tier_4_pool: pools.tier4Pool,
      tier_5_pool: pools.tier5Pool,
      jackpot_rollover_in: rolloverIn,
      jackpot_rollover_out: jackpotRolloverOut,
      published_at: new Date().toISOString(),
    })
    .select(
      "id, numbers, status, draw_mode, draw_month, draw_year, prize_pool_total, tier_3_pool, tier_4_pool, tier_5_pool, jackpot_rollover_in, jackpot_rollover_out, published_at, created_at"
    )
    .single();

  if (drawError) {
    throw new Error(`Failed to publish draw: ${drawError.message}`);
  }

  const winnerInsertRows = winnerRows.map((winner) => {
    const payoutByMatch = {
      3: tier3PerWinner,
      4: tier4PerWinner,
      5: tier5PerWinner,
    };

    return {
      user_id: winner.user_id,
      draw_id: publishedDraw.id,
      match_count: winner.match_count,
      payout_amount: payoutByMatch[winner.match_count] ?? 0,
      payout_status: "pending",
      verification_status: "pending",
    };
  });

  if (winnerInsertRows.length) {
    const { error: winnerInsertError } = await from("winners").insert(winnerInsertRows);
    if (winnerInsertError) {
      throw new Error(`Failed to store winners: ${winnerInsertError.message}`);
    }
  }

  const winnersByMatch = await getGroupedWinnersForDraw(publishedDraw.id);

  return {
    draw: publishedDraw,
    winners: winnersByMatch,
    pools: {
      ...pools,
      jackpot_rollover_out: jackpotRolloverOut,
    },
  };
}

async function simulateDraw(req, res) {
  try {
    const { mode = "random", numbers: requestedNumbers, month, year } = req.body || {};
    const { month: drawMonth, year: drawYear } = toMonthYear(month, year);

    const numbers = await generateNumbersByMode(mode, requestedNumbers);

    const [winnerPreviewRows, revenueSnapshot, rolloverIn] = await Promise.all([
      evaluateWinnersForNumbers(numbers),
      getActiveSubscriptionRevenueSnapshot(),
      getCurrentRollover(),
    ]);

    const pools = buildPoolSnapshot(revenueSnapshot.totalRevenue, rolloverIn);

    const { data: simulationDraw, error: drawError } = await from("draws")
      .insert({
        numbers,
        status: "simulation",
        draw_mode: mode,
        draw_month: drawMonth,
        draw_year: drawYear,
        active_subscribers_snapshot: revenueSnapshot.activeSubscriberCount,
        subscription_revenue_snapshot: revenueSnapshot.totalRevenue,
        prize_pool_total: revenueSnapshot.totalRevenue,
        tier_3_pool: pools.tier3Pool,
        tier_4_pool: pools.tier4Pool,
        tier_5_pool: pools.tier5Pool,
        jackpot_rollover_in: rolloverIn,
        jackpot_rollover_out: 0,
      })
      .select(
        "id, numbers, status, draw_mode, draw_month, draw_year, prize_pool_total, tier_3_pool, tier_4_pool, tier_5_pool, jackpot_rollover_in, created_at"
      )
      .single();

    if (drawError) {
      return res.status(500).json({
        message: "Failed to create simulation draw. Ensure DB migration for draw workflow is applied.",
        error: drawError.message,
      });
    }

    const winnersByMatch = groupWinnersByMatch(winnerPreviewRows);

    return res.status(201).json({
      message: "Simulation completed",
      draw: simulationDraw,
      winners: winnersByMatch,
      pools,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to simulate draw", error: error.message });
  }
}

async function publishDraw(req, res) {
  try {
    const { simulationDrawId, month, year, mode = "random" } = req.body || {};
    const payload = await createPublishedDraw({ simulationDrawId, month, year, mode });

    return res.status(201).json({
      message: "Draw published successfully",
      draw: payload.draw,
      winners: payload.winners,
      pools: payload.pools,
    });
  } catch (error) {
    const status = String(error.message || "").includes("already exists") ? 409 : 500;
    return res.status(status).json({ message: "Failed to publish draw", error: error.message });
  }
}

async function runDraw(req, res) {
  // Backward-compatible endpoint: defaults to random when mode is not provided.
  req.body = {
    mode: req.body?.mode || "random",
    ...(req.body || {}),
  };
  return publishDraw(req, res);
}

async function getLatestDraw(req, res) {
  try {
    const { data: latestDraw, error: drawError } = await from("draws")
      .select(
        "id, numbers, status, draw_mode, draw_month, draw_year, prize_pool_total, tier_3_pool, tier_4_pool, tier_5_pool, jackpot_rollover_in, jackpot_rollover_out, published_at, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (drawError) {
      return res.status(500).json({ message: "Failed to fetch latest draw", error: drawError.message });
    }

    if (!latestDraw) {
      return res.status(200).json({
        draw: null,
        winners: {
          3: [],
          4: [],
          5: [],
        },
        message: "No draw found yet",
      });
    }

    const winnersByMatch = await getGroupedWinnersForDraw(latestDraw.id);

    return res.status(200).json({
      draw: latestDraw,
      winners: winnersByMatch,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function publishMonthlyDrawJob({ mode = "algorithmic-most" } = {}) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  return createPublishedDraw({ month, year, mode });
}

export default {
  runDraw,
  simulateDraw,
  publishDraw,
  getLatestDraw,
  publishMonthlyDrawJob,
};
