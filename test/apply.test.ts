// tests/apply.test.ts
import request from "supertest";
import { setupApp, getOrm } from "./appSetup";
import { User } from "../src/entities/User";
import { Class } from "../src/entities/Class";
import { Apply } from "../src/entities/Apply";
import jwt from "jsonwebtoken";
import { Express } from "express";
import { MikroORM } from "@mikro-orm/core";

let app: Express;
let testOrm: MikroORM;

const JWT_SECRET = process.env.JWT_SECRET || "oreo_secret_key";

describe("POST /api/classes/:id/apply", () => {
  let token: string;
  let testUser: User;
  let testClass: Class;

  beforeAll(async () => {
    app = await setupApp();
    testOrm = getOrm();
  });

  beforeEach(async () => {
    const em = testOrm.em.fork();

    // 테이블 초기화
    await em.nativeDelete(Apply, {});
    await em.nativeDelete(Class, {});
    await em.nativeDelete(User, {});

    // 유저 생성
    testUser = em.create(User, {
      email: "test@example.com",
      password: "hashedpw",
      name: "테스트유저",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await em.persistAndFlush(testUser);

    token = jwt.sign({ id: testUser.id, role: testUser.role }, JWT_SECRET);

    // 클래스 생성 (maxCapacity는 2로 늘려서 여유둠)
    testClass = em.create(Class, {
      title: "테스트 강의",
      description: "설명",
      startDate: new Date(),
      endDate: new Date(),
      maxCapacity: 2,
    });
    await em.persistAndFlush(testClass);
  });

  afterAll(async () => {
    const em = testOrm.em.fork();
    await em.nativeDelete(Apply, {});
    await em.nativeDelete(Class, {});
    await em.nativeDelete(User, {});
    await testOrm.close();
  });

  it("성공적으로 강의 신청", async () => {
    const res = await request(app)
      .post(`/api/classes/${testClass.id}/apply`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Applied successfully");
  });

  it("중복 신청 방지", async () => {
    await request(app)
      .post(`/api/classes/${testClass.id}/apply`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .post(`/api/classes/${testClass.id}/apply`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("Already applied");
  });

  it("정원 초과 방지", async () => {
    const em = testOrm.em.fork();
    const newUser = em.create(User, {
      email: "test2@example.com",
      password: "1234",
      name: "다른유저",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await em.persistAndFlush(newUser);

    const newToken = jwt.sign(
      { id: newUser.id, role: newUser.role },
      JWT_SECRET
    );

    // 먼저 testUser로 강의 신청해서 1자리 차지
    await request(app)
      .post(`/api/classes/${testClass.id}/apply`)
      .set("Authorization", `Bearer ${token}`);

    // newUser로 신청 시도 (총 2명, maxCapacity 2라 성공해야함)
    const res1 = await request(app)
      .post(`/api/classes/${testClass.id}/apply`)
      .set("Authorization", `Bearer ${newToken}`);
    expect(res1.statusCode).toBe(201);

    // 세번째 유저 신청 시도하면 400 나와야 함
    const thirdUser = em.create(User, {
      email: "test3@example.com",
      password: "1234",
      name: "세번째유저",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await em.persistAndFlush(thirdUser);

    const thirdToken = jwt.sign(
      { id: thirdUser.id, role: thirdUser.role },
      JWT_SECRET
    );

    const res2 = await request(app)
      .post(`/api/classes/${testClass.id}/apply`)
      .set("Authorization", `Bearer ${thirdToken}`);

    expect(res2.statusCode).toBe(400);
    expect(res2.body.message).toBe("Class is full");
  });

  it("없는 강의에 신청하면 404", async () => {
    const res = await request(app)
      .post(`/api/classes/999999/apply`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Class not found");
  });

  it("토큰 없으면 401", async () => {
    const res = await request(app).post(`/api/classes/${testClass.id}/apply`);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("인증 정보가 없습니다.");
  });
});
