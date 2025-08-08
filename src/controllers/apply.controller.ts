import { Request, Response } from "express";
import { DI } from "../mikro-orm.config";
import { RequiredEntityData } from "@mikro-orm/core";
import { Apply } from "../entities/Apply";
import { Class } from "../entities/Class";
import { User } from "../entities/User";
import { LockMode } from "@mikro-orm/core";
import { applyQueue } from "../utils/queue";
import { AuthRequest } from "../middlewares/auth.middleware";
import { applyToClassService } from "../services/apply.service";

export const applyToClass = async (req: AuthRequest, res: Response) => {
  const classId = Number(req.params.id);
  const userId = req.user?.id!;

  try {
    const result = await applyToClassService(classId, userId);
    res.status(result.status).json({ message: result.message });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getMyClassApply = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  try {
    const appl = await DI.em.find(
      Apply,
      { user: req.user.id },
      { populate: ["class"] }
    );

    return res.json(appl);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "신청 내역 조회 중 오류 발생" });
  }
};
