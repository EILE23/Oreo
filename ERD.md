# M클래스 신청 시스템 ERD

## 엔티티 관계도

### 테이블 구조

**User (사용자)**
- id (Primary Key)
- email (Unique Key)
- password
- name
- isAdmin
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
- seatsTaken
- version

**Apply (신청)**
- id (Primary Key)
- user_id (Foreign Key → User.id)
- class_id (Foreign Key → Class.id)
- status
- createdAt

### 관계
- User(1) ↔ Apply(N) : 한 사용자는 여러 클래스에 신청 가능
- Class(1) ↔ Apply(N) : 한 클래스는 여러 신청을 받음
- User(1) ↔ Class(N) : 한 사용자(관리자)는 여러 클래스를 호스팅

## 테이블 상세 정보

### User (사용자)
- **Primary Key**: `id`
- **Unique Key**: `email`
- **Fields**:
  - `id`: 사용자 고유 ID (자동 증가)
  - `email`: 이메일 주소 (로그인 ID, 유니크)
  - `password`: 암호화된 비밀번호
  - `name`: 사용자 이름
  - `isAdmin`: 관리자 권한 여부 (기본값: false)
  - `createdAt`: 생성 일시
  - `updatedAt`: 수정 일시 (자동 업데이트)

### Class (클래스)
- **Primary Key**: `id`
- **Fields**:
  - `id`: 클래스 고유 ID (자동 증가)
  - `title`: 클래스 제목
  - `description`: 클래스 설명 (TEXT 타입)
  - `startAt`: 클래스 시작 일시
  - `endAt`: 클래스 종료 일시
  - `maxParticipants`: 최대 참가자 수
  - `hostId`: 클래스 호스트(생성자) ID (User 테이블 참조)
  - `seatsTaken`: 현재 신청된 인원 수 (기본값: 0)
  - `version`: 낙관적 락을 위한 버전 필드 (기본값: 1)

### Apply (신청)
- **Primary Key**: `id`
- **Unique Constraint**: `(class_id, user_id)` - 한 사용자는 같은 클래스에 중복 신청 불가
- **Fields**:
  - `id`: 신청 고유 ID (자동 증가)
  - `class_id`: 신청한 클래스 ID (Class 테이블 참조)
  - `user_id`: 신청한 사용자 ID (User 테이블 참조)
  - `status`: 신청 상태 (PENDING/APPROVED/REJECTED, 기본값: PENDING)
  - `createdAt`: 신청 일시

## 관계 설명

1. **User ↔ Apply**: 1:N 관계
   - 한 사용자는 여러 클래스에 신청할 수 있음
   - 하나의 신청은 한 사용자에게만 속함

2. **Class ↔ Apply**: 1:N 관계
   - 한 클래스에는 여러 사용자가 신청할 수 있음
   - 하나의 신청은 하나의 클래스에만 속함

3. **User ↔ Class**: 1:N 관계 (호스트 관계)
   - 한 사용자(관리자)는 여러 클래스를 생성할 수 있음
   - 하나의 클래스는 하나의 호스트를 가짐

## 비즈니스 규칙

1. **동시성 제어**:
   - `Class.version` 필드를 통한 낙관적 락 구현
   - 신청 시점에 `seatsTaken` 즉시 증가로 경쟁 조건 방지

2. **데이터 무결성**:
   - `(class_id, user_id)` 유니크 제약으로 중복 신청 방지
   - `User.email` 유니크 제약으로 중복 계정 방지

3. **권한 관리**:
   - `User.isAdmin` 필드로 관리자/일반사용자 구분
   - 관리자만 클래스 생성/수정/삭제 가능

4. **상태 관리**:
   - Apply 상태: PENDING(대기) → APPROVED(승인) 또는 REJECTED(거절)
   - 현재 구현에서는 신청 시점에 즉시 좌석 배정 (자동 승인)