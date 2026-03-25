import { Router } from "express";
import authController from "../controllers/authController.js";

const { signup, login } = authController;

const router = Router();

router.post("/signup", signup);
router.post("/login", login);

export default router;
