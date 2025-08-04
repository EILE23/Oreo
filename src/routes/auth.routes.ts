import { Router } from "express";
import { register, login, getMe } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);

// 👇 로그인한 유저 정보
router.get("/me", authenticate, getMe);

export default router;
