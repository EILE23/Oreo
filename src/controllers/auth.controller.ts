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
  
  if (!email || !password || !name) {
    return res.status(400).json({ message: "이메일, 비밀번호, 이름은 필수 항목입니다." });
  }
  
  try {
    const user = await authService.register(email, password, name);
    // 비밀번호 제외하고 응답
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: "이메일과 비밀번호는 필수 항목입니다." });
  }
  
  try {
    const result = await authService.login(email, password);
    // 응답에서 user 객체의 password 제거
    const { password: _, ...userWithoutPassword } = result.user;
    res.json({
      token: result.token,
      user: userWithoutPassword
    });
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
