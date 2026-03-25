import { from } from "../supabaseClient.js";

async function listUsers(req, res) {
  try {
    const { data: users, error } = await from("users")
      .select("id, email, is_subscribed, charity_id, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ message: "Failed to fetch users", error: error.message });
    }

    return res.status(200).json({ users: users ?? [] });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function listScores(req, res) {
  try {
    const { data: scores, error } = await from("scores")
      .select("id, user_id, score, played_at, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return res.status(500).json({ message: "Failed to fetch scores", error: error.message });
    }

    const userIds = [...new Set((scores ?? []).map((row) => row.user_id))];
    const { data: users, error: usersError } = userIds.length
      ? await from("users").select("id, email").in("id", userIds)
      : { data: [], error: null };

    if (usersError) {
      return res.status(500).json({ message: "Failed to enrich scores", error: usersError.message });
    }

    const userMap = new Map((users ?? []).map((row) => [row.id, row.email]));
    const enriched = (scores ?? []).map((row) => ({
      ...row,
      user_email: userMap.get(row.user_id) ?? null,
    }));

    return res.status(200).json({ scores: enriched });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function updateScore(req, res) {
  try {
    const scoreId = Number(req.params.scoreId);
    const nextScore = req.body?.score;
    const nextPlayedAt = req.body?.played_at;

    if (!Number.isInteger(scoreId) || scoreId <= 0) {
      return res.status(400).json({ message: "Invalid scoreId" });
    }

    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (nextScore !== undefined) {
      const parsedScore = Number(nextScore);
      if (!Number.isInteger(parsedScore) || parsedScore < 1 || parsedScore > 45) {
        return res.status(400).json({ message: "Score must be an integer between 1 and 45" });
      }
      updates.score = parsedScore;
    }

    if (nextPlayedAt !== undefined) {
      if (!nextPlayedAt) {
        updates.played_at = null;
      } else {
        const date = new Date(nextPlayedAt);
        if (Number.isNaN(date.getTime())) {
          return res.status(400).json({ message: "played_at must be a valid date" });
        }
        updates.played_at = date.toISOString().slice(0, 10);
      }
    }

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ message: "No valid fields provided for update" });
    }

    const { data: score, error } = await from("scores")
      .update(updates)
      .eq("id", scoreId)
      .select("id, user_id, score, played_at, created_at, updated_at")
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: "Failed to update score", error: error.message });
    }

    if (!score) {
      return res.status(404).json({ message: "Score not found" });
    }

    return res.status(200).json({ message: "Score updated", score });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function updateUser(req, res) {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const updates = {};
    if (typeof req.body.email === "string") {
      updates.email = req.body.email.trim().toLowerCase();
    }
    if (typeof req.body.is_subscribed === "boolean") {
      updates.is_subscribed = req.body.is_subscribed;
    }
    if (req.body.charity_id !== undefined) {
      const charityId = Number(req.body.charity_id);
      if (Number.isInteger(charityId) && charityId > 0) {
        updates.charity_id = charityId;
      } else {
        updates.charity_id = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update" });
    }

    const { data: user, error } = await from("users")
      .update(updates)
      .eq("id", userId)
      .select("id, email, is_subscribed, charity_id, created_at")
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: "Failed to update user", error: error.message });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "User updated", user });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function listSubscriptions(req, res) {
  try {
    const { data: subscriptions, error } = await from("user_subscriptions")
      .select("id, user_id, plan_id, status, started_at, renewal_at, ended_at, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ message: "Failed to fetch subscriptions", error: error.message });
    }

    const userIds = [...new Set((subscriptions ?? []).map((row) => row.user_id))];
    const planIds = [...new Set((subscriptions ?? []).map((row) => row.plan_id))];

    const [usersResult, plansResult] = await Promise.all([
      userIds.length ? from("users").select("id, email").in("id", userIds) : Promise.resolve({ data: [], error: null }),
      planIds.length ? from("subscription_plans").select("id, code, name").in("id", planIds) : Promise.resolve({ data: [], error: null }),
    ]);

    if (usersResult.error || plansResult.error) {
      return res.status(500).json({
        message: "Failed to enrich subscriptions",
        error: usersResult.error?.message || plansResult.error?.message,
      });
    }

    const userMap = new Map((usersResult.data ?? []).map((row) => [row.id, row]));
    const planMap = new Map((plansResult.data ?? []).map((row) => [row.id, row]));

    const enriched = (subscriptions ?? []).map((row) => ({
      ...row,
      user_email: userMap.get(row.user_id)?.email ?? null,
      plan_code: planMap.get(row.plan_id)?.code ?? null,
      plan_name: planMap.get(row.plan_id)?.name ?? null,
    }));

    return res.status(200).json({ subscriptions: enriched });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function updateSubscription(req, res) {
  try {
    const subscriptionId = Number(req.params.subscriptionId);
    const { status, renewal_at, ended_at } = req.body;

    if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) {
      return res.status(400).json({ message: "Invalid subscriptionId" });
    }

    const updates = {};
    if (typeof status === "string") {
      updates.status = status;
    }
    if (renewal_at !== undefined) {
      updates.renewal_at = renewal_at || null;
    }
    if (ended_at !== undefined) {
      updates.ended_at = ended_at || null;
    }
    updates.updated_at = new Date().toISOString();

    const { data: subscription, error } = await from("user_subscriptions")
      .update(updates)
      .eq("id", subscriptionId)
      .select("id, user_id, plan_id, status, started_at, renewal_at, ended_at")
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: "Failed to update subscription", error: error.message });
    }

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const active = ["active", "trialing"].includes(String(subscription.status || "").toLowerCase());
    await from("users").update({ is_subscribed: active }).eq("id", subscription.user_id);

    return res.status(200).json({ message: "Subscription updated", subscription });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function getReports(req, res) {
  try {
    const [
      usersCountResult,
      subscribedCountResult,
      charitiesCountResult,
      drawsCountResult,
      paymentsResult,
      prizePoolsResult,
      donationsResult,
      drawStatsResult,
    ] = await Promise.all([
      from("users").select("id", { count: "exact", head: true }),
      from("users").select("id", { count: "exact", head: true }).eq("is_subscribed", true),
      from("charities").select("id", { count: "exact", head: true }),
      from("draws").select("id", { count: "exact", head: true }),
      from("subscription_payments").select("amount_inr, charity_amount_inr, status"),
      from("draws").select("tier_3_pool, tier_4_pool, tier_5_pool, jackpot_rollover_out"),
      from("donations").select("amount_inr, status"),
      from("draws").select("id, status, draw_mode"),
    ]);

    const maybeError =
      usersCountResult.error ||
      subscribedCountResult.error ||
      charitiesCountResult.error ||
      drawsCountResult.error ||
      paymentsResult.error ||
      prizePoolsResult.error ||
      donationsResult.error ||
      drawStatsResult.error;

    if (maybeError) {
      return res.status(500).json({ message: "Failed to build reports", error: maybeError.message });
    }

    const totalRevenue = (paymentsResult.data ?? [])
      .filter((row) => String(row.status || "").toLowerCase() === "paid")
      .reduce((sum, row) => sum + Number(row.amount_inr || 0), 0);

    const totalPrizePool = (prizePoolsResult.data ?? []).reduce(
      (sum, row) => sum + Number(row.tier_3_pool || 0) + Number(row.tier_4_pool || 0) + Number(row.tier_5_pool || 0),
      0
    );

    const totalRolloverOutstanding = (prizePoolsResult.data ?? []).reduce(
      (sum, row) => sum + Number(row.jackpot_rollover_out || 0),
      0
    );

    const totalDonations = (donationsResult.data ?? [])
      .filter((row) => String(row.status || "").toLowerCase() === "completed")
      .reduce((sum, row) => sum + Number(row.amount_inr || 0), 0);

    const totalCharityContribution = (paymentsResult.data ?? [])
      .filter((row) => String(row.status || "").toLowerCase() === "paid")
      .reduce((sum, row) => sum + Number(row.charity_amount_inr || 0), 0);

    const drawRows = drawStatsResult.data ?? [];
    const drawStatistics = {
      published: drawRows.filter((row) => row.status === "published").length,
      simulation: drawRows.filter((row) => row.status === "simulation").length,
      random: drawRows.filter((row) => String(row.draw_mode || "") === "random").length,
      algorithmic: drawRows.filter((row) => String(row.draw_mode || "").startsWith("algorithmic")).length,
    };

    return res.status(200).json({
      reports: {
        totalUsers: usersCountResult.count ?? 0,
        activeSubscribers: subscribedCountResult.count ?? 0,
        totalCharities: charitiesCountResult.count ?? 0,
        totalDraws: drawsCountResult.count ?? 0,
        totalRevenue,
        totalPrizePool,
        totalRolloverOutstanding,
        totalDonations,
        totalCharityContribution,
        drawStatistics,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

export default {
  listUsers,
  updateUser,
  listScores,
  updateScore,
  listSubscriptions,
  updateSubscription,
  getReports,
};
