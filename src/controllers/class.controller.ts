// controllers/class.controller.ts
import { Response } from "express";
import {
  createClassService,
  updateClassService,
  deleteClassService,
} from "../services/class.service";
import { AuthRequest } from "../middlewares/auth.middleware";

export const createClass = async (req: AuthRequest, res: Response) => {
  try {
    // 관리자 권한 체크
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "관리자만 접근 가능합니다." });
    }

    const { title, description, startDate, endDate, maxCapacity } = req.body;
    const result = await createClassService({
      title,
      description,
      startDate,
      endDate,
      maxCapacity: Number(maxCapacity),
    });

    if ("message" in result) {
      return res.status(result.status).json({ message: result.message });
    }
    return res.status(result.status).json(result.data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const updateClass = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "관리자만 접근 가능합니다." });
    }

    const classId = Number(req.params.id);
    const { title, description, startDate, endDate, maxCapacity } = req.body;

    const result = await updateClassService(classId, {
      title,
      description,
      startDate,
      endDate,
      maxCapacity: maxCapacity !== undefined ? Number(maxCapacity) : undefined,
    });

    if ("message" in result) {
      return res.status(result.status).json({ message: result.message });
    }
    return res.status(result.status).json(result.data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const deleteClass = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "관리자만 접근 가능합니다." });
    }

    const classId = Number(req.params.id);
    const result = await deleteClassService(classId);

    if ("message" in result) {
      return res.status(result.status).json({ message: result.message });
    }
    return res.status(result.status).send(); // 204
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};
