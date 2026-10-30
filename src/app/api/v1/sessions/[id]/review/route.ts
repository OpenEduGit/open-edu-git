// POST /api/v1/sessions/[id]/review — student rates a COMPLETED session (upsert)
import { db } from "@/lib/db";
import { fail, ok, readJson, requireUser, unauthorized } from "@/lib/server/http";
import { toSessionReviewItem } from "@/lib/server/serializers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await readJson(req);
  if (!body) return fail("داده‌های ارسالی نامعتبر است");

  const rating = body.rating;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return fail("امتیاز باید بین ۱ تا ۵ باشد");
  }
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  if (comment.length < 2 || comment.length > 1000) {
    return fail("متن نظر باید بین ۲ تا ۱۰۰۰ نویسه باشد");
  }

  const session = await db.classSession.findUnique({ where: { id } });
  if (!session) return fail("جلسه پیدا نشد", 404);
  if (session.studentId !== user.id) {
    return fail("فقط دانش‌آموز این جلسه می‌تواند امتیاز دهد", 403);
  }
  if (session.status !== "COMPLETED") {
    return fail("امتیازدهی فقط پس از برگزار شدن جلسه ممکن است");
  }

  const review = await db.sessionReview.upsert({
    where: { sessionId: session.id },
    create: { sessionId: session.id, userId: user.id, rating, comment },
    update: { rating, comment, updatedAt: new Date() },
    include: { user: { select: { id: true, fullName: true, title: true } } },
  });

  return ok({ review: toSessionReviewItem(review) });
}
