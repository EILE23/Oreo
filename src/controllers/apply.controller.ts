import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  apply as applyService,
  cancel,
  approve,
  applyInstant as applyInstantService,
} from "../services/apply.service";
import { DI } from "../mikro-orm.config";
import { Apply } from "../entities/Apply";

// 즉시 승인 신청 (유저)
export const applyInstant = async (req: AuthRequest, res: Response) => {
  const classId = Number(req.params.id);
  if (Number.isNaN(classId))
    return res.status(400).json({ message: "잘못된 클래스 ID" });

  try {
    const result = await applyInstantService(classId, req.user!.id);
    return res.status(result.status).json({ message: result.message });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// 신청 (유저)
export const apply = async (req: AuthRequest, res: Response) => {
  const classId = Number(req.params.id);
  if (Number.isNaN(classId))
    return res.status(400).json({ message: "잘못된 클래스 ID" });

  try {
    const result = await applyService(classId, req.user!.id);
    return res.status(result.status).json({ message: result.message });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// 내 신청 내역 조회 (유저)
export const getMyApplications = async (req: AuthRequest, res: Response) => {
  try {
    const applications = await DI.em.find(
      Apply,
      { user: req.user!.id },
      { populate: ["class"] }
    );
    return res.json(applications);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "신청 내역 조회 중 오류 발생" });
  }
};

// 신청 승인 (관리자)
export const approveApply = async (req: AuthRequest, res: Response) => {
  const applyId = Number(req.params.id);
  try {
    const result = await approve(applyId);
    return res.status(result.status).json({ message: result.message });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// 신청 취소 (유저 or 관리자)
export const cancelApply = async (req: AuthRequest, res: Response) => {
  const applyId = Number(req.params.id);
  const isAdmin = req.user?.isAdmin;

  try {
    if (!isAdmin) {
      // 유저가 본인 신청만 취소 가능
      const apply = await DI.em.findOne(
        Apply,
        { id: applyId },
        { populate: ["user"] }
      );
      if (!apply)
        return res.status(404).json({ message: "신청을 찾을 수 없습니다." });
      if (apply.user.id !== req.user?.id) {
        return res
          .status(403)
          .json({ message: "본인의 신청만 취소할 수 있습니다." });
      }
    }

    const result = await cancel(applyId);
    return res.status(result.status).json({ message: result.message });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
