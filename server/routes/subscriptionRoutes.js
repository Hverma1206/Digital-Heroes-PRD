import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import subscriptionController from "../controllers/subscriptionController.js";

const { protect } = authMiddleware;
const {
	listPlans,
	getMySubscriptionStatus,
	createOrder,
	verifyPayment,
	cancelSubscription,
} = subscriptionController;

const router = Router();

router.get("/plans", listPlans);
router.get("/status", protect, getMySubscriptionStatus);
router.post("/create-order", protect, createOrder);
router.post("/verify-payment", protect, verifyPayment);
router.post("/cancel", protect, cancelSubscription);

export default router;
