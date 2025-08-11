// test/class.test.ts
import request from "supertest";
import { setupApp, getOrm } from "./appSetup";
import { User } from "../src/entities/User";
import { Class } from "../src/entities/Class";
import jwt from "jsonwebtoken";
import { Express } from "express";
import { MikroORM } from "@mikro-orm/core";

let app: Express;
let testOrm: MikroORM;

const JWT_SECRET = process.env.JWT_SECRET || "oreo_secret_key";

describe("클래스 CRUD 테스트", () => {
  let userToken: string;
  let adminToken: string;
  let testUser: User;
  let adminUser: User;
  let testClass: Class;

  beforeAll(async () => {
    app = await setupApp();
    testOrm = getOrm();
  });

  beforeEach(async () => {
    const em = testOrm.em.fork();

    // DB 초기화
    await em.nativeDelete(Class, {});
    await em.nativeDelete(User, {});

    // 테스트 유저들 생성
    testUser = em.create(User, {
      email: "user@test.com",
      password: "hashedpw",
      name: "일반유저",
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    adminUser = em.create(User, {
      email: "admin@test.com",
      password: "hashedpw",
      name: "관리자",
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await em.persistAndFlush([testUser, adminUser]);

    userToken = jwt.sign(
      { id: testUser.id, isAdmin: false, name: testUser.name, email: testUser.email },
      JWT_SECRET
    );
    
    adminToken = jwt.sign(
      { id: adminUser.id, isAdmin: true, name: adminUser.name, email: adminUser.email },
      JWT_SECRET
    );

    // 테스트용 클래스 생성
    testClass = em.create(Class, {
      title: "기존 클래스",
      description: "기존 클래스 설명",
      startAt: new Date('2025-12-01'),
      endAt: new Date('2025-12-31'),
      maxParticipants: 10,
      hostId: adminUser.id,
      seatsTaken: 0,
      version: 1,
    });
    
    await em.persistAndFlush(testClass);
  });

  afterAll(async () => {
    try {
      const em = testOrm.em.fork();
      await em.nativeDelete(Class, {});
      await em.nativeDelete(User, {});
      await testOrm.close(true);
    } catch (error) {
      console.log('Class test cleanup error:', error);
    }
  });

  describe("클래스 조회 테스트", () => {
    it("모든 클래스 조회 (인증 불필요)", async () => {
      const res = await request(app).get("/api/mclasses");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('title');
      expect(res.body[0]).toHaveProperty('description');
      expect(res.body[0]).toHaveProperty('maxParticipants');
    });

    it("특정 클래스 상세 조회", async () => {
      const res = await request(app).get(`/api/mclasses/${testClass.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', testClass.id);
      expect(res.body).toHaveProperty('title', '기존 클래스');
      expect(res.body).toHaveProperty('description', '기존 클래스 설명');
      expect(res.body).toHaveProperty('maxParticipants', 10);
      expect(res.body).toHaveProperty('hostId', adminUser.id);
    });

    it("존재하지 않는 클래스 조회", async () => {
      const res = await request(app).get("/api/mclasses/999999");

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("클래스를 찾을 수 없습니다.");
    });

    it("잘못된 ID 형식", async () => {
      const res = await request(app).get("/api/mclasses/invalid-id");

      expect(res.status).toBe(400);
    });
  });

  describe("클래스 생성 테스트", () => {
    const validClassData = {
      title: "새 클래스",
      description: "새 클래스 설명입니다",
      startAt: "2025-12-01T09:00:00Z",
      endAt: "2025-12-01T18:00:00Z",
      maxParticipants: 20
    };

    it("관리자가 클래스 생성 성공", async () => {
      const res = await request(app)
        .post("/api/mclasses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validClassData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('title', validClassData.title);
      expect(res.body).toHaveProperty('description', validClassData.description);
      expect(res.body).toHaveProperty('maxParticipants', validClassData.maxParticipants);
      expect(res.body).toHaveProperty('hostId', adminUser.id);
      expect(res.body).toHaveProperty('seatsTaken', 0);
    });

    it("일반 유저가 클래스 생성 시도 (403 Forbidden)", async () => {
      const res = await request(app)
        .post("/api/mclasses")
        .set("Authorization", `Bearer ${userToken}`)
        .send(validClassData);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("관리자 권한이 필요합니다.");
    });

    it("인증 없이 클래스 생성 시도", async () => {
      const res = await request(app)
        .post("/api/mclasses")
        .send(validClassData);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("인증 정보가 없습니다.");
    });

    it("필수 필드 누락 - 제목", async () => {
      const invalidData: any = { ...validClassData };
      delete invalidData.title;

      const res = await request(app)
        .post("/api/mclasses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
    });

    it("필수 필드 누락 - 설명", async () => {
      const invalidData: any = { ...validClassData };
      delete invalidData.description;

      const res = await request(app)
        .post("/api/mclasses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
    });

    it("잘못된 날짜 형식", async () => {
      const invalidData = {
        ...validClassData,
        startAt: "invalid-date",
        endAt: "2025-12-01T18:00:00Z"
      };

      const res = await request(app)
        .post("/api/mclasses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidData);

      expect(res.status).toBe(400);
    });

    it("종료일이 시작일보다 빠른 경우", async () => {
      const invalidData = {
        ...validClassData,
        startAt: "2025-12-01T18:00:00Z",
        endAt: "2025-12-01T09:00:00Z"
      };

      const res = await request(app)
        .post("/api/mclasses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidData);

      // 비즈니스 로직에 따라 400 또는 201이 될 수 있음
      expect([201, 400]).toContain(res.status);
    });

    it("음수 참가자 수", async () => {
      const invalidData = {
        ...validClassData,
        maxParticipants: -5
      };

      const res = await request(app)
        .post("/api/mclasses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidData);

      expect([201, 400]).toContain(res.status);
    });

    it("0명 참가자", async () => {
      const invalidData = {
        ...validClassData,
        maxParticipants: 0
      };

      const res = await request(app)
        .post("/api/mclasses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidData);

      expect(res.status).toBe(201); // 0명도 유효할 수 있음
    });
  });

  describe("클래스 수정 테스트", () => {
    it("관리자가 클래스 수정 성공", async () => {
      const updateData = {
        title: "수정된 제목",
        description: "수정된 설명",
        maxParticipants: 15
      };

      const res = await request(app)
        .put(`/api/mclasses/${testClass.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title', updateData.title);
      expect(res.body).toHaveProperty('description', updateData.description);
      expect(res.body).toHaveProperty('maxParticipants', updateData.maxParticipants);
    });

    it("일반 유저가 클래스 수정 시도", async () => {
      const updateData = {
        title: "수정 시도"
      };

      const res = await request(app)
        .put(`/api/mclasses/${testClass.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("관리자 권한이 필요합니다.");
    });

    it("존재하지 않는 클래스 수정", async () => {
      const updateData = {
        title: "수정된 제목"
      };

      const res = await request(app)
        .put("/api/mclasses/999999")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("클래스를 찾을 수 없습니다.");
    });

    it("부분 수정 (일부 필드만)", async () => {
      const updateData = {
        title: "제목만 수정"
      };

      const res = await request(app)
        .put(`/api/mclasses/${testClass.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title', updateData.title);
      expect(res.body).toHaveProperty('description', '기존 클래스 설명'); // 기존 값 유지
    });

    it("빈 객체로 수정 시도", async () => {
      const res = await request(app)
        .put(`/api/mclasses/${testClass.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200); // 빈 객체여도 성공 (기존 값 유지)
    });
  });

  describe("클래스 삭제 테스트", () => {
    it("관리자가 클래스 삭제 성공", async () => {
      const res = await request(app)
        .delete(`/api/mclasses/${testClass.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(204);

      // 실제로 삭제되었는지 확인
      const checkRes = await request(app).get(`/api/mclasses/${testClass.id}`);
      expect(checkRes.status).toBe(404);
    });

    it("일반 유저가 클래스 삭제 시도", async () => {
      const res = await request(app)
        .delete(`/api/mclasses/${testClass.id}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("관리자 권한이 필요합니다.");
    });

    it("존재하지 않는 클래스 삭제", async () => {
      const res = await request(app)
        .delete("/api/mclasses/999999")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("클래스를 찾을 수 없습니다.");
    });

    it("인증 없이 삭제 시도", async () => {
      const res = await request(app)
        .delete(`/api/mclasses/${testClass.id}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("인증 정보가 없습니다.");
    });
  });

  describe("페이지네이션 테스트", () => {
    beforeEach(async () => {
      const em = testOrm.em.fork();
      
      // 추가 클래스들 생성
      const classes: Class[] = [];
      for (let i = 1; i <= 15; i++) {
        const cls = em.create(Class, {
          title: `클래스 ${i}`,
          description: `설명 ${i}`,
          startAt: new Date('2025-12-01'),
          endAt: new Date('2025-12-31'),
          maxParticipants: 10,
          hostId: adminUser.id,
          seatsTaken: 0,
          version: 1,
        });
        classes.push(cls);
      }
      
      await em.persistAndFlush(classes);
    });

    it("첫 페이지 조회", async () => {
      const res = await request(app)
        .get("/api/mclasses")
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // 페이지네이션 구현에 따라 달라질 수 있음
    });

    it("잘못된 페이지 번호", async () => {
      const res = await request(app)
        .get("/api/mclasses")
        .query({ page: -1, limit: 10 });

      expect(res.status).toBe(200); // 일반적으로 기본값으로 처리
    });
  });

  describe("정렬 테스트", () => {
    it("생성일 순 정렬", async () => {
      const res = await request(app)
        .get("/api/mclasses")
        .query({ sort: 'createdAt', order: 'desc' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("제목 순 정렬", async () => {
      const res = await request(app)
        .get("/api/mclasses")
        .query({ sort: 'title', order: 'asc' });

      expect(res.status).toBe(200);
    });
  });

  describe("필터링 테스트", () => {
    it("제목으로 검색", async () => {
      const res = await request(app)
        .get("/api/mclasses")
        .query({ search: '기존' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("참가자 수로 필터링", async () => {
      const res = await request(app)
        .get("/api/mclasses")
        .query({ minParticipants: 5, maxParticipants: 15 });

      expect(res.status).toBe(200);
    });
  });

  describe("극한 테스트", () => {
    it("매우 긴 제목", async () => {
      const longTitle = "a".repeat(1000);
      
      const res = await request(app)
        .post("/api/mclasses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: longTitle,
          description: "설명",
          startAt: "2025-12-01T09:00:00Z",
          endAt: "2025-12-01T18:00:00Z",
          maxParticipants: 10
        });

      expect([201, 400]).toContain(res.status);
    });

    it("매우 많은 참가자 수", async () => {
      const res = await request(app)
        .post("/api/mclasses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "대규모 클래스",
          description: "설명",
          startAt: "2025-12-01T09:00:00Z",
          endAt: "2025-12-01T18:00:00Z",
          maxParticipants: 1000000
        });

      expect(res.status).toBe(201);
    });
  });
});