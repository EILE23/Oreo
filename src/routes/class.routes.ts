import { Router } from "express";
import {
  createClass,
  updateClass,
  deleteClass,
} from "../controllers/class.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeAdmin } from "../middlewares/admin.middleware";

const router = Router();

router.post("/classes", authenticate, authorizeAdmin, createClass);
router.put("/classes/:id", authenticate, authorizeAdmin, updateClass);
router.delete("/classes/:id", authenticate, authorizeAdmin, deleteClass);

export default router;
