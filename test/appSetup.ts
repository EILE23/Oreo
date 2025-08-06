import app from "../src/app";
import { initORM } from "../src/app";
import { initAuthService } from "../src/controllers/auth.controller";

export async function setupApp() {
  await initORM();
  await initAuthService();
  return app;
}
