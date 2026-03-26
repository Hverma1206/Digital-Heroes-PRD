import { from } from "../supabaseClient.js";

function getNextMonthIsoDate(baseDate = new Date()) {
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth();
  return new Date(Date.UTC(year, month + 1, 1, 0, 0, 0)).toISOString();
}

function getUpcomingDrawDate(latestPublishedDraw) {
  const drawYear = Number(latestPublishedDraw?.draw_year);
  const drawMonth = Number(latestPublishedDraw?.draw_month);

  if (Number.isInteger(drawYear) && Number.isInteger(drawMonth) && drawMonth >= 1 && drawMonth <= 12) {
    return new Date(Date.UTC(drawYear, drawMonth, 1, 0, 0, 0)).toISOString();
  }

  return getNextMonthIsoDate();
}

async function getDrawsEnteredCount(userId) {
  const { data: latestSubscription, error: subscriptionError } = await from("user_subscriptions")
    .select("id, status, started_at, ended_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) {
    throw new Error(`Failed to load subscription participation window: ${subscriptionError.message}`);
  }

  if (!latestSubscription?.started_at) {
    return 0;
  }

  let query = from("draws")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .gte("published_at", latestSubscription.started_at);

  if (latestSubscription.ended_at) {
    query = query.lte("published_at", latestSubscription.ended_at);
  }

  const { count, error: drawCountError } = await query;

  if (drawCountError) {
    throw new Error(`Failed to load draws entered: ${drawCountError.message}`);
  }

  return Number(count || 0);
}

