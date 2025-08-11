import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'M클래스 신청 API 서버',
    version: '1.0.0',
    description: 'Node.js + Express + TypeScript를 활용한 M클래스(온라인 클래스) 신청 시스템 API',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        required: ['id', 'email', 'name', 'isAdmin'],
        properties: {
          id: {
            type: 'integer',
            description: '사용자 ID',
          },
          email: {
            type: 'string',
            format: 'email',
            description: '이메일 주소',
          },
          name: {
            type: 'string',
            description: '사용자 이름',
          },
          isAdmin: {
            type: 'boolean',
            description: '관리자 여부',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: '생성 일시',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: '수정 일시',
          },
        },
      },
      Class: {
        type: 'object',
        required: ['id', 'title', 'description', 'startAt', 'endAt', 'maxParticipants', 'hostId'],
        properties: {
          id: {
            type: 'integer',
            description: '클래스 ID',
          },
          title: {
            type: 'string',
            description: '클래스 제목',
          },
          description: {
            type: 'string',
            description: '클래스 설명',
          },
          startAt: {
            type: 'string',
            format: 'date-time',
            description: '시작 일시',
          },
          endAt: {
            type: 'string',
            format: 'date-time',
            description: '종료 일시',
          },
          maxParticipants: {
            type: 'integer',
            description: '최대 참가자 수',
          },
          hostId: {
            type: 'integer',
            description: '호스트 사용자 ID',
          },
          seatsTaken: {
            type: 'integer',
            description: '현재 신청자 수',
          },
          version: {
            type: 'integer',
            description: '버전 (Optimistic Lock)',
          },
        },
      },
      Apply: {
        type: 'object',
        required: ['id', 'status', 'createdAt'],
        properties: {
          id: {
            type: 'integer',
            description: '신청 ID',
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'APPROVED', 'REJECTED'],
            description: '신청 상태',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: '신청 일시',
          },
          user: {
            $ref: '#/components/schemas/User',
          },
          class: {
            $ref: '#/components/schemas/Class',
          },
        },
      },
      SignupRequest: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: '이메일 주소',
          },
          password: {
            type: 'string',
            minLength: 6,
            description: '비밀번호',
          },
          name: {
            type: 'string',
            description: '사용자 이름',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: '이메일 주소',
          },
          password: {
            type: 'string',
            description: '비밀번호',
          },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: 'JWT 토큰',
          },
          user: {
            $ref: '#/components/schemas/User',
          },
        },
      },
      ClassCreateRequest: {
        type: 'object',
        required: ['title', 'description', 'startAt', 'endAt', 'maxParticipants'],
        properties: {
          title: {
            type: 'string',
            description: '클래스 제목',
          },
          description: {
            type: 'string',
            description: '클래스 설명',
          },
          startAt: {
            type: 'string',
            format: 'date-time',
            description: '시작 일시',
          },
          endAt: {
            type: 'string',
            format: 'date-time',
            description: '종료 일시',
          },
          maxParticipants: {
            type: 'integer',
            minimum: 1,
            description: '최대 참가자 수',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: '에러 메시지',
          },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: '성공 메시지',
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Users',
      description: '사용자 관리 API',
    },
    {
      name: 'Classes',
      description: 'M클래스 관리 API',
    },
    {
      name: 'Applications',
      description: 'M클래스 신청 API',
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts'], // API 라우트 파일 경로
};

export const swaggerSpec = swaggerJsdoc(options);