// controllers/class.controller.ts
import { Request, Response } from "express";
import {
  createClassService,
  updateClassService,
  deleteClassService,
} from "../services/class.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import { DI } from "../mikro-orm.config";
import { Class } from "../entities/Class";

export const createClass = async (req: AuthRequest, res: Response) => {
  try {
    // 관리자 권한 체크
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "관리자 권한이 필요합니다." });
    }

    const { title, description, startAt, endAt, maxParticipants } = req.body;
    
    // 필수 필드 검증
    if (!title || !description || !startAt || !endAt || maxParticipants === undefined) {
      return res.status(400).json({ message: "모든 필드를 입력해주세요." });
    }

    const result = await createClassService({
      title,
      description,
      startAt,
      endAt,
      maxParticipants: Number(maxParticipants),
      hostId: req.user!.id,
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
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "관리자만 접근 가능합니다." });
    }

    const classId = Number(req.params.id);
    const { title, description, startAt, endAt, maxParticipants } = req.body;

    const result = await updateClassService(classId, {
      title,
      description,
      startAt,
      endAt,
      maxParticipants: maxParticipants !== undefined ? Number(maxParticipants) : undefined,
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
    if (!req.user?.isAdmin) {
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

// 클래스 목록 조회
export const getClasses = async (req: Request, res: Response) => {
  try {
    const classes = await DI.em.find(Class, {});
    return res.status(200).json(classes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

// 클래스 상세 조회
export const getClassById = async (req: Request, res: Response) => {
  try {
    const classId = Number(req.params.id);
    
    // ID 형식 검증
    if (isNaN(classId)) {
      return res.status(400).json({ message: "잘못된 클래스 ID 형식입니다." });
    }
    
    const classEntity = await DI.em.findOne(Class, { id: classId });
    
    if (!classEntity) {
      return res.status(404).json({ message: "클래스를 찾을 수 없습니다." });
    }
    
    return res.status(200).json(classEntity);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};
