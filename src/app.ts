// src/app.ts

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MikroORM } from "@mikro-orm/core";
import mikroConfig, { DI } from "./mikro-orm.config";
import authRoutes from "./routes/auth.routes";
import classRoutes from "./routes/class.routes";
import applyRoutes from "./routes/apply.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_, res) => res.send(" Oreo API Ready"));

app.use("/auth", authRoutes);
app.use("/api", classRoutes);
app.use("/api", applyRoutes);

export const initORM = async () => {
  try {
    console.log("ORM 초기화 ");
    const orm = await MikroORM.init(mikroConfig);
    console.log("ORM 연결 완료");

    const generator = orm.getSchemaGenerator();
    await generator.updateSchema();
    console.log("DB 스키마 생성 완료");

    DI.orm = orm;
    DI.em = orm.em.fork();

    return orm;
  } catch (err) {
    console.error("ORM 초기화 에러:", err);
    throw err;
  }
};

export default app;
