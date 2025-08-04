import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MikroORM } from "@mikro-orm/core";
import mikroConfig from "./mikro-orm.config";
import authRoutes from "./routes/auth.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_, res) => res.send("🍪 Oreo API Ready"));

app.use("/auth", authRoutes);
export const initORM = async () => {
  try {
    console.log("ORM 초기화 ");
    const orm = await MikroORM.init(mikroConfig);
    console.log("ORM 연결 완료");

    const generator = orm.getSchemaGenerator();
    await generator.updateSchema();
    console.log("DB 스키마 생성 완료");

    return orm;
  } catch (err) {
    console.error("ORM 초기화 에러:", err);
    throw err;
  }
};

export default app;
