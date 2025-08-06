// controllers/class.controller.ts
import { Request, Response } from "express";
import { DI } from "../mikro-orm.config";
import { Class } from "../entities/Class";

export const createClass = async (req: Request, res: Response) => {
  try {
    const { title, description, startDate, endDate, maxCapacity } = req.body;

    // TODO: 관리자 권한 체크 (req.user.role === 'admin')

    const newClass = DI.em.create(Class, {
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      maxCapacity: Number(maxCapacity),
    });

    await DI.em.persistAndFlush(newClass);
    return res.status(201).json(newClass);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateClass = async (req: Request, res: Response) => {
  const classId = Number(req.params.id);
  const { title, description, startDate, endDate, maxCapacity } = req.body;

  try {
    const classEntity = await DI.em.findOne(Class, { id: classId });
    if (!classEntity) {
      return res.status(404).json({ message: "클래스를 찾을 수 없습니다." });
    }

    classEntity.title = title ?? classEntity.title;
    classEntity.description = description ?? classEntity.description;
    classEntity.startDate = startDate
      ? new Date(startDate)
      : classEntity.startDate;
    classEntity.endDate = endDate ? new Date(endDate) : classEntity.endDate;
    classEntity.maxCapacity = maxCapacity ?? classEntity.maxCapacity;

    await DI.em.flush();

    return res.json(classEntity);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteClass = async (req: Request, res: Response) => {
  const classId = Number(req.params.id);

  try {
    const classEntity = await DI.em.findOne(Class, { id: classId });
    if (!classEntity) {
      return res.status(404).json({ message: "클래스를 찾을 수 없습니다." });
    }

    await DI.em.removeAndFlush(classEntity);

    return res.status(204).send(); // 성공, 내용 없음
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
