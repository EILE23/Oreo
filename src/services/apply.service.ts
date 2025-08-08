// services/apply.service.ts
import { DI } from "../mikro-orm.config";
import { Class } from "../entities/Class";
import { User } from "../entities/User";
import { Apply, ApplyStatus } from "../entities/Apply";
import {
  OptimisticLockError,
  UniqueConstraintViolationException,
} from "@mikro-orm/core";

// 클래스 신청(승인제) pending 상태 관리자 승인 이후 approve
export async function applyToClassService(classId: number, userId: number) {
  try {
    return await DI.orm.em.transactional(async (em) => {
      const cls = await em.findOne(Class, { id: classId });
      if (!cls) return { status: 404, message: "클래스를 찾을 수 없습니다." };

      const user = await em.findOneOrFail(User, { id: userId });

      // if (cls.seatsTaken >= cls.maxCapacity) {
      //   return { status: 400, message: "정원이 가득 찼습니다." };
      // }

      // 중복 신청 방지
      const exists = await em.findOne(Apply, { class: cls, user });
      if (exists) {
        return { status: 409, message: "이미 신청한 클래스입니다." };
      }

      // 신청 생성 (기본 상태: PENDING)
      const apply = new Apply();
      apply.class = cls;
      apply.user = user;
      apply.status = ApplyStatus.PENDING;

      await em.persistAndFlush(apply);
      return { status: 201, message: "신청이 완료되었습니다." };
    });
  } catch (e: any) {
    if (
      e?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
      e?.name === "UniqueConstraintViolationException"
    ) {
      return { status: 409, message: "이미 신청한 클래스입니다." };
    }
    throw e;
  }
}

// 신청 취소
export async function cancelApplyService(applyId: number, byAdmin = false) {
  return await DI.orm.em.transactional(async (em) => {
    const apply = await em.findOne(
      Apply,
      { id: applyId },
      { populate: ["class"] }
    );
    if (!apply) return { status: 404, message: "신청을 찾을 수 없습니다." };

    if (apply.status === ApplyStatus.APPROVED) {
      apply.class.seatsTaken -= 1;
      if (apply.class.seatsTaken < 0) apply.class.seatsTaken = 0;
    }

    await em.removeAndFlush(apply);
    return { status: 200, message: "취소 완료" };
  });
}

// 관리자 승인

export async function approveApplyService(applyId: number) {
  return await DI.orm.em.transactional(async (em) => {
    const apply = await em.findOne(
      Apply,
      { id: applyId },
      { populate: ["class"] }
    );
    if (!apply) return { status: 404, message: "신청을 찾을 수 없습니다." };
    if (apply.status === ApplyStatus.APPROVED) {
      return { status: 400, message: "이미 승인된 신청입니다." };
    }

    const cls = apply.class;

    if (cls.seatsTaken >= cls.maxCapacity) {
      return { status: 400, message: "정원이 가득 찼습니다." };
    }

    apply.status = ApplyStatus.APPROVED;
    cls.seatsTaken += 1;

    await em.flush();

    return { status: 200, message: "승인 완료" };
  });
}

// 즉시 신청 바로 상태를 approve 상태로
export async function applyToInstantClassService(
  classId: number,
  userId: number
) {
  return await DI.orm.em.transactional(async (em) => {
    const cls = await em.findOne(Class, { id: classId });
    if (!cls) return { status: 404, message: "클래스를 찾을 수 없습니다." };

    if (cls.seatsTaken >= cls.maxCapacity) {
      return { status: 400, message: "정원이 가득 찼습니다." };
    }

    const user = await em.findOneOrFail(User, { id: userId });

    const exists = await em.findOne(Apply, { class: cls, user });
    if (exists) {
      return { status: 409, message: "이미 신청한 클래스입니다." };
    }

    const apply = new Apply();
    apply.class = cls;
    apply.user = user;
    apply.status = ApplyStatus.APPROVED;

    cls.seatsTaken += 1;

    await em.persistAndFlush([apply, cls]);

    return { status: 201, message: "즉시 신청이 완료되었습니다." };
  });
}
