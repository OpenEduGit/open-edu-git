// GET /api/v1/sessions/[id] — session detail (members only, + last 100 messages)
import { db } from "@/lib/db";
import { fail, ok, requireUser, unauthorized } from "@/lib/server/http";
import {
  sessionInclude,
  toSessionItem,
  toSessionMessageItem,
  toSessionReviewItem,
} from "@/lib/server/serializers";
import type { SessionDetail } from "@/lib/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return unauthorized();

  const [session, messages] = await Promise.all([
    db.classSession.findUnique({ where: { id }, include: sessionInclude }),
    db.sessionMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { sender: { select: { id: true, fullName: true } } },
    }),
  ]);
  if (!session) return fail("جلسه پیدا نشد", 404);
  if (session.teacherId !== user.id && session.studentId !== user.id) {
    return fail("فقط شرکت‌کنندگان این جلسه دسترسی دارند", 403);
  }

  const detail: SessionDetail = {
    ...toSessionItem(session, user.id),
    messages: messages.reverse().map(toSessionMessageItem),
    myReview:
      session.review && session.review.user.id === user.id
        ? toSessionReviewItem(session.review)
        : null,
  };
  return ok(detail);
}
