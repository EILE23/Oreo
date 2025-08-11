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

  const newClass = em.create(Class, {
    title: dto.title,
    description: dto.description,
    startAt: new Date(dto.startAt),
    endAt: new Date(dto.endAt),
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

  cls.title = dto.title ?? cls.title;
  cls.description = dto.description ?? cls.description;
  cls.startAt = dto.startAt ? new Date(dto.startAt) : cls.startAt;
  cls.endAt = dto.endAt ? new Date(dto.endAt) : cls.endAt;
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
