// tests/apply.test.ts
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

describe("클래스 신청/승인 API", () => {
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
    await em.nativeDelete(Apply, {});
    await em.nativeDelete(Class, {});
    await em.nativeDelete(User, {});

    // 유저 생성
    testUser = em.create(User, {
      email: "user@example.com",
      password: "hashedpw",
      name: "테스트유저",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    adminUser = em.create(User, {
      email: "admin@example.com",
      password: "hashedpw",
      name: "관리자",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await em.persistAndFlush([testUser, adminUser]);

    userToken = jwt.sign(
      {
        id: testUser.id,
        role: testUser.role,
        name: testUser.name,
        email: testUser.email,
      },
      JWT_SECRET
    );
    adminToken = jwt.sign(
      {
        id: adminUser.id,
        role: adminUser.role,
        name: adminUser.name,
        email: adminUser.email,
      },
      JWT_SECRET
    );

    // 클래스 생성
    testClass = em.create(Class, {
      title: "테스트 강의",
      description: "설명",
      startDate: new Date(),
      endDate: new Date(),
      maxCapacity: 2,
      seatsTaken: 0,
      version: 1,
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

  it("유저가 신청하면 PENDING 상태로 생성", async () => {
    const res = await request(app)
      .post(`/api/classes/${testClass.id}/apply`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("신청이 완료되었습니다.");

    const em = testOrm.em.fork();
    const apply = await em.findOneOrFail(Apply, { user: testUser });
    expect(apply.status).toBe(ApplyStatus.PENDING);
    expect(testClass.seatsTaken).toBe(0);
  });

  it("중복 신청 방지", async () => {
    await request(app)
      .post(`/api/classes/${testClass.id}/apply`)
      .set("Authorization", `Bearer ${userToken}`);

    const res = await request(app)
      .post(`/api/classes/${testClass.id}/apply`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("이미 신청한 클래스입니다.");
  });

  it("관리자가 승인하면 seatsTaken 증가", async () => {
    const em = testOrm.em.fork();

    // 먼저 유저 신청
    await request(app)
      .post(`/api/classes/${testClass.id}/apply`)
      .set("Authorization", `Bearer ${userToken}`);

    const apply = await em.findOneOrFail(Apply, { user: testUser });

    // 관리자 승인
    const res = await request(app)
      .post(`/api/applications/${apply.id}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("승인 완료");

    await em.refresh(testClass);
    expect(testClass.seatsTaken).toBe(1);
  });

  it("승인 시 정원 초과 방지", async () => {
    const em = testOrm.em.fork();
    await em.nativeUpdate(Class, { id: testClass.id }, { maxCapacity: 1 });

    // 첫 유저 신청 & 승인
    const user1 = testUser;
    await request(app)
      .post(`/api/classes/${testClass.id}/apply`)
      .set("Authorization", `Bearer ${userToken}`);
    const apply1 = await em.findOneOrFail(Apply, { user: user1 });
    await request(app)
      .post(`/api/applications/${apply1.id}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    // 두 번째 유저 생성 및 신청
    const user2 = em.create(User, {
      email: "u2@example.com",
      password: "pw",
      name: "유저2",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await em.persistAndFlush(user2);

    const token2 = jwt.sign({ id: user2.id, role: user2.role }, JWT_SECRET);

    await request(app)
      .post(`/api/classes/${testClass.id}/apply`)
      .set("Authorization", `Bearer ${token2}`);
    const apply2 = await em.findOneOrFail(Apply, { user: user2 });

    // 승인 시도 → 실패
    const res2 = await request(app)
      .post(`/api/applications/${apply2.id}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res2.statusCode).toBe(400);
    expect(res2.body.message).toBe("정원이 가득 찼습니다.");
  });

  it("없는 강의에 신청하면 404", async () => {
    const res = await request(app)
      .post(`/api/classes/999999/apply`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("클래스를 찾을 수 없습니다.");
  });

  it("토큰 없으면 401", async () => {
    const res = await request(app).post(`/api/classes/${testClass.id}/apply`);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("인증 정보가 없습니다.");
  });

  it("즉시 신청 시 seatsTaken이 바로 증가하고 상태가 APPROVED로 저장", async () => {
    const res = await request(app)
      .post(`/api/classes/${testClass.id}/apply/instant`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("즉시 신청이 완료되었습니다.");

    const em = testOrm.em.fork();
    const apply = await em.findOneOrFail(Apply, { user: testUser });

    expect(apply.status).toBe(ApplyStatus.APPROVED);

    await em.refresh(testClass);
    expect(testClass.seatsTaken).toBe(1);
  });
});
