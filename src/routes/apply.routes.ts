// routes/apply.routes.ts
import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeAdmin } from "../middlewares/admin.middleware";
import {
  applyToClass,
  getMyClassApply,
  cancelApply,
  approveApply,
  applyToInstantClass,
} from "../controllers/apply.controller";
import { lockByClassParam, lockByApplyId } from "../middlewares/lock";

const router = Router();

// 유저
router.post("/classes/:id/apply", authenticate, applyToClass);
router.get("/applications/me", authenticate, getMyClassApply);
router.delete("/applications/:id", authenticate, cancelApply);
router.post(
  "/classes/:id/apply/instant",
  authenticate,
  lockByClassParam,
  applyToInstantClass
);

// 관리자
router.post(
  "/applications/:id/approve",
  authenticate,
  authorizeAdmin,
  lockByApplyId,
  approveApply
);

export default router;
