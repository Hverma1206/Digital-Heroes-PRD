import { from } from "../supabaseClient.js";

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

async function createCharity(req, res) {
	try {
		const name = String(req.body.name || "").trim();
		const description = req.body.description ? String(req.body.description).trim() : null;
		const imageUrl = req.body.image_url ? String(req.body.image_url).trim() : null;
		const category = req.body.category ? String(req.body.category).trim() : null;
		const location = req.body.location ? String(req.body.location).trim() : null;
		const isFeatured = Boolean(req.body.is_featured);
		const upcomingEventTitle = req.body.upcoming_event_title ? String(req.body.upcoming_event_title).trim() : null;
		const upcomingEventDate = req.body.upcoming_event_date ? String(req.body.upcoming_event_date).trim() : null;

		if (!name) {
			return res.status(400).json({ message: "Charity name is required" });
		}

		const { data: charity, error } = await from("charities")
			.insert({
				name,
				description,
				image_url: imageUrl,
				category,
				location,
				is_featured: isFeatured,
				upcoming_event_title: upcomingEventTitle,
				upcoming_event_date: upcomingEventDate,
			})
			.select("id, name, description, image_url, category, location, is_featured, upcoming_event_title, upcoming_event_date")
			.single();

		if (error) {
			return res.status(500).json({ message: "Failed to create charity", error: error.message });
		}

		return res.status(201).json({ message: "Charity created", charity });
	} catch (error) {
		return res.status(500).json({ message: "Internal server error", error: error.message });
	}
}

async function updateCharity(req, res) {
	try {
		const charityId = Number(req.params.charityId);

		if (!Number.isInteger(charityId) || charityId <= 0) {
			return res.status(400).json({ message: "Invalid charityId" });
		}

		const updates = {};
		if (typeof req.body.name === "string") {
			updates.name = req.body.name.trim();
		}
		if (req.body.description !== undefined) {
			updates.description = req.body.description ? String(req.body.description).trim() : null;
		}
		if (req.body.image_url !== undefined) {
			updates.image_url = req.body.image_url ? String(req.body.image_url).trim() : null;
		}
		if (req.body.category !== undefined) {
			updates.category = req.body.category ? String(req.body.category).trim() : null;
		}
		if (req.body.location !== undefined) {
			updates.location = req.body.location ? String(req.body.location).trim() : null;
		}
		if (req.body.is_featured !== undefined) {
			updates.is_featured = Boolean(req.body.is_featured);
		}
		if (req.body.upcoming_event_title !== undefined) {
			updates.upcoming_event_title = req.body.upcoming_event_title ? String(req.body.upcoming_event_title).trim() : null;
		}
		if (req.body.upcoming_event_date !== undefined) {
			updates.upcoming_event_date = req.body.upcoming_event_date ? String(req.body.upcoming_event_date).trim() : null;
		}

		if (Object.keys(updates).length === 0) {
			return res.status(400).json({ message: "No valid fields provided for update" });
		}

		const { data: charity, error } = await from("charities")
			.update(updates)
			.eq("id", charityId)
			.select("id, name, description, image_url, category, location, is_featured, upcoming_event_title, upcoming_event_date")
			.maybeSingle();

		if (error) {
			return res.status(500).json({ message: "Failed to update charity", error: error.message });
		}

		if (!charity) {
			return res.status(404).json({ message: "Charity not found" });
		}

		return res.status(200).json({ message: "Charity updated", charity });
	} catch (error) {
		return res.status(500).json({ message: "Internal server error", error: error.message });
	}
}

async function deleteCharity(req, res) {
	try {
		const charityId = Number(req.params.charityId);

		if (!Number.isInteger(charityId) || charityId <= 0) {
			return res.status(400).json({ message: "Invalid charityId" });
		}

		const { data: charity, error } = await from("charities")
			.delete()
			.eq("id", charityId)
			.select("id, name")
			.maybeSingle();

		if (error) {
			return res.status(500).json({ message: "Failed to delete charity", error: error.message });
		}

		if (!charity) {
			return res.status(404).json({ message: "Charity not found" });
		}

		return res.status(200).json({ message: "Charity deleted", charity });
	} catch (error) {
		return res.status(500).json({ message: "Internal server error", error: error.message });
	}
}

async function getCharityById(req, res) {
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
			return res.status(500).json({ message: "Failed to fetch charity", error: error.message });
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
	getCharities,
	getCharityById,
	createCharity,
	updateCharity,
	deleteCharity,
};
