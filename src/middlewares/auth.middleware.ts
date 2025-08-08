// 필요한 타입 및 라이브러리 import
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../entities/User";

// 환경변수에서 JWT 비밀키 가져오고, 없으면 기본값 사용
const JWT_SECRET = process.env.JWT_SECRET || "oreoASDFASDFZXCVZCVX";

// 확장된 Request 타입 정의: req.user 사용을 위해
export interface AuthRequest extends Request {
  user?: Pick<User, "id" | "role" | "name" | "email">;
}

// JWT 인증 미들웨어 함수 정의
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // 요청 헤더에서 Authorization 필드 추출
  const authHeader = req.headers.authorization;

  // Authorization 헤더가 없거나, Bearer 토큰이 아닌 경우
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "인증 정보가 없습니다." });
  }

  // 'Bearer <토큰>' 중 실제 토큰만 추출
  const token = authHeader.split(" ")[1];

  try {
    // 토큰 검증
    const decoded = jwt.verify(token, JWT_SECRET) as Pick<
      User,
      "id" | "role" | "name" | "email"
    >;

    req.user = decoded;
    // 검증 성공 시 req.user에 저장해서 다음 미들웨어/컨트롤러에서 사용 가능
    next(); // 다음 미들웨어로 진행
  } catch (err) {
    // 토큰 검증 실패
    console.error("JWT Verify Error:", err);
    return res.status(401).json({ message: "토큰이 유효하지 않습니다." });
  }
};
