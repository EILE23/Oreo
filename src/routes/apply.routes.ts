import { Router } from "express";
import { applyToClass } from "../controllers/apply.controller";

const router = Router();

router.post("/classes/:id/apply", applyToClass);

export default router;
