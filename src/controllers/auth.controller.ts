// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import { MikroORM } from "@mikro-orm/core";

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
  if (!req.user) return res.status(401).json({ message: "로그인 필요" });
  return res.json({ user: req.user });
};
