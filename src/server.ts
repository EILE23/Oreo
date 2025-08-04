import app, { initORM } from "./app";
import { initAuthService } from "./controllers/auth.controller"; // 👈 반드시 import

const PORT = process.env.PORT || 3000;

initORM()
  .then(() => {
    return initAuthService(); // authService 초기화
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Server init error:", err);
    process.exit(1);
  });
