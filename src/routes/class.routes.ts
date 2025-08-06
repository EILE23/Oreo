// routes/class.routes.ts
import { Router } from "express";
import { createClass } from "../controllers/class.controller";

const router = Router();

router.post("/classes", createClass); // 관리자만 호출 가능

export default router;
