// controllers/class.controller.ts
import { Request, Response } from "express";
import { DI } from "../mikro-orm.config";

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
