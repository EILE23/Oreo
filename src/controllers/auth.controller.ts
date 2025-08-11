// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import { MikroORM } from "@mikro-orm/core";
import { DI } from "../mikro-orm.config";
import { Apply } from "../entities/Apply";

let authService: AuthService;

export const initAuthService = async () => {
  const orm = await MikroORM.init();
  const em = orm.em.fork();
  authService = new AuthService(em);
};

export const register = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  try {
    const user = await authService.register(email, password, name);
    res.status(201).json(user);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ message: err.message });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  if (!req.user)
    return res.status(401).json({ message: "로그인이 필요합니다." });
  return res.json({ user: req.user });
};

// 사용자 신청 내역 조회
export const getUserApplications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "인증이 필요합니다." });
    }

    const applications = await DI.em.find(Apply, 
      { user: { id: req.user.id } }, 
      { populate: ['class'] }
    );

    return res.status(200).json(applications);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};