async function getUserWinnerResult(req, res) {
  try {
    const { data: latestDraw, error: drawError } = await from("draws")
      .select("id, numbers, created_at, status, published_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (drawError) {
      return res.status(500).json({ message: "Failed to fetch latest draw", error: drawError.message });
    }

    const { data: latestPublishedDraw, error: latestPublishedError } = await from("draws")
      .select("id, draw_month, draw_year, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestPublishedError) {
      return res.status(500).json({ message: "Failed to fetch latest published draw", error: latestPublishedError.message });
    }

    let winner = null;
    if (latestDraw?.id) {
      const winnerResponse = await from("winners")
        .select("id, user_id, draw_id, match_count, payout_amount, payout_status, verification_status, proof_url, created_at")
        .eq("draw_id", latestDraw.id)
        .eq("user_id", req.user.id)
        .maybeSingle();

      if (winnerResponse.error) {
        return res.status(500).json({ message: "Failed to fetch winner result", error: winnerResponse.error.message });
      }

      winner = winnerResponse.data;
    }

    const { data: allUserWinnings, error: allWinningsError } = await from("winners")
      .select("payout_amount, payout_status")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (allWinningsError) {
      return res.status(500).json({ message: "Failed to fetch user winnings", error: allWinningsError.message });
    }

    const totalWinnings = Number(
      (allUserWinnings ?? []).reduce((sum, row) => sum + Number(row.payout_amount || 0), 0).toFixed(2)
    );
    const paymentStatus =
      (allUserWinnings ?? []).find((row) => String(row.payout_status || "").toLowerCase() === "pending")?.payout_status ||
      (allUserWinnings ?? [])[0]?.payout_status ||
      "none";
    const drawsEntered = await getDrawsEnteredCount(req.user.id);
    const upcomingDrawAt = getUpcomingDrawDate(latestPublishedDraw);

    return res.status(200).json({
      result: winner ?? null,
      draw: latestDraw ?? null,
      summary: {
        total_winnings: totalWinnings,
        payment_status: paymentStatus,
        draws_entered: drawsEntered,
        upcoming_draw_at: upcomingDrawAt,
      },
      message: latestDraw ? undefined : "No draw found yet",
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function submitWinnerProof(req, res) {
  try {
    const winnerId = Number(req.params.winnerId);
    const uploadedFilePath = req.file?.filename ? `${req.protocol}://${req.get("host")}/uploads/winner-proofs/${req.file.filename}` : "";
    const proofUrl = String(req.body.proof_url || uploadedFilePath || "").trim();

    if (!Number.isInteger(winnerId) || winnerId <= 0) {
      return res.status(400).json({ message: "Invalid winnerId" });
    }

    if (!proofUrl) {
      return res.status(400).json({ message: "proof_url is required" });
    }

    const { data: winner, error: winnerError } = await from("winners")
      .select("id, user_id, proof_url, verification_status, payout_status")
      .eq("id", winnerId)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (winnerError) {
      return res.status(500).json({ message: "Failed to validate winner", error: winnerError.message });
    }

    if (!winner) {
      return res.status(404).json({ message: "Winner record not found" });
    }

    const { data: updated, error: updateError } = await from("winners")
      .update({ proof_url: proofUrl, verification_status: "submitted", updated_at: new Date().toISOString() })
      .eq("id", winnerId)
      .select("id, user_id, draw_id, match_count, proof_url, verification_status, payout_status")
      .maybeSingle();

    if (updateError) {
      return res.status(500).json({ message: "Failed to submit proof", error: updateError.message });
    }

    return res.status(200).json({ message: "Proof submitted", winner: updated });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function listAllWinners(req, res) {
  try {
    const { data: winners, error } = await from("winners")
      .select(
        "id, user_id, draw_id, match_count, payout_amount, payout_status, verification_status, proof_url, verification_notes, verified_at, paid_at, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ message: "Failed to fetch winners", error: error.message });
    }

    const userIds = [...new Set((winners ?? []).map((winner) => winner.user_id))];
    const drawIds = [...new Set((winners ?? []).map((winner) => winner.draw_id))];

    const [usersResult, drawsResult] = await Promise.all([
      userIds.length ? from("users").select("id, email").in("id", userIds) : Promise.resolve({ data: [], error: null }),
      drawIds.length ? from("draws").select("id, numbers, created_at").in("id", drawIds) : Promise.resolve({ data: [], error: null }),
    ]);

    if (usersResult.error || drawsResult.error) {
      return res.status(500).json({
        message: "Failed to enrich winner data",
        error: usersResult.error?.message || drawsResult.error?.message,
      });
    }

    const userMap = new Map((usersResult.data ?? []).map((user) => [user.id, user]));
    const drawMap = new Map((drawsResult.data ?? []).map((draw) => [draw.id, draw]));

    const enriched = (winners ?? []).map((winner) => ({
      ...winner,
      user_email: userMap.get(winner.user_id)?.email ?? null,
      draw_numbers: drawMap.get(winner.draw_id)?.numbers ?? [],
      draw_created_at: drawMap.get(winner.draw_id)?.created_at ?? null,
    }));

    return res.status(200).json({ winners: enriched });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function verifyWinner(req, res) {
  try {
    const winnerId = Number(req.params.winnerId);
    const action = String(req.body.action || "").toLowerCase();
    const notes = req.body.notes ? String(req.body.notes).trim() : null;

    if (!Number.isInteger(winnerId) || winnerId <= 0) {
      return res.status(400).json({ message: "Invalid winnerId" });
    }

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "action must be approve or reject" });
    }

    const verificationStatus = action === "approve" ? "approved" : "rejected";
    const payoutStatus = action === "approve" ? "pending" : "canceled";

    const { data: updated, error } = await from("winners")
      .update({
        verification_status: verificationStatus,
        payout_status: payoutStatus,
        verification_notes: notes,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", winnerId)
      .select(
        "id, user_id, draw_id, match_count, payout_amount, payout_status, verification_status, proof_url, verification_notes, verified_at, paid_at"
      )
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: "Failed to verify winner", error: error.message });
    }

    if (!updated) {
      return res.status(404).json({ message: "Winner record not found" });
    }

    return res.status(200).json({ message: `Winner ${verificationStatus}`, winner: updated });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function markWinnerPaid(req, res) {
  try {
    const winnerId = Number(req.params.winnerId);

    if (!Number.isInteger(winnerId) || winnerId <= 0) {
      return res.status(400).json({ message: "Invalid winnerId" });
    }

    const { data: winner, error: winnerError } = await from("winners")
      .select("id, payout_status, verification_status")
      .eq("id", winnerId)
      .maybeSingle();

    if (winnerError) {
      return res.status(500).json({ message: "Failed to validate winner", error: winnerError.message });
    }

    if (!winner) {
      return res.status(404).json({ message: "Winner record not found" });
    }

    if (String(winner.verification_status || "").toLowerCase() !== "approved") {
      return res.status(400).json({ message: "Winner must be approved before payout" });
    }

    const { data: updated, error } = await from("winners")
      .update({ payout_status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", winnerId)
      .select(
        "id, user_id, draw_id, match_count, payout_amount, payout_status, verification_status, proof_url, verification_notes, verified_at, paid_at"
      )
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: "Failed to update payout status", error: error.message });
    }

    return res.status(200).json({ message: "Winner marked as paid", winner: updated });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

export default {
  getUserWinnerResult,
  submitWinnerProof,
  listAllWinners,
  verifyWinner,
  markWinnerPaid,
};
