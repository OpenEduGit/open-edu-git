// POST /api/v1/reviews/[id]/vote — helpful/unhelpful vote (1 | -1 | 0 = remove)
import { db } from "@/lib/db";
import { fail, ok, readJson, requireUser, unauthorized } from "@/lib/server/http";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await readJson(req);
  if (!body) return fail("داده‌های ارسالی نامعتبر است");

  const value = Number(body.value);
  if (![1, -1, 0].includes(value)) {
    return fail("رأی باید یکی از مقادیر ۱، ‎-۱ یا ۰ باشد");
  }

  const review = await db.review.findUnique({ where: { id }, select: { id: true } });
  if (!review) return fail("نظر پیدا نشد", 404);

  if (value === 0) {
    await db.reviewVote.deleteMany({ where: { reviewId: id, userId: user.id } });
  } else {
    await db.reviewVote.upsert({
      where: { reviewId_userId: { reviewId: id, userId: user.id } },
      create: { reviewId: id, userId: user.id, value },
      update: { value },
    });
  }

  const [fresh, votes] = await Promise.all([
    db.review.findUniqueOrThrow({
      where: { id },
      select: { helpfulBase: true, unhelpfulBase: true },
    }),
    db.reviewVote.findMany({ where: { reviewId: id }, select: { userId: true, value: true } }),
  ]);

  return ok({
    helpful: fresh.helpfulBase + votes.filter((v) => v.value === 1).length,
    unhelpful: fresh.unhelpfulBase + votes.filter((v) => v.value === -1).length,
    myVote: votes.find((v) => v.userId === user.id)?.value ?? 0,
  });
}
