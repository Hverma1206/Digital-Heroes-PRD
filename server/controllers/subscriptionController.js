import crypto from "crypto";
import Razorpay from "razorpay";
import { from } from "../supabaseClient.js";

const TEST_BYPASS_EMAIL = "dev.subscriber@test.local";

function getRazorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

function getRenewalDateByCycle(cycle) {
  const renewalDate = new Date();

  if (cycle === "yearly") {
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);
  } else {
    renewalDate.setMonth(renewalDate.getMonth() + 1);
  }

  return renewalDate.toISOString();
}

function createHmacSignature(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function isBypassUser(user) {
  return String(user?.email || "").trim().toLowerCase() === TEST_BYPASS_EMAIL;
}

async function getUserContribution(userId, minimumPercent) {
  const { data: user, error } = await from("users")
    .select("id, charity_percent")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load user contribution settings: ${error.message}`);
  }

  if (!user) {
    throw new Error("User not found");
  }

  const configuredPercent = Number(user.charity_percent ?? 10);
  const minPercent = Number(minimumPercent ?? 10);
  const effectivePercent = Math.max(minPercent, configuredPercent, 10);

  return Number(effectivePercent.toFixed(2));
}

async function activateSubscriptionForUser({
  userId,
  plan,
  provider,
  providerPaymentId = null,
  providerOrderId = null,
  charityPercent,
}) {
  const now = new Date().toISOString();
  const renewalAt = getRenewalDateByCycle(plan.billing_cycle);
  const charityAmountInr = Number(((Number(plan.price_inr) * Number(charityPercent || 0)) / 100).toFixed(2));

  await from("user_subscriptions")
    .update({ status: "canceled", ended_at: now, updated_at: now })
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"]);

  const { data: subscription, error: subscriptionError } = await from("user_subscriptions")
    .insert({
      user_id: userId,
      plan_id: plan.id,
      status: "active",
      started_at: now,
      renewal_at: renewalAt,
      updated_at: now,
    })
    .select("id, user_id, plan_id, status, started_at, renewal_at")
    .single();

  if (subscriptionError) {
    throw new Error(`Failed to activate subscription: ${subscriptionError.message}`);
  }

  const { error: paymentError } = await from("subscription_payments").insert({
    user_subscription_id: subscription.id,
    amount_inr: Number(plan.price_inr),
    charity_percent: Number(charityPercent || 0),
    charity_amount_inr: charityAmountInr,
    currency: "INR",
    provider,
    provider_payment_id: providerPaymentId,
    provider_checkout_session_id: providerOrderId,
    paid_at: now,
    status: "paid",
    metadata: {
      user_id: userId,
      plan_code: plan.code,
      bypass: provider === "bypass",
      charity_percent: Number(charityPercent || 0),
      charity_amount_inr: charityAmountInr,
    },
  });

  if (paymentError) {
    throw new Error(`Failed to record payment: ${paymentError.message}`);
  }

  const { error: userUpdateError } = await from("users").update({ is_subscribed: true }).eq("id", userId);
  if (userUpdateError) {
    throw new Error(`Failed to update user subscription flag: ${userUpdateError.message}`);
  }

  return subscription;
}

async function listPlans(req, res) {
  try {
    const { data: plans, error } = await from("subscription_plans")
      .select("id, code, name, billing_cycle, price_inr, charity_min_percent, is_active")
      .eq("is_active", true)
      .order("price_inr", { ascending: true });

    if (error) {
      return res.status(500).json({ message: "Failed to load plans", error: error.message });
    }

    return res.status(200).json({ plans: plans ?? [] });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function getMySubscriptionStatus(req, res) {
  try {
    const { data: subscription, error } = await from("user_subscriptions")
      .select("id, status, started_at, renewal_at, ended_at, plan_id")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: "Failed to load subscription status", error: error.message });
    }

    return res.status(200).json({ subscription: subscription ?? null });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function createOrder(req, res) {
  try {
    const { planCode } = req.body;

    if (!planCode) {
      return res.status(400).json({ message: "planCode is required" });
    }

    const { data: plan, error: planError } = await from("subscription_plans")
      .select("id, code, name, billing_cycle, price_inr, charity_min_percent")
      .eq("code", planCode)
      .eq("is_active", true)
      .maybeSingle();

    if (planError) {
      return res.status(500).json({ message: "Failed to load plan", error: planError.message });
    }

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const charityPercent = await getUserContribution(req.user.id, plan.charity_min_percent);

    if (isBypassUser(req.user)) {
      const subscription = await activateSubscriptionForUser({
        userId: req.user.id,
        plan,
        provider: "bypass",
        providerPaymentId: `bypass_${Date.now()}`,
        charityPercent,
      });

      return res.status(200).json({
        bypass: true,
        message: "Bypass subscription activated for test user",
        subscription,
        plan,
      });
    }

    const razorpay = getRazorpayClient();

    if (!razorpay || !process.env.RAZORPAY_KEY_ID) {
      return res.status(503).json({
        message: "Razorpay is not fully configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      });
    }

    const amountInPaise = Math.round(Number(plan.price_inr) * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `sub_${req.user.id}_${Date.now()}`,
      notes: {
        user_id: String(req.user.id),
        plan_id: String(plan.id),
        plan_code: String(plan.code),
        charity_percent: String(charityPercent),
      },
    });

    return res.status(200).json({
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      order,
      plan,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create Razorpay order", error: error.message });
  }
}

async function verifyPayment(req, res) {
  try {
    const {
      planCode,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body;

    if (!planCode) {
      return res.status(400).json({ message: "planCode is required" });
    }

    const { data: plan, error: planError } = await from("subscription_plans")
      .select("id, code, billing_cycle, price_inr, charity_min_percent")
      .eq("code", planCode)
      .eq("is_active", true)
      .maybeSingle();

    if (planError) {
      return res.status(500).json({ message: "Failed to load plan", error: planError.message });
    }

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const charityPercent = await getUserContribution(req.user.id, plan.charity_min_percent);

    if (isBypassUser(req.user)) {
      const subscription = await activateSubscriptionForUser({
        userId: req.user.id,
        plan,
        provider: "bypass",
        providerPaymentId: `bypass_verify_${Date.now()}`,
        charityPercent,
      });

      return res.status(200).json({
        bypass: true,
        message: "Bypass subscription activated for test user",
        subscription,
      });
    }

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        message: "planCode, razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
      });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ message: "RAZORPAY_KEY_SECRET is not configured" });
    }

    const expected = createHmacSignature(`${orderId}|${paymentId}`, process.env.RAZORPAY_KEY_SECRET);
    if (expected !== signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const subscription = await activateSubscriptionForUser({
      userId: req.user.id,
      plan,
      provider: "razorpay",
      providerPaymentId: paymentId,
      providerOrderId: orderId,
      charityPercent,
    });

    return res.status(200).json({
      message: "Payment verified and subscription activated",
      subscription,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to verify Razorpay payment", error: error.message });
  }
}

async function cancelSubscription(req, res) {
  try {
    const { data: subscription, error } = await from("user_subscriptions")
      .update({ status: "canceled", ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("user_id", req.user.id)
      .in("status", ["active", "trialing", "past_due"])
      .select("id, status, ended_at")
      .maybeSingle();

    if (error) {
      return res.status(500).json({ message: "Failed to cancel subscription", error: error.message });
    }

    await from("users").update({ is_subscribed: false }).eq("id", req.user.id);

    return res.status(200).json({ message: "Subscription canceled", subscription: subscription ?? null });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

async function handleRazorpayWebhook(req, res) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return res.status(503).json({ message: "RAZORPAY_WEBHOOK_SECRET is not configured" });
  }

  const signature = req.headers["x-razorpay-signature"];
  if (!signature) {
    return res.status(400).json({ message: "Missing x-razorpay-signature header" });
  }

  const rawBody = req.body instanceof Buffer ? req.body.toString("utf8") : JSON.stringify(req.body || {});
  const expected = createHmacSignature(rawBody, process.env.RAZORPAY_WEBHOOK_SECRET);

  if (expected !== signature) {
    return res.status(400).json({ message: "Invalid webhook signature" });
  }

  try {
    const event = JSON.parse(rawBody);

    if (event?.event === "payment.captured") {
      // Webhook can be used as a fallback reconciliation layer in production.
      return res.status(200).json({ received: true, event: event.event });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({ message: "Razorpay webhook processing failed", error: error.message });
  }
}

export default {
  listPlans,
  getMySubscriptionStatus,
  createOrder,
  verifyPayment,
  cancelSubscription,
  handleRazorpayWebhook,
};
