import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import userController from "../controllers/userController.js";

const { protect } = authMiddleware;
const { getCurrentUser, updateCurrentUser, subscribeUser, selectCharity, setCharityContribution, createDonation, getMyDonations } = userController;

const router = Router();

router.get("/me", protect, getCurrentUser);
router.patch("/me", protect, updateCurrentUser);
router.post("/subscribe", protect, subscribeUser);
router.post("/select-charity", protect, selectCharity);
router.post("/charity-contribution", protect, setCharityContribution);
router.post("/donations", protect, createDonation);
router.get("/donations", protect, getMyDonations);

export default router;
