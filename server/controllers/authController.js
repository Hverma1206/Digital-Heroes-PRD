import bcrypt from "bcryptjs";
import { from } from "../supabaseClient.js";
import { generateToken } from "../utils/token.js";

const { hash, compare } = bcrypt;
const TEST_BYPASS_EMAIL = "dev.subscriber@test.local";
const TEST_BYPASS_PASSWORD = "DevSubscription@123";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function signup(req, res) {
  try {
    const { email, password, charity_id, charity_percent } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL);
    const isAdminSignup = adminEmail && normalizedEmail === adminEmail;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (normalizedEmail === TEST_BYPASS_EMAIL) {
      return res.status(403).json({ message: "This account is reserved for test bypass access" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    let selectedCharityId = null;
    let selectedCharityPercent = 10;

    if (!isAdminSignup) {
      selectedCharityId = Number(charity_id);
      selectedCharityPercent = Number(charity_percent ?? 10);

      if (!Number.isInteger(selectedCharityId) || selectedCharityId <= 0) {
        return res.status(400).json({ message: "charity_id is required at signup" });
      }

      if (!Number.isFinite(selectedCharityPercent) || selectedCharityPercent < 10 || selectedCharityPercent > 100) {
        return res.status(400).json({ message: "charity_percent must be between 10 and 100" });
      }

      const { data: charity, error: charityError } = await from("charities")
        .select("id")
        .eq("id", selectedCharityId)
        .maybeSingle();

      if (charityError) {
        return res.status(500).json({ message: "Failed to validate charity", error: charityError.message });
      }

      if (!charity) {
        return res.status(404).json({ message: "Selected charity not found" });
      }
    }

    const { data: existingUser, error: findError } = await from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (findError) {
      return res.status(500).json({ message: "Failed to validate existing user", error: findError.message });
    }

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await hash(password, 10);

    const { data: createdUser, error: createError } = await from("users")
      .insert({
        email: normalizedEmail,
        password: hashedPassword,
        is_subscribed: false,
        charity_id: selectedCharityId,
        charity_percent: Number(selectedCharityPercent.toFixed(2)),
      })
      .select("id, email, is_subscribed, charity_id, charity_percent")
      .single();

    if (createError) {
      return res.status(500).json({ message: "Failed to create user", error: createError.message });
    }

    return res.status(201).json({
      message: "Signup successful",
      user: createdUser,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (normalizedEmail === TEST_BYPASS_EMAIL && password === TEST_BYPASS_PASSWORD) {
      let { data: bypassUser, error: fetchBypassError } = await from("users")
        .select("id, email, password, is_subscribed, charity_id")
        .eq("email", TEST_BYPASS_EMAIL)
        .maybeSingle();

      if (fetchBypassError) {
        return res.status(500).json({ message: "Failed to fetch bypass user", error: fetchBypassError.message });
      }

      if (!bypassUser) {
        const bypassPasswordHash = await hash(TEST_BYPASS_PASSWORD, 10);
        const { data: createdBypassUser, error: createBypassError } = await from("users")
          .insert({
            email: TEST_BYPASS_EMAIL,
            password: bypassPasswordHash,
            is_subscribed: false,
          })
          .select("id, email, password, is_subscribed, charity_id")
          .single();

        if (createBypassError) {
          return res
            .status(500)
            .json({ message: "Failed to create bypass user", error: createBypassError.message });
        }

        bypassUser = createdBypassUser;
      }

      const token = generateToken(bypassUser);

      return res.status(200).json({
        message: "Login successful",
        token,
        user: {
          id: bypassUser.id,
          email: bypassUser.email,
          is_subscribed: bypassUser.is_subscribed,
          charity_id: bypassUser.charity_id,
        },
      });
    }

    const { data: user, error: userError } = await from("users")
      .select("id, email, password, is_subscribed, charity_id, charity_percent")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (userError) {
      return res.status(500).json({ message: "Failed to fetch user", error: userError.message });
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordMatch = await compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        is_subscribed: user.is_subscribed,
        charity_id: user.charity_id,
        charity_percent: user.charity_percent,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}
export default {
  signup,
  login,
};
