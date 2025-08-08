// services/class.service.ts
import { DI } from "../mikro-orm.config";
import { Class } from "../entities/Class";

export interface ClassCreateDto {
  title: string;
  description: string;
  startDate: string | Date;
  endDate: string | Date;
  maxCapacity: number;
}

export type ClassUpdateDto = Partial<ClassCreateDto>;

// 강의 생성
export async function createClassService(dto: ClassCreateDto) {
  const em = DI.em.fork();

  const newClass = em.create(Class, {
    title: dto.title,
    description: dto.description,
    startDate: new Date(dto.startDate),
    endDate: new Date(dto.endDate),
    maxCapacity: Number(dto.maxCapacity),
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
  cls.startDate = dto.startDate ? new Date(dto.startDate) : cls.startDate;
  cls.endDate = dto.endDate ? new Date(dto.endDate) : cls.endDate;
  cls.maxCapacity = dto.maxCapacity ?? cls.maxCapacity;

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
