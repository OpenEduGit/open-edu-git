// POST /api/v1/sessions/[id]/cancel — member cancel with refund rules (2h full / late 50%)
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { SESSION_CANCEL_FULL_REFUND_HOURS } from "@/lib/constants";
import { fail, ok, requireUser, unauthorized } from "@/lib/server/http";

/** Apply a credit/debit txn inside a transaction; returns the new balance. */
async function applyTxn(
  tx: Prisma.TransactionClient,
  userId: string,
  data: {
    type: string;
    amount: number;
    description: string;
    refType?: string | null;
    refId?: string | null;
  }
): Promise<number> {
  const wallet = await tx.wallet.upsert({
    where: { userId },
    create: { userId, balance: 0 },
    update: {},
  });
  const balanceAfter = wallet.balance + data.amount;
  await tx.txn.create({
    data: {
      userId,
      type: data.type,
      amount: data.amount,
      balanceAfter,
      description: data.description,
      status: "SUCCESS",
      refType: data.refType ?? null,
      refId: data.refId ?? null,
      authority: null,
    },
  });
  await tx.wallet.update({ where: { userId }, data: { balance: balanceAfter } });
  return balanceAfter;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return unauthorized();

  const session = await db.classSession.findUnique({ where: { id } });
  if (!session) return fail("جلسه پیدا نشد", 404);
  if (session.teacherId !== user.id && session.studentId !== user.id) {
    return fail("فقط شرکت‌کنندگان این جلسه دسترسی دارند", 403);
  }
  if (session.status !== "BOOKED") return fail("این جلسه قابل لغو نیست");

  const isTeacher = session.teacherId === user.id;
  const msToStart = session.startAt.getTime() - Date.now();
  const fullRefund =
    isTeacher || msToStart >= SESSION_CANCEL_FULL_REFUND_HOURS * 3_600_000;
  const newStatus = isTeacher ? "CANCELLED_TEACHER" : "CANCELLED_STUDENT";
  const isFuture = session.startAt.getTime() > Date.now();

  await db.$transaction(async (tx) => {
    await tx.classSession.update({ where: { id }, data: { status: newStatus } });
    if (isFuture) {
      await tx.teacherSlot.update({
        where: { id: session.slotId },
        data: { status: "OPEN" },
      });
    }

    if (isTeacher || fullRefund) {
      // full refund to the student
      await applyTxn(tx, session.studentId, {
        type: "SESSION_REFUND",
        amount: session.price,
        description: "بازگشت کامل وجه لغو جلسه",
        refType: "SESSION",
        refId: session.id,
      });
    } else {
      // late cancel: 50% back to student, 50% compensation to the teacher
      const refund = Math.floor(session.price / 2);
      await applyTxn(tx, session.studentId, {
        type: "SESSION_REFUND",
        amount: refund,
        description: "بازگشت نیمی از وجه لغو جلسهٔ دیرهنگام",
        refType: "SESSION",
        refId: session.id,
      });
      await applyTxn(tx, session.teacherId, {
        type: "SESSION_EARNING",
        amount: session.price - refund,
        description: "غرامت لغو جلسهٔ دیرهنگام",
        refType: "SESSION",
        refId: session.id,
      });
    }
  });

  return ok({ status: newStatus });
}
