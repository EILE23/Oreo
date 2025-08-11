# M클래스 신청 API 서버

Node.js + Express + TypeScript를 활용한 M클래스(온라인 클래스) 신청 시스템입니다.

## 프로젝트 실행 방법

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

### 3. 빌드
```bash
npm run build
```

### 4. 테스트 실행

전체 테스트:
```bash
npm test
```

파일별 테스트:
```bash
# 인증 테스트 (회원가입, 로그인, 보안)
npm run test:a

# 클래스 CRUD 테스트
npm run test:b

# 신청/승인 테스트  
npm run test:c

# 종합 테스트 (동시성, 예외처리, 엣지케이스)
npm run test:d
```

## API 문서

### Swagger UI
서버 실행 후 다음 URL에서 대화형 API 문서를 확인할 수 있습니다:
- **URL**: `http://localhost:3000/api`
- **기능**: 모든 API 엔드포인트 테스트 및 스키마 확인 가능
- **인증**: Bearer Token 방식 (로그인 후 받은 JWT 토큰을 `Authorization: Bearer <token>` 형식으로 입력)

## API 명세서

### 사용자 관리

| 기능 | 메서드 | 경로 | 인증 | 요청 | 응답 |
|------|--------|------|------|------|------|
| 회원가입 | POST | `/api/users/signup` | ❌ | `{ email, password, name }` | `{ id, email, name, isAdmin }` |
| 로그인 | POST | `/api/users/login` | ❌ | `{ email, password }` | `{ token, user }` |
| 내 신청 내역 | GET | `/api/users/applications` | ✅ | 없음 | 신청 목록 배열 |

### M클래스 관리

| 기능 | 메서드 | 경로 | 인증 | 요청 | 응답 |
|------|--------|------|------|------|------|
| 클래스 목록 | GET | `/api/mclasses` | ❌ | 없음 | 클래스 목록 배열 |
| 클래스 상세 | GET | `/api/mclasses/:id` | ❌ | 없음 | 클래스 상세 정보 |
| 클래스 생성 | POST | `/api/mclasses` | ✅ (관리자) | `{ title, description, startAt, endAt, maxParticipants }` | 생성된 클래스 |
| 클래스 수정 | PUT | `/api/mclasses/:id` | ✅ (관리자) | 수정할 필드들 | 수정된 클래스 |
| 클래스 삭제 | DELETE | `/api/mclasses/:id` | ✅ (관리자) | 없음 | 204 No Content |

### M클래스 신청

| 기능 | 메서드 | 경로 | 인증 | 요청 | 응답 |
|------|--------|------|------|------|------|
| 클래스 신청 | POST | `/api/mclasses/:id/apply` | ✅ | 없음 | 신청 성공/실패 메시지 |

## ERD

### 테이블 구조

**User (사용자)**
- id (Primary Key)
- email (Unique Key)
- password
- name
- isAdmin (기본값: false)
- createdAt
- updatedAt

**Class (클래스)**
- id (Primary Key)
- title
- description
- startAt
- endAt
- maxParticipants
- hostId (Foreign Key → User.id)
- seatsTaken (기본값: 0)
- version (Optimistic Lock, 기본값: 1)

**Apply (신청)**
- id (Primary Key)
- user_id (Foreign Key → User.id)
- class_id (Foreign Key → Class.id)
- status (PENDING/APPROVED/REJECTED)
- createdAt

### 관계
- User(1) ↔ Apply(N) : 한 사용자는 여러 클래스에 신청 가능
- Class(1) ↔ Apply(N) : 한 클래스는 여러 신청을 받음
- User(1) ↔ Class(N) : 한 사용자(관리자)는 여러 클래스를 호스팅

자세한 ERD는 [ERD.md](ERD.md) 파일을 참고하세요.

## 기능 흐름도

```
사용자 회원가입/로그인
    ↓
클래스 목록 조회 (/api/mclasses)
    ↓
클래스 상세 조회 (/api/mclasses/:id)
    ↓
클래스 신청 (/api/mclasses/:id/apply)
    ↓
서버에서 신청 가능 여부 확인
├─▶ 이미 신청했는가? → 예: 409 중복 신청 에러
├─▶ 마감되었는가? → 예: 400 마감 에러  
├─▶ 인원 초과인가? → 예: 400 정원 초과 에러
└─▶ 모든 조건 통과 → 신청 성공
    ↓
신청 기록 저장 (PENDING 상태)
    ↓
seatsTaken 증가 (동시성 안전)
    ↓
201 성공 응답
```

## 설계 의도 및 핵심 기능

### 1. 데이터 정합성 보장
- **중복 신청 방지**: Apply 엔티티에 `@Unique({ properties: ['class', 'user'] })` 제약조건으로 DB 레벨에서 중복 방지
- **마감 시간 체크**: 신청 시 `endAt`과 현재 시간 비교
- **정원 관리**: `maxParticipants`와 `seatsTaken` 비교로 정원 초과 방지

### 2. 동시성 처리
- **Optimistic Locking**: Class 엔티티의 `version` 필드 활용
- **트랜잭션 처리**: 모든 신청 로직을 `transactional`로 처리
- **즉시 자리 차지**: 신청(PENDING) 시점에 바로 `seatsTaken` 증가로 동시성 이슈 해결
- **메모리 락**: 같은 클래스에 대한 동시 요청을 메모리 락으로 추가 보호

### 3. 인증/인가 시스템
- **JWT 토큰**: 상태 없는 인증 방식
- **역할 기반 권한**: `isAdmin` 필드로 관리자 권한 구분
- **미들웨어 체인**: `authenticate` → `authorizeAdmin` 순서로 권한 검증

### 4. API 설계
- **RESTful API**: 자원 중심의 URL 설계
- **일관된 응답**: 성공/실패 시 일관된 JSON 응답 구조
- **적절한 HTTP 상태코드**: 200, 201, 400, 401, 403, 404, 409 등 상황별 적절한 코드 사용

## 기술 스택

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite (MikroORM)
- **Authentication**: JWT
- **Testing**: Jest + Supertest
- **Validation**: MikroORM 스키마 검증

## 프로젝트 구조

```
src/
├── entities/          # 데이터베이스 엔티티
│   ├── User.ts
│   ├── Class.ts
│   └── Apply.ts
├── controllers/       # 컨트롤러 레이어
├── services/          # 비즈니스 로직 레이어
├── middlewares/       # 인증, 인가, 락 미들웨어
├── routes/           # API 라우트 정의
└── utils/            # 유틸리티 함수

test/
├── appSetup.ts       # 테스트 환경 설정
└── apply.test.ts     # 신청 기능 테스트
```

## 동시성 처리 상세

200명이 100명 정원 클래스에 동시 신청하는 경우:

1. **DB 제약조건**: 유니크 제약으로 중복 신청 원천 차단
2. **즉시 자리 차지**: 신청 즉시 `seatsTaken` 증가로 정원 관리
3. **트랜잭션**: 신청+자리차지를 하나의 트랜잭션으로 원자적 처리
4. **Optimistic Lock**: 버전 필드로 동시 수정 감지
5. **메모리 락**: 동일 클래스 요청을 순차 처리

결과: 정확히 100명만 신청 성공, 나머지 100명은 정원 초과 에러
