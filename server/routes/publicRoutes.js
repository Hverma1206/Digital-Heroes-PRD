import { Router } from "express";
import publicController from "../controllers/publicController.js";

const { getOverview, getCharities, getCharityProfile } = publicController;

const router = Router();

router.get("/overview", getOverview);
router.get("/charities", getCharities);
router.get("/charities/:charityId", getCharityProfile);

export default router;
