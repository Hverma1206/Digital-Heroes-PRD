import { from } from "../supabaseClient.js";

function parsePlayedAtDate(input) {
  if (!input) {
    return null;
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

async function addScore(req, res) {
  try {
    const { score, played_at } = req.body;

    if (!Number.isInteger(score) || score < 1 || score > 45) {
      return res.status(400).json({ message: "Score must be an integer between 1 and 45" });
    }

    const playedAtDate = parsePlayedAtDate(played_at);
    if (played_at && !playedAtDate) {
      return res.status(400).json({ message: "played_at must be a valid date" });
    }

    const { data: existingScores, error: fetchError } = await from("scores")
      .select("id, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: true });

    if (fetchError) {
      return res.status(500).json({ message: "Failed to fetch existing scores", error: fetchError.message });
    }

    // Keep only the latest 5 scores. If a 6th score is added, remove the oldest first.
    if (existingScores.length >= 5) {
      const idsToDelete = existingScores.slice(0, existingScores.length - 4).map((row) => row.id);

      const { error: deleteError } = await from("scores").delete().in("id", idsToDelete);

      if (deleteError) {
        return res.status(500).json({ message: "Failed to roll old scores", error: deleteError.message });
      }
    }

    const { data: newScore, error: insertError } = await from("scores")
      .insert({
        user_id: req.user.id,
        score,
        played_at: playedAtDate,
      })
      .select("id, user_id, score, played_at, created_at, updated_at")
      .single();

    if (insertError) {
      return res.status(500).json({ message: "Failed to add score", error: insertError.message });
    }

    return res.status(201).json({
      message: "Score added successfully",
      score: newScore,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function updateScore(req, res) {
  try {
    const scoreId = Number(req.params.scoreId);
    const { score, played_at } = req.body;

    if (!Number.isInteger(scoreId) || scoreId <= 0) {
      return res.status(400).json({ message: "Invalid scoreId" });
    }

    if (score !== undefined && (!Number.isInteger(score) || score < 1 || score > 45)) {
      return res.status(400).json({ message: "Score must be an integer between 1 and 45" });
    }

    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (score !== undefined) {
      updates.score = score;
    }

    if (played_at !== undefined) {
      const playedAtDate = parsePlayedAtDate(played_at);
      if (played_at && !playedAtDate) {
        return res.status(400).json({ message: "played_at must be a valid date" });
      }
      updates.played_at = playedAtDate;
    }

    const { data: updatedScore, error } = await from("scores")
      .update(updates)
      .eq("id", scoreId)
      .eq("user_id", req.user.id)
      .select("id, user_id, score, played_at, created_at, updated_at")
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: "Failed to update score", error: error.message });
    }

    if (!updatedScore) {
      return res.status(404).json({ message: "Score not found" });
    }

    return res.status(200).json({ message: "Score updated", score: updatedScore });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function getScores(req, res) {
  try {
    const { data: scores, error } = await from("scores")
      .select("id, user_id, score, played_at, created_at, updated_at")
      .eq("user_id", req.user.id)
      .order("played_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ message: "Failed to fetch scores", error: error.message });
    }

    return res.status(200).json({ scores });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

export default {
  addScore,
  updateScore,
  getScores,
};
