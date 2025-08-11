import { Router } from "express";
import {
  createClass,
  updateClass,
  deleteClass,
  getClasses,
  getClassById,
} from "../controllers/class.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizeAdmin } from "../middlewares/admin.middleware";

const router = Router();

/**
 * @swagger
 * /api/mclasses:
 *   get:
 *     summary: M클래스 목록 조회
 *     tags: [Classes]
 *     responses:
 *       200:
 *         description: M클래스 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Class'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/mclasses", getClasses);

/**
 * @swagger
 * /api/mclasses/{id}:
 *   get:
 *     summary: M클래스 상세 조회
 *     tags: [Classes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 클래스 ID
 *     responses:
 *       200:
 *         description: M클래스 상세 정보
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Class'
 *       404:
 *         description: 클래스를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/mclasses/:id", getClassById);

/**
 * @swagger
 * /api/mclasses:
 *   post:
 *     summary: M클래스 생성 (관리자 전용)
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClassCreateRequest'
 *     responses:
 *       201:
 *         description: 클래스 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Class'
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증되지 않은 사용자
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: 관리자 권한 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/mclasses", authenticate, authorizeAdmin, createClass);

/**
 * @swagger
 * /api/mclasses/{id}:
 *   put:
 *     summary: M클래스 수정 (관리자 전용)
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 클래스 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: 클래스 제목
 *               description:
 *                 type: string
 *                 description: 클래스 설명
 *               startAt:
 *                 type: string
 *                 format: date-time
 *                 description: 시작 일시
 *               endAt:
 *                 type: string
 *                 format: date-time
 *                 description: 종료 일시
 *               maxParticipants:
 *                 type: integer
 *                 minimum: 1
 *                 description: 최대 참가자 수
 *     responses:
 *       200:
 *         description: 클래스 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Class'
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증되지 않은 사용자
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: 관리자 권한 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 클래스를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/mclasses/:id", authenticate, authorizeAdmin, updateClass);

/**
 * @swagger
 * /api/mclasses/{id}:
 *   delete:
 *     summary: M클래스 삭제 (관리자 전용)
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 클래스 ID
 *     responses:
 *       204:
 *         description: 클래스 삭제 성공
 *       401:
 *         description: 인증되지 않은 사용자
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: 관리자 권한 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 클래스를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/mclasses/:id", authenticate, authorizeAdmin, deleteClass);

export default router;
