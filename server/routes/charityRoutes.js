import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import charityController from "../controllers/charityController.js";

const { protect } = authMiddleware;
const { requireAdmin } = adminMiddleware;
const { getCharities, getCharityById, createCharity, updateCharity, deleteCharity } = charityController;

const router = Router();

router.get("/", getCharities);
router.get("/:charityId", getCharityById);
router.post("/", protect, requireAdmin, createCharity);
router.patch("/:charityId", protect, requireAdmin, updateCharity);
router.delete("/:charityId", protect, requireAdmin, deleteCharity);

export default router;
