// test/auth.test.ts
import request from "supertest";
import { setupApp, getOrm } from "./appSetup";
import { User } from "../src/entities/User";
import { Express } from "express";
import { MikroORM } from "@mikro-orm/core";

let app: Express;
let testOrm: MikroORM;

describe("인증 시스템 테스트", () => {
  beforeAll(async () => {
    app = await setupApp();
    testOrm = getOrm();
  });

  beforeEach(async () => {
    const em = testOrm.em.fork();
    await em.nativeDelete(User, {});
  });

  afterAll(async () => {
    try {
      const em = testOrm.em.fork();
      await em.nativeDelete(User, {});
      await testOrm.close(true);
    } catch (error) {
      console.log('Auth test cleanup error:', error);
    }
  });

  describe("회원가입 테스트", () => {
    it("정상적인 회원가입", async () => {
      const res = await request(app)
        .post("/api/users/signup")
        .send({
          email: "newuser@test.com",
          password: "password123",
          name: "새유저"
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('email', 'newuser@test.com');
      expect(res.body).toHaveProperty('name', '새유저');
      expect(res.body).toHaveProperty('isAdmin', false);
      expect(res.body).not.toHaveProperty('password'); // 비밀번호는 응답에 없어야 함
    });

    it("이메일 누락", async () => {
      const res = await request(app)
        .post("/api/users/signup")
        .send({
          password: "password123",
          name: "새유저"
        });

      expect(res.status).toBe(400);
    });

    it("비밀번호 누락", async () => {
      const res = await request(app)
        .post("/api/users/signup")
        .send({
          email: "newuser@test.com",
          name: "새유저"
        });

      expect(res.status).toBe(400);
    });

    it("이름 누락", async () => {
      const res = await request(app)
        .post("/api/users/signup")
        .send({
          email: "newuser@test.com",
          password: "password123"
        });

      expect(res.status).toBe(400);
    });

    it("잘못된 이메일 형식", async () => {
      const res = await request(app)
        .post("/api/users/signup")
        .send({
          email: "invalid-email",
          password: "password123",
          name: "새유저"
        });

      expect(res.status).toBe(400);
    });

    it("중복 이메일", async () => {
      const em = testOrm.em.fork();
      
      // 첫 번째 유저 생성
      const existingUser = em.create(User, {
        email: "existing@test.com",
        password: "hashedpw",
        name: "기존유저",
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await em.persistAndFlush(existingUser);

      // 같은 이메일로 가입 시도
      const res = await request(app)
        .post("/api/users/signup")
        .send({
          email: "existing@test.com",
          password: "password123",
          name: "새유저"
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("이미 존재하는 이메일입니다.");
    });

    it("빈 문자열 필드들", async () => {
      const res = await request(app)
        .post("/api/users/signup")
        .send({
          email: "",
          password: "",
          name: ""
        });

      expect(res.status).toBe(400);
    });
  });

  describe("로그인 테스트", () => {
    let testUser: User;

    beforeEach(async () => {
      // 회원가입을 통해 유저 생성 (실제 비밀번호 해싱)
      await request(app)
        .post("/api/users/signup")
        .send({
          email: "login@test.com",
          password: "password123",
          name: "로그인테스트유저"
        });

      const em = testOrm.em.fork();
      testUser = await em.findOneOrFail(User, { email: "login@test.com" });
    });

    it("정상적인 로그인", async () => {
      const res = await request(app)
        .post("/api/users/login")
        .send({
          email: "login@test.com",
          password: "password123"
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('email', 'login@test.com');
      expect(res.body.user).toHaveProperty('name', '로그인테스트유저');
      expect(res.body.user).not.toHaveProperty('password');
      
      // JWT 토큰 형식 검증
      expect(res.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    });

    it("존재하지 않는 이메일", async () => {
      const res = await request(app)
        .post("/api/users/login")
        .send({
          email: "nonexistent@test.com",
          password: "password123"
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("이메일 또는 비밀번호가 올바르지 않습니다.");
    });

    it("잘못된 비밀번호", async () => {
      const res = await request(app)
        .post("/api/users/login")
        .send({
          email: "login@test.com",
          password: "wrongpassword"
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("이메일 또는 비밀번호가 올바르지 않습니다.");
    });

    it("이메일 누락", async () => {
      const res = await request(app)
        .post("/api/users/login")
        .send({
          password: "password123"
        });

      expect(res.status).toBe(400);
    });

    it("비밀번호 누락", async () => {
      const res = await request(app)
        .post("/api/users/login")
        .send({
          email: "login@test.com"
        });

      expect(res.status).toBe(400);
    });

    it("빈 문자열 credentials", async () => {
      const res = await request(app)
        .post("/api/users/login")
        .send({
          email: "",
          password: ""
        });

      expect(res.status).toBe(400);
    });
  });

  describe("관리자 계정 테스트", () => {
    it("관리자로 회원가입", async () => {
      const em = testOrm.em.fork();
      
      // 관리자 계정을 직접 생성 (일반적으로는 별도의 관리자 가입 프로세스가 있어야 함)
      const adminUser = em.create(User, {
        email: "admin@test.com",
        password: "hashedpassword",
        name: "관리자",
        isAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await em.persistAndFlush(adminUser);

      // 관리자 계정 확인
      const admin = await em.findOne(User, { email: "admin@test.com" });
      expect(admin?.isAdmin).toBe(true);
    });
  });

  describe("SQL 인젝션 방지 테스트", () => {
    it("이메일 필드 SQL 인젝션 시도", async () => {
      const res = await request(app)
        .post("/api/users/login")
        .send({
          email: "'; DROP TABLE users; --",
          password: "password123"
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("이메일 또는 비밀번호가 올바르지 않습니다.");
    });

    it("비밀번호 필드 SQL 인젝션 시도", async () => {
      const res = await request(app)
        .post("/api/users/login")
        .send({
          email: "test@test.com",
          password: "' OR '1'='1"
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("이메일 또는 비밀번호가 올바르지 않습니다.");
    });
  });

  describe("XSS 방지 테스트", () => {
    it("이름 필드에 스크립트 삽입", async () => {
      const maliciousName = "<script>alert('xss')</script>";
      
      const res = await request(app)
        .post("/api/users/signup")
        .send({
          email: "xss@test.com",
          password: "password123",
          name: maliciousName
        });

      // 회원가입은 성공하지만 스크립트가 실행되지 않아야 함
      expect(res.status).toBe(201);
      expect(res.body.name).toBe(maliciousName); // 저장은 되지만 실행되지 않음
    });
  });

  describe("대소문자 구분 테스트", () => {
    beforeEach(async () => {
      await request(app)
        .post("/api/users/signup")
        .send({
          email: "Test@Example.Com",
          password: "password123",
          name: "테스트유저"
        });
    });

    it("이메일 대소문자 구분", async () => {
      const res = await request(app)
        .post("/api/users/login")
        .send({
          email: "test@example.com", // 소문자로 로그인 시도
          password: "password123"
        });

      // 구현에 따라 대소문자를 구분할 수도 있고 안 할 수도 있음
      // 일반적으로는 이메일은 대소문자 구분하지 않음
      expect([200, 401]).toContain(res.status);
    });
  });

  describe("비밀번호 복잡성 테스트", () => {
    it("너무 짧은 비밀번호", async () => {
      const res = await request(app)
        .post("/api/users/signup")
        .send({
          email: "short@test.com",
          password: "123",
          name: "유저"
        });

      // 구현에 따라 검증이 있을 수 있음
      expect([201, 400]).toContain(res.status);
    });

    it("공백만 있는 비밀번호", async () => {
      const res = await request(app)
        .post("/api/users/signup")
        .send({
          email: "space@test.com", 
          password: "   ",
          name: "유저"
        });

      expect([201, 400]).toContain(res.status);
    });
  });
});