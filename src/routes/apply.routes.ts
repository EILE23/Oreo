import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { applyToClass, getMyClassApply } from "../controllers/apply.controller";

const router = Router();

router.post("/classes/:id/apply", authenticate, applyToClass);
router.get("/applications/me", authenticate, getMyClassApply);

export default router;
