import { from } from "../supabaseClient.js";

async function getOverview(req, res) {
  try {
    const [usersCountResult, charitiesCountResult, subscribedCountResult, latestDrawResult, featuredCharitiesResult] = await Promise.all([
      from("users").select("id", { count: "exact", head: true }),
      from("charities").select("id", { count: "exact", head: true }),
      from("users").select("id", { count: "exact", head: true }).eq("is_subscribed", true),
      from("draws").select("id, numbers, created_at, published_at, draw_mode").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      from("charities")
        .select("id, name, description, image_url, category, location, upcoming_event_title, upcoming_event_date")
        .eq("is_featured", true)
        .order("name", { ascending: true })
        .limit(4),
    ]);

    if (usersCountResult.error || charitiesCountResult.error || subscribedCountResult.error || latestDrawResult.error || featuredCharitiesResult.error) {
      return res.status(500).json({
        message: "Failed to load public overview",
        error:
          usersCountResult.error?.message ||
          charitiesCountResult.error?.message ||
          subscribedCountResult.error?.message ||
          latestDrawResult.error?.message ||
          featuredCharitiesResult.error?.message,
      });
    }

    return res.status(200).json({
      stats: {
        totalUsers: usersCountResult.count ?? 0,
        totalCharities: charitiesCountResult.count ?? 0,
        activeSubscribers: subscribedCountResult.count ?? 0,
      },
      latestDraw: latestDrawResult.data ?? null,
      featuredCharities: featuredCharitiesResult.data ?? [],
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function getCharities(req, res) {
  try {
    const search = String(req.query.q || "").trim();
    const category = String(req.query.category || "").trim();
    const featured = String(req.query.featured || "").toLowerCase();

    let query = from("charities")
      .select("id, name, description, image_url, category, location, is_featured, upcoming_event_title, upcoming_event_date")
      .order("is_featured", { ascending: false })
      .order("name", { ascending: true });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (featured === "true") {
      query = query.eq("is_featured", true);
    }

    const { data: charities, error } = await query;

    if (error) {
      return res.status(500).json({ message: "Failed to fetch charities", error: error.message });
    }

    return res.status(200).json({ charities: charities ?? [] });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function getCharityProfile(req, res) {
  try {
    const charityId = Number(req.params.charityId);

    if (!Number.isInteger(charityId) || charityId <= 0) {
      return res.status(400).json({ message: "Invalid charityId" });
    }

    const { data: charity, error } = await from("charities")
      .select("id, name, description, image_url, category, location, is_featured, upcoming_event_title, upcoming_event_date")
      .eq("id", charityId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: "Failed to fetch charity profile", error: error.message });
    }

    if (!charity) {
      return res.status(404).json({ message: "Charity not found" });
    }

    return res.status(200).json({ charity });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

export default {
  getOverview,
  getCharities,
  getCharityProfile,
};
