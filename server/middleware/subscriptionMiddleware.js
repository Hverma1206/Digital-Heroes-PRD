import { from } from "../supabaseClient.js";

async function requireActiveSubscription(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { data: latestSubscription, error: subscriptionError } = await from("user_subscriptions")
      .select("id, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      return res.status(500).json({ message: "Failed to verify subscription", error: subscriptionError.message });
    }

    const activeStates = new Set(["active", "trialing"]);
    if (latestSubscription && activeStates.has(String(latestSubscription.status || "").toLowerCase())) {
      return next();
    }

    const { data: user, error: userError } = await from("users")
      .select("is_subscribed")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      return res.status(500).json({ message: "Failed to verify user subscription flag", error: userError.message });
    }

    if (user?.is_subscribed) {
      return next();
    }

    return res.status(403).json({ message: "Active subscription required" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

export default {
  requireActiveSubscription,
};
