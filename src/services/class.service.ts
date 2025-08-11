// services/class.service.ts
import { DI } from "../mikro-orm.config";
import { Class } from "../entities/Class";

export interface ClassCreateDto {
  title: string;
  description: string;
  startAt: string | Date;
  endAt: string | Date;
  maxParticipants: number;
  hostId: number;
}

export type ClassUpdateDto = Partial<ClassCreateDto>;

// 강의 생성
export async function createClassService(dto: ClassCreateDto) {
  const em = DI.em.fork();

  // 날짜 검증
  const startAt = new Date(dto.startAt);
  const endAt = new Date(dto.endAt);
  
  if (isNaN(startAt.getTime())) {
    return { status: 400, message: "시작일 형식이 잘못되었습니다." };
  }
  
  if (isNaN(endAt.getTime())) {
    return { status: 400, message: "종료일 형식이 잘못되었습니다." };
  }

  const newClass = em.create(Class, {
    title: dto.title,
    description: dto.description,
    startAt: startAt,
    endAt: endAt,
    maxParticipants: Number(dto.maxParticipants),
    hostId: dto.hostId,
    seatsTaken: 0,
    version: 1,
  });

  await em.persistAndFlush(newClass);
  return { status: 201, data: newClass };
}

// 강의 수정 (관리자 전용)
export async function updateClassService(id: number, dto: ClassUpdateDto) {
  const em = DI.em.fork();
  const cls = await em.findOne(Class, { id });
  if (!cls) return { status: 404, message: "클래스를 찾을 수 없습니다." };

  // 날짜 검증
  if (dto.startAt) {
    const startAt = new Date(dto.startAt);
    if (isNaN(startAt.getTime())) {
      return { status: 400, message: "시작일 형식이 잘못되었습니다." };
    }
    cls.startAt = startAt;
  }

  if (dto.endAt) {
    const endAt = new Date(dto.endAt);
    if (isNaN(endAt.getTime())) {
      return { status: 400, message: "종료일 형식이 잘못되었습니다." };
    }
    cls.endAt = endAt;
  }

  cls.title = dto.title ?? cls.title;
  cls.description = dto.description ?? cls.description;
  cls.maxParticipants = dto.maxParticipants ?? cls.maxParticipants;

  await em.flush();
  return { status: 200, data: cls };
}

// 강의 삭제 (관리자 전용)
export async function deleteClassService(id: number) {
  const em = DI.em.fork();
  const cls = await em.findOne(Class, { id });
  if (!cls) return { status: 404, message: "클래스를 찾을 수 없습니다." };

  await em.removeAndFlush(cls);
  return { status: 204, data: null };
}
