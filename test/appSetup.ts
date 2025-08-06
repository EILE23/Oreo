import { MikroORM } from "@mikro-orm/core";
import app from "../src/app";
import { initORM } from "../src/app";
import { initAuthService } from "../src/controllers/auth.controller";

let ormInstance: MikroORM; // 여기 타입 명시

export async function setupApp() {
  ormInstance = await initORM();
  await initAuthService();
  return app;
}

export function getOrm() {
  return ormInstance;
}
