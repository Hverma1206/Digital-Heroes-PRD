import dotenv from "dotenv";
import express, { json, raw } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import scoreRoutes from "./routes/scoreRoutes.js";
import charityRoutes from "./routes/charityRoutes.js";
import drawRoutes from "./routes/drawRoutes.js";
import winnerRoutes from "./routes/winnerRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import subscriptionController from "./controllers/subscriptionController.js";
import drawScheduler from "./services/drawScheduler.js";
import { from } from "./supabaseClient.js";

dotenv.config()
const app = express();
const port = process.env.PORT
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Keep raw body for Razorpay webhook signature validation.
app.post("/api/subscriptions/webhook", raw({ type: "application/json" }), subscriptionController.handleRazorpayWebhook);

app.use(json());

app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "Golf Charity Subscription Platform API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/charities", charityRoutes);
app.use("/api/draw", drawRoutes);
app.use("/api/winners", winnerRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((error, req, res, next) => {
  return res.status(500).json({ message: "Unhandled server error", error: error.message });
});

const startServer = async () => {
  try {
    const { error } = await from("users").select("id", { head: true, count: "exact" });

    if (error) {
      console.error(`Supabase connection failed: ${error.message}`);
    } else {
      console.log("Supabase connected successfully");
    }
  } catch (connectionError) {
    console.error(`Supabase connection failed: ${connectionError.message}`);
  }

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  drawScheduler.startDrawScheduler();
};

startServer();

export default app;
