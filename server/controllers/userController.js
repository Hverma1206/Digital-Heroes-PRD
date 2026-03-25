import { from } from "../supabaseClient.js";

async function getCurrentUser(req, res) {
	try {
		const { data: user, error } = await from("users")
			.select("id, email, is_subscribed, charity_id, charity_percent")
			.eq("id", req.user.id)
			.maybeSingle();

		if (error) {
			return res.status(500).json({ message: "Failed to fetch user profile", error: error.message });
		}

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		return res.status(200).json({ user });
	} catch (error) {
		return res.status(500).json({ message: "Internal server error", error: error.message });
	}
}

async function subscribeUser(req, res) {
	try {
		const { data: user, error } = await from("users")
			.update({ is_subscribed: true })
			.eq("id", req.user.id)
			.select("id, email, is_subscribed, charity_id, charity_percent")
			.single();

		if (error) {
			return res.status(500).json({ message: "Failed to activate subscription", error: error.message });
		}

		return res.status(200).json({
			message: "Subscription activated",
			user,
		});
	} catch (error) {
		return res.status(500).json({ message: "Internal server error", error: error.message });
	}
}

async function selectCharity(req, res) {
	try {
		const charityId = Number(req.body.charity_id);

		if (!Number.isInteger(charityId) || charityId <= 0) {
			return res.status(400).json({ message: "charity_id must be a positive integer" });
		}

		const { data: charity, error: charityError } = await from("charities")
			.select("id")
			.eq("id", charityId)
			.maybeSingle();

		if (charityError) {
			return res.status(500).json({ message: "Failed to validate charity", error: charityError.message });
		}

		if (!charity) {
			return res.status(404).json({ message: "Charity not found" });
		}

		const { data: user, error } = await from("users")
			.update({ charity_id: charityId })
			.eq("id", req.user.id)
			.select("id, email, is_subscribed, charity_id, charity_percent")
			.single();

		if (error) {
			return res.status(500).json({ message: "Failed to select charity", error: error.message });
		}

		return res.status(200).json({
			message: "Charity selected",
			user,
		});
	} catch (error) {
		return res.status(500).json({ message: "Internal server error", error: error.message });
	}
}

async function setCharityContribution(req, res) {
	try {
		const charityPercent = Number(req.body.charity_percent);

		if (!Number.isFinite(charityPercent) || charityPercent < 10 || charityPercent > 100) {
			return res.status(400).json({ message: "charity_percent must be between 10 and 100" });
		}

		const { data: user, error } = await from("users")
			.update({ charity_percent: Number(charityPercent.toFixed(2)) })
			.eq("id", req.user.id)
			.select("id, email, is_subscribed, charity_id, charity_percent")
			.single();

		if (error) {
			return res.status(500).json({ message: "Failed to update contribution percentage", error: error.message });
		}

		return res.status(200).json({ message: "Contribution percentage updated", user });
	} catch (error) {
		return res.status(500).json({ message: "Internal server error", error: error.message });
	}
}

async function createDonation(req, res) {
	try {
		const charityId = Number(req.body.charity_id);
		const amountInr = Number(req.body.amount_inr);
		const note = req.body.note ? String(req.body.note).trim() : null;

		if (!Number.isInteger(charityId) || charityId <= 0) {
			return res.status(400).json({ message: "charity_id must be a positive integer" });
		}

		if (!Number.isFinite(amountInr) || amountInr <= 0) {
			return res.status(400).json({ message: "amount_inr must be greater than 0" });
		}

		const { data: charity, error: charityError } = await from("charities")
			.select("id")
			.eq("id", charityId)
			.maybeSingle();

		if (charityError) {
			return res.status(500).json({ message: "Failed to validate charity", error: charityError.message });
		}

		if (!charity) {
			return res.status(404).json({ message: "Charity not found" });
		}

		const { data: donation, error } = await from("donations")
			.insert({
				user_id: req.user.id,
				charity_id: charityId,
				amount_inr: Number(amountInr.toFixed(2)),
				provider: "manual",
				status: "completed",
				note,
			})
			.select("id, user_id, charity_id, amount_inr, provider, status, note, created_at")
			.single();

		if (error) {
			return res.status(500).json({ message: "Failed to create donation", error: error.message });
		}

		return res.status(201).json({ message: "Donation recorded", donation });
	} catch (error) {
		return res.status(500).json({ message: "Internal server error", error: error.message });
	}
}

async function getMyDonations(req, res) {
	try {
		const { data: donations, error } = await from("donations")
			.select("id, user_id, charity_id, amount_inr, provider, status, note, created_at")
			.eq("user_id", req.user.id)
			.order("created_at", { ascending: false });

		if (error) {
			return res.status(500).json({ message: "Failed to load donations", error: error.message });
		}

		return res.status(200).json({ donations: donations ?? [] });
	} catch (error) {
		return res.status(500).json({ message: "Internal server error", error: error.message });
	}
}

export default {
	getCurrentUser,
	subscribeUser,
	selectCharity,
	setCharityContribution,
	createDonation,
	getMyDonations,
};
