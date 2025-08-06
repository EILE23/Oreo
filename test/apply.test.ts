// tests/apply.test.ts
import request from "supertest";
import { setupApp } from "./appSetup"; // 초기화 함수 import
import { MikroORM } from "@mikro-orm/core";
import testConfig from "../src/mikro-orm.test.config";
import { User } from "../src/entities/User";
import { Class } from "../src/entities/Class";
import { Apply } from "../src/entities/Apply";
import jwt from "jsonwebtoken";
import express from "express";
import { Express } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "oreo_secret_key";

let testOrm: MikroORM;
let app: Express;

describe("POST /api/classes/:id/apply", () => {
  let token: string;
  let testUser: User;
  let testClass: Class;

  beforeAll(async () => {
    // MikroORM 초기화 및 스키마 생성
    testOrm = await MikroORM.init(testConfig);
    const generator = testOrm.getSchemaGenerator();
    await generator.updateSchema();

    const em = testOrm.em.fork();

    // 테스트용 유저 생성
    testUser = em.create(User, {
      email: "test@example.com",
      password: "hashedpw",
      name: "테스트유저",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await em.persistAndFlush(testUser);

    // JWT 토큰 생성
    token = jwt.sign({ id: testUser.id, role: testUser.role }, JWT_SECRET);

    // 테스트용 클래스 생성
    testClass = em.create(Class, {
      title: "테스트 강의",
      description: "설명",
      startDate: new Date(),
      endDate: new Date(),
      maxCapacity: 1,
    });
    await em.persistAndFlush(testClass);

    // 초기화된 app 가져오기
    app = await setupApp();
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

    const res = await request(app)
      .post(`/api/classes/${testClass.id}/apply`)
      .set("Authorization", `Bearer ${newToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Class is full");
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
