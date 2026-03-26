import { from } from "../supabaseClient.js";
import bcrypt from "bcryptjs";

const { hash, compare } = bcrypt;

function normalizeEmail(email) {
	return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function fetchUserProfile(userId) {
	const withName = await from("users")
		.select("id, name, email, is_subscribed, charity_id, charity_percent")
		.eq("id", userId)
		.maybeSingle();

	if (!withName.error) {
		return withName;
	}

	const missingNameColumn = String(withName.error?.message || "").toLowerCase().includes("column") &&
		String(withName.error?.message || "").toLowerCase().includes("name");

	if (!missingNameColumn) {
		return withName;
	}

	return from("users")
		.select("id, email, is_subscribed, charity_id, charity_percent")
		.eq("id", userId)
		.maybeSingle();
}

async function getCurrentUser(req, res) {
	try {
		const { data: user, error } = await fetchUserProfile(req.user.id);

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

async function updateCurrentUser(req, res) {
	try {
		const nextEmailRaw = req.body?.email;
		const nextNameRaw = req.body?.name;
		const currentPassword = req.body?.current_password;
		const newPassword = req.body?.new_password;

		const updates = {};

		if (nextNameRaw !== undefined) {
			const nextName = String(nextNameRaw).trim();
			if (nextName.length < 2 || nextName.length > 80) {
				return res.status(400).json({ message: "name must be between 2 and 80 characters" });
			}
			updates.name = nextName;
		}

		if (nextEmailRaw !== undefined) {
			const nextEmail = normalizeEmail(nextEmailRaw);
			if (!isValidEmail(nextEmail)) {
				return res.status(400).json({ message: "Invalid email format" });
			}

			const { data: duplicateUser, error: duplicateError } = await from("users")
				.select("id")
				.eq("email", nextEmail)
				.neq("id", req.user.id)
				.maybeSingle();

			if (duplicateError) {
				return res.status(500).json({ message: "Failed to validate email", error: duplicateError.message });
			}

			if (duplicateUser) {
				return res.status(409).json({ message: "Email already in use" });
			}

			updates.email = nextEmail;
		}

		if (newPassword !== undefined) {
			if (!currentPassword) {
				return res.status(400).json({ message: "current_password is required to change password" });
			}

			if (String(newPassword).length < 6) {
				return res.status(400).json({ message: "new_password must be at least 6 characters" });
			}

			const { data: userWithPassword, error: passwordFetchError } = await from("users")
				.select("id, password")
				.eq("id", req.user.id)
				.maybeSingle();

			if (passwordFetchError) {
				return res.status(500).json({ message: "Failed to verify current password", error: passwordFetchError.message });
			}

			if (!userWithPassword) {
				return res.status(404).json({ message: "User not found" });
			}

			const isPasswordMatch = await compare(String(currentPassword), String(userWithPassword.password || ""));
			if (!isPasswordMatch) {
				return res.status(401).json({ message: "Current password is incorrect" });
			}

			updates.password = await hash(String(newPassword), 10);
		}

		if (Object.keys(updates).length === 0) {
			return res.status(400).json({ message: "No valid settings provided" });
		}

		const updateResponse = await from("users")
			.update(updates)
			.eq("id", req.user.id)
			.select("id")
			.maybeSingle();

		if (updateResponse.error) {
			const unknownNameColumn =
				updates.name !== undefined &&
				String(updateResponse.error.message || "").toLowerCase().includes("column") &&
				String(updateResponse.error.message || "").toLowerCase().includes("name");

			if (unknownNameColumn) {
				return res.status(400).json({ message: "Name field is not configured in database yet" });
			}

			return res.status(500).json({ message: "Failed to update profile settings", error: updateResponse.error.message });
		}

		const { data: user, error } = await fetchUserProfile(req.user.id);

		if (error) {
			return res.status(500).json({ message: "Failed to update profile settings", error: error.message });
		}

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		return res.status(200).json({
			message: "Profile settings updated",
			user,
		});
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
	updateCurrentUser,
	subscribeUser,
	selectCharity,
	setCharityContribution,
	createDonation,
	getMyDonations,
};
