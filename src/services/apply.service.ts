// services/apply.service.ts
import { DI } from "../mikro-orm.config";
import { Class } from "../entities/Class";
import { User } from "../entities/User";
import { Apply } from "../entities/Apply";
import { LockMode } from "@mikro-orm/core";

export async function applyToClassService(classId: number, userId: number) {
  return DI.orm.em.transactional(async (em) => {
    // 1. 트랜잭션 내에서 EntityManager를 fork하여 별도의 작업 공간 생성

    const classEntity = await em.findOne(
      Class,
      { id: classId },
      { populate: ["applies"], lockMode: LockMode.PESSIMISTIC_WRITE }
    );
    // 2. classId로 Class 엔티티 조회. 'applies' (신청자 목록)도 함께 불러오며,
    //    PESSIMISTIC_WRITE 락을 걸어 다른 트랜잭션에서 변경하지 못하게 함

    if (!classEntity) return { status: 404, message: "Class not found" };
    // 3. 클래스가 없으면 404 상태와 메시지를 리턴

    const user = await em.findOneOrFail(User, { id: userId });
    // 4. userId로 User 엔티티를 조회 (없으면 에러 발생)

    if (classEntity.applies.length >= classEntity.maxCapacity)
      return { status: 400, message: "Class is full" };
    // 5. 이미 정원이 꽉 찼으면 400 상태와 메시지 리턴

    const existing = await em.findOne(Apply, {
      class: classEntity,
      user: user,
    });
    if (existing) return { status: 409, message: "Already applied" };
    // 6. 이미 신청 기록이 있으면 409 상태와 메시지 리턴

    const apply = new Apply();
    apply.class = classEntity;
    apply.user = user;
    // 7. 새 신청 엔티티 생성 및 연관관계 설정

    await em.persistAndFlush(apply);
    // 8. DB에 신청 엔티티 저장 및 반영

    return { status: 201, message: "Applied successfully" };
    // 9. 성공적으로 신청 완료 상태와 메시지 리턴
  });
}
