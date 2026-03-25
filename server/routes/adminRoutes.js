import { Router } from "express";
import adminController from "../controllers/adminController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const { protect } = authMiddleware;
const { requireAdmin } = adminMiddleware;
const { listUsers, updateUser, listScores, updateScore, listSubscriptions, updateSubscription, getReports } = adminController;

const router = Router();

router.use(protect, requireAdmin);

router.get("/users", listUsers);
router.patch("/users/:userId", updateUser);
router.get("/scores", listScores);
router.patch("/scores/:scoreId", updateScore);
router.get("/subscriptions", listSubscriptions);
router.patch("/subscriptions/:subscriptionId", updateSubscription);
router.get("/reports", getReports);

export default router;
