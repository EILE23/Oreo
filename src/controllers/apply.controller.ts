import { Request, Response } from "express";
import { DI } from "../mikro-orm.config";
import { Apply } from "../entities/Apply";
import { Class } from "../entities/Class";

export const applyToClass = async (req: Request, res: Response) => {
  const classId = Number(req.params.id);
  const userId = req.user?.id; // JWT 미들웨어에서 세팅되어 있어야 함

  try {
    const classEntity = await DI.em.findOne(
      Class,
      { id: classId },
      { populate: ["applies"] }
    );
    if (!classEntity)
      return res.status(404).json({ message: "Class not found" });

    // 정원 확인
    if (classEntity.applies.length >= classEntity.maxCapacity) {
      return res.status(400).json({ message: "Class is full" });
    }

    // 중복 신청 방지
    const existing = await DI.em.findOne(Apply, {
      class: classEntity,
      user: userId,
    });
    if (existing) return res.status(409).json({ message: "Already applied" });

    // 신청 생성
    const apply = DI.em.create(Apply, {
      class: classEntity,
      user: userId,
    });

    await DI.em.persistAndFlush(apply);

    return res.status(201).json({ message: "Applied successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
