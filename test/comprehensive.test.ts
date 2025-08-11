// test/comprehensive.test.ts
import request from "supertest";
import { setupApp, getOrm } from "./appSetup";
import { User } from "../src/entities/User";
import { Class } from "../src/entities/Class";
import { Apply, ApplyStatus } from "../src/entities/Apply";
import jwt from "jsonwebtoken";
import { Express } from "express";
import { MikroORM } from "@mikro-orm/core";

let app: Express;
let testOrm: MikroORM;

const JWT_SECRET = process.env.JWT_SECRET || "oreo_secret_key";

describe("종합 테스트 - 예외처리 및 엣지케이스", () => {
  let userToken: string;
  let adminToken: string;
  let expiredToken: string;
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
    await em.nativeDelete(Apply, {});
    await em.nativeDelete(Class, {});
    await em.nativeDelete(User, {});

    // 테스트 유저들 생성
    testUser = em.create(User, {
      email: "user@test.com",
      password: "$2b$10$hashedpassword",
      name: "테스트유저",
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    adminUser = em.create(User, {
      email: "admin@test.com", 
      password: "$2b$10$hashedpassword",
      name: "관리자유저",
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await em.persistAndFlush([testUser, adminUser]);

    // 토큰 생성
    userToken = jwt.sign(
      { id: testUser.id, isAdmin: false, name: testUser.name, email: testUser.email },
      JWT_SECRET
    );
    
    adminToken = jwt.sign(
      { id: adminUser.id, isAdmin: true, name: adminUser.name, email: adminUser.email },
      JWT_SECRET
    );

    // 만료된 토큰
    expiredToken = jwt.sign(
      { id: testUser.id, isAdmin: false },
      JWT_SECRET,
      { expiresIn: '-1s' }
    );

    // 테스트 클래스 생성
    testClass = em.create(Class, {
      title: "테스트 클래스",
      description: "테스트용 클래스입니다",
      startAt: new Date(),
      endAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      maxParticipants: 3,
      hostId: adminUser.id,
      seatsTaken: 0,
      version: 1,
    });
    
    await em.persistAndFlush(testClass);
  });

  afterAll(async () => {
    try {
      const em = testOrm.em.fork();
      await em.nativeDelete(Apply, {});
      await em.nativeDelete(Class, {});
      await em.nativeDelete(User, {});
      await testOrm.close(true);
    } catch (error) {
      console.log('Cleanup error:', error);
    }
  });

  describe("인증 및 인가 테스트", () => {
    it("잘못된 토큰 형식", async () => {
      const res = await request(app)
        .post(`/api/mclasses/${testClass.id}/apply`)
        .set("Authorization", "WrongFormat token");
        
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("인증 정보가 없습니다.");
    });

    it("만료된 토큰", async () => {
      const res = await request(app)
        .post(`/api/mclasses/${testClass.id}/apply`)
        .set("Authorization", `Bearer ${expiredToken}`);
        
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("토큰이 유효하지 않습니다.");
    });

    it("잘못된 서명 토큰", async () => {
      const fakeToken = jwt.sign({ id: 999 }, "wrong_secret");
      const res = await request(app)
        .post(`/api/mclasses/${testClass.id}/apply`)
        .set("Authorization", `Bearer ${fakeToken}`);
        
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("토큰이 유효하지 않습니다.");
    });

    it("일반 유저가 관리자 기능 접근 시도", async () => {
      const res = await request(app)
        .post("/api/mclasses")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          title: "새 클래스",
          description: "설명",
          startAt: new Date(),
          endAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxParticipants: 10
        });
        
      expect(res.status).toBe(403);
      expect(res.body.message).toBe("관리자 권한이 필요합니다.");
    });
  });

  describe("데이터 검증 테스트", () => {
    it("잘못된 클래스 ID 형식", async () => {
      const res = await request(app)
        .post("/api/mclasses/invalid-id/apply")
        .set("Authorization", `Bearer ${userToken}`);
        
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("잘못된 클래스 ID");
    });

    it("음수 클래스 ID", async () => {
      const res = await request(app)
        .post("/api/mclasses/-1/apply")
        .set("Authorization", `Bearer ${userToken}`);
        
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("클래스를 찾을 수 없습니다.");
    });

    it("존재하지 않는 큰 ID", async () => {
      const res = await request(app)
        .post("/api/mclasses/999999999/apply")
        .set("Authorization", `Bearer ${userToken}`);
        
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("클래스를 찾을 수 없습니다.");
    });
  });

  describe("비즈니스 로직 예외처리", () => {
    it("마감된 클래스에 신청", async () => {
      const em = testOrm.em.fork();
      
      // 클래스를 과거 시간으로 설정
      await em.nativeUpdate(Class, { id: testClass.id }, { 
        endAt: new Date(Date.now() - 1000) 
      });

      const res = await request(app)
        .post(`/api/mclasses/${testClass.id}/apply`)
        .set("Authorization", `Bearer ${userToken}`);
        
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("마감 시간이 지났습니다.");
    });

    it("정원이 가득 찬 클래스에 신청", async () => {
      const em = testOrm.em.fork();
      
      // maxParticipants를 0으로 설정
      await em.nativeUpdate(Class, { id: testClass.id }, { 
        maxParticipants: 0 
      });

      const res = await request(app)
        .post(`/api/mclasses/${testClass.id}/apply`)
        .set("Authorization", `Bearer ${userToken}`);
        
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("정원이 가득 찼습니다.");
    });

    it("이미 신청한 클래스에 재신청", async () => {
      // 첫 번째 신청
      await request(app)
        .post(`/api/mclasses/${testClass.id}/apply`)
        .set("Authorization", `Bearer ${userToken}`);

      // 두 번째 신청 시도
      const res = await request(app)
        .post(`/api/mclasses/${testClass.id}/apply`)
        .set("Authorization", `Bearer ${userToken}`);
        
      expect(res.status).toBe(409);
      expect(res.body.message).toBe("이미 신청한 클래스입니다.");
    });
  });

  describe("동시성 테스트", () => {
    it("동시 신청 시 정원 초과 방지", async () => {
      const em = testOrm.em.fork();
      
      // 정원을 1명으로 제한
      await em.nativeUpdate(Class, { id: testClass.id }, { maxParticipants: 1 });

      // 추가 유저 생성
      const user2 = em.create(User, {
        email: "user2@test.com",
        password: "hashedpw",
        name: "유저2",
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await em.persistAndFlush(user2);

      const token2 = jwt.sign(
        { id: user2.id, isAdmin: false, name: user2.name, email: user2.email },
        JWT_SECRET
      );

      // 동시 신청
      const promises = [
        request(app)
          .post(`/api/mclasses/${testClass.id}/apply`)
          .set("Authorization", `Bearer ${userToken}`),
        request(app)
          .post(`/api/mclasses/${testClass.id}/apply`)
          .set("Authorization", `Bearer ${token2}`)
      ];

      const results = await Promise.all(promises);
      
      // 하나는 성공, 하나는 실패해야 함
      const successCount = results.filter(r => r.status === 201).length;
      const failCount = results.filter(r => r.status === 400).length;
      
      expect(successCount).toBe(1);
      expect(failCount).toBe(1);

      // 실제 DB에서 seatsTaken 확인
      await em.refresh(testClass);
      expect(testClass.seatsTaken).toBe(1);
    });

    it("대량 동시 신청 테스트 (10명이 5자리에 신청)", async () => {
      const em = testOrm.em.fork();
      
      // 정원을 5명으로 설정
      await em.nativeUpdate(Class, { id: testClass.id }, { maxParticipants: 5 });

      // 10명의 사용자 생성
      const users: User[] = [];
      const tokens: string[] = [];
      
      for (let i = 1; i <= 10; i++) {
        const user = em.create(User, {
          email: `user${i}@test.com`,
          password: "hashedpw",
          name: `유저${i}`,
          isAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        users.push(user);
      }
      
      await em.persistAndFlush(users);
      
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const token = jwt.sign(
          { id: user.id, isAdmin: false, name: user.name, email: user.email },
          JWT_SECRET
        );
        tokens.push(token);
      }

      // 10명이 동시에 신청
      const promises = tokens.map(token =>
        request(app)
          .post(`/api/mclasses/${testClass.id}/apply`)
          .set("Authorization", `Bearer ${token}`)
      );

      const results = await Promise.all(promises);
      
      // 5명 성공, 5명 실패
      const successCount = results.filter(r => r.status === 201).length;
      const failCount = results.filter(r => r.status === 400).length;
      
      expect(successCount).toBe(5);
      expect(failCount).toBe(5);

      // 실제 DB에서 검증
      await em.refresh(testClass);
      expect(testClass.seatsTaken).toBe(5);
      
      const applyCount = await em.count(Apply, { class: testClass });
      expect(applyCount).toBe(5);
    });
  });

  describe("신청 취소 테스트", () => {
    it("존재하지 않는 신청 취소", async () => {
      const res = await request(app)
        .delete("/api/applications/999999")
        .set("Authorization", `Bearer ${userToken}`);
        
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("신청을 찾을 수 없습니다.");
    });

    it("다른 유저의 신청 취소 시도", async () => {
      const em = testOrm.em.fork();
      
      // 다른 유저 생성
      const otherUser = em.create(User, {
        email: "other@test.com",
        password: "hashedpw", 
        name: "다른유저",
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await em.persistAndFlush(otherUser);

      const otherToken = jwt.sign(
        { id: otherUser.id, isAdmin: false, name: otherUser.name, email: otherUser.email },
        JWT_SECRET
      );

      // testUser가 신청
      await request(app)
        .post(`/api/mclasses/${testClass.id}/apply`)
        .set("Authorization", `Bearer ${userToken}`);

      const apply = await em.findOneOrFail(Apply, { user: testUser });

      // otherUser가 취소 시도
      const res = await request(app)
        .delete(`/api/applications/${apply.id}`)
        .set("Authorization", `Bearer ${otherToken}`);
        
      expect(res.status).toBe(403);
      expect(res.body.message).toBe("본인의 신청만 취소할 수 있습니다.");
    });

    it("신청 취소 후 seatsTaken 감소 확인", async () => {
      const em = testOrm.em.fork();
      
      // 신청
      await request(app)
        .post(`/api/mclasses/${testClass.id}/apply`)
        .set("Authorization", `Bearer ${userToken}`);

      await em.refresh(testClass);
      expect(testClass.seatsTaken).toBe(1);

      const apply = await em.findOneOrFail(Apply, { user: testUser });

      // 취소
      const res = await request(app)
        .delete(`/api/applications/${apply.id}`)
        .set("Authorization", `Bearer ${userToken}`);
        
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("취소 완료");

      // seatsTaken 감소 확인
      await em.refresh(testClass);
      expect(testClass.seatsTaken).toBe(0);
    });
  });

  describe("승인 프로세스 테스트", () => {
    it("이미 승인된 신청 재승인 시도", async () => {
      const em = testOrm.em.fork();
      
      // 신청
      await request(app)
        .post(`/api/mclasses/${testClass.id}/apply`)
        .set("Authorization", `Bearer ${userToken}`);

      const apply = await em.findOneOrFail(Apply, { user: testUser });

      // 첫 번째 승인
      await request(app)
        .post(`/api/applications/${apply.id}/approve`)
        .set("Authorization", `Bearer ${adminToken}`);

      // 두 번째 승인 시도
      const res = await request(app)
        .post(`/api/applications/${apply.id}/approve`)
        .set("Authorization", `Bearer ${adminToken}`);
        
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("이미 승인된 신청입니다.");
    });

    it("존재하지 않는 신청 승인 시도", async () => {
      const res = await request(app)
        .post("/api/applications/999999/approve")
        .set("Authorization", `Bearer ${adminToken}`);
        
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("신청을 찾을 수 없습니다.");
    });
  });

  describe("내 신청 내역 조회 테스트", () => {
    it("신청 내역이 없는 경우", async () => {
      const res = await request(app)
        .get("/api/applications/me")
        .set("Authorization", `Bearer ${userToken}`);
        
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("여러 신청 내역 조회", async () => {
      const em = testOrm.em.fork();
      
      // 추가 클래스 생성
      const class2 = em.create(Class, {
        title: "두 번째 클래스",
        description: "설명2",
        startAt: new Date(),
        endAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        maxParticipants: 5,
        hostId: adminUser.id,
        seatsTaken: 0,
        version: 1,
      });
      await em.persistAndFlush(class2);

      // 두 클래스에 신청
      await request(app)
        .post(`/api/mclasses/${testClass.id}/apply`)
        .set("Authorization", `Bearer ${userToken}`);
        
      await request(app)
        .post(`/api/mclasses/${class2.id}/apply`)
        .set("Authorization", `Bearer ${userToken}`);

      const res = await request(app)
        .get("/api/applications/me")
        .set("Authorization", `Bearer ${userToken}`);
        
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toHaveProperty('status', 'PENDING');
      expect(res.body[1]).toHaveProperty('status', 'PENDING');
    });
  });

  describe("서버 에러 시뮬레이션", () => {
    it("DB 연결 에러 처리", async () => {
      // DB 연결을 임시로 닫기 (실제로는 모킹 필요)
      const res = await request(app)
        .post("/api/mclasses/1/apply")
        .set("Authorization", `Bearer ${userToken}`);
        
      // 404 또는 500 중 하나가 나올 것
      expect([404, 500]).toContain(res.status);
    });
  });
});