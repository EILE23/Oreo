import { Request, Response } from "express";
import { DI } from "../mikro-orm.config";
import { RequiredEntityData } from "@mikro-orm/core";
import { Apply } from "../entities/Apply";
import { Class } from "../entities/Class";
import { User } from "../entities/User";

import { AuthRequest } from "../middlewares/auth.middleware";

export const applyToClass = async (req: AuthRequest, res: Response) => {
  const classId = Number(req.params.id);
  const userId = req.user?.id;

  try {
    const classEntity = await DI.em.findOne(
      Class,
      { id: classId },
      { populate: ["applies"] }
    );
    if (!classEntity)
      return res.status(404).json({ message: "Class not found" });

    const user = await DI.em.findOneOrFail(User, { id: userId });

    if (classEntity.applies.length >= classEntity.maxCapacity) {
      return res.status(400).json({ message: "Class is full" });
    }

    const existing = await DI.em.findOne(Apply, {
      class: classEntity,
      user: user,
    });
    if (existing) return res.status(409).json({ message: "Already applied" });

    const apply = new Apply();
    apply.class = classEntity;
    apply.user = user;

    await DI.em.persistAndFlush(apply);

    return res.status(201).json({ message: "Applied successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
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
