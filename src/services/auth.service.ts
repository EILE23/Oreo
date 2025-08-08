// src/services/auth.service.ts
import { EntityManager } from "@mikro-orm/core";
import { User } from "../entities/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "oreo_secret_key";

export class AuthService {
  constructor(private readonly em: EntityManager) {}

  async register(email: string, password: string, name: string) {
    const existing = await this.em.findOne(User, { email });
    if (existing) throw new Error("이미 존재하는 이메일입니다.");

    const hashed = await bcrypt.hash(password, 10);
    const user = this.em.create(User, {
      email,
      password: hashed,
      name,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.em.persistAndFlush(user);
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.em.findOne(User, { email });
    if (!user) throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );
    return { token, user };
  }
}
