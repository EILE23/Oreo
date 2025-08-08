// middlewares/lock.ts
import { Request, Response, NextFunction } from "express";
import { DI } from "../mikro-orm.config";
import { Apply } from "../entities/Apply";

const locks = new Set<string>();

function acquire(res: Response, lockKey: string) {
  if (locks.has(lockKey)) return false;
  locks.add(lockKey);
  res.on("finish", () => locks.delete(lockKey));
  return true;
}

export function lockByClassParam(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const classId = req.params.id || req.body.classId;
  if (!classId)
    return res.status(400).json({ message: "classId가 필요합니다." });
  const key = `class:${classId}`;
  if (!acquire(res, key))
    return res.status(429).json({ message: "잠시 후 다시 시도해주세요." });
  next();
}

export async function lockByApplyId(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const applyId = Number(req.params.id);
  if (!applyId)
    return res.status(400).json({ message: "applyId가 필요합니다." });

  const apply = await DI.em.findOne(
    Apply,
    { id: applyId },
    { populate: ["class"] }
  );
  if (!apply)
    return res.status(404).json({ message: "신청을 찾을 수 없습니다." });

  const key = `class:${apply.class.id}`;
  if (!acquire(res, key))
    return res.status(429).json({ message: "잠시 후 다시 시도해주세요." });
  next();
}
