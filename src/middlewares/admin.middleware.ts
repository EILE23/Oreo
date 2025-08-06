import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const authorizeAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "인증이 필요합니다." });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "관리자 권한이 필요합니다." });
  }

  next();
};
