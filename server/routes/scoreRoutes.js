import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import subscriptionMiddleware from "../middleware/subscriptionMiddleware.js";
import scoreController from "../controllers/scoreController.js";

const { protect } = authMiddleware;
const { requireActiveSubscription } = subscriptionMiddleware;
const { addScore, updateScore, getScores } = scoreController;

const router = Router();

router.post("/", protect, requireActiveSubscription, addScore);
router.patch("/:scoreId", protect, requireActiveSubscription, updateScore);
router.get("/", protect, requireActiveSubscription, getScores);

export default router;
