import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import subscriptionMiddleware from "../middleware/subscriptionMiddleware.js";
import uploadMiddleware from "../middleware/uploadMiddleware.js";
import winnerController from "../controllers/winnerController.js";

const { protect } = authMiddleware;
const { requireAdmin } = adminMiddleware;
const { requireActiveSubscription } = subscriptionMiddleware;
const { proofUpload } = uploadMiddleware;
const { getUserWinnerResult, submitWinnerProof, listAllWinners, verifyWinner, markWinnerPaid } = winnerController;

const router = Router();

router.get("/user/me", protect, requireActiveSubscription, getUserWinnerResult);
router.post("/:winnerId/proof", protect, requireActiveSubscription, submitWinnerProof);
router.post("/:winnerId/proof-upload", protect, requireActiveSubscription, proofUpload.single("proof"), submitWinnerProof);

router.get("/admin/all", protect, requireAdmin, listAllWinners);
router.post("/:winnerId/verify", protect, requireAdmin, verifyWinner);
router.post("/:winnerId/payout", protect, requireAdmin, markWinnerPaid);

export default router;
