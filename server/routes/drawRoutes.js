import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import drawController from "../controllers/drawController.js";

const { protect } = authMiddleware;
const { requireAdmin } = adminMiddleware;
const { runDraw, simulateDraw, publishDraw, getLatestDraw } = drawController;

const router = Router();

router.post("/run", protect, requireAdmin, runDraw);
router.post("/simulate", protect, requireAdmin, simulateDraw);
router.post("/publish", protect, requireAdmin, publishDraw);
router.get("/latest", protect, getLatestDraw);

export default router;
