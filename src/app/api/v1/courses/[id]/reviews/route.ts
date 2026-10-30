// POST /api/v1/courses/[id]/reviews — enrolled student reviews the course (upsert)
import { db } from "@/lib/db";
import { fail, ok, readJson, requireUser, unauthorized } from "@/lib/server/http";
import { toCourseReviewItem } from "@/lib/server/serializers";

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

  const course = await db.videoCourse.findUnique({
    where: { id },
    select: { id: true, teacherId: true, status: true },
  });
  if (!course || course.status !== "PUBLISHED") return fail("دوره پیدا نشد", 404);
  if (course.teacherId === user.id) {
    return fail("نمی‌توانید برای دورهٔ خودتان نظر ثبت کنید", 403);
  }

  const enrollment = await db.courseEnrollment.findUnique({
    where: { courseId_studentId: { courseId: course.id, studentId: user.id } },
    select: { id: true },
  });
  if (!enrollment) {
    return fail("فقط دانش‌آموزان دوره می‌توانند نظر ثبت کنند", 403);
  }

  const review = await db.courseReview.upsert({
    where: { courseId_userId: { courseId: course.id, userId: user.id } },
    create: { courseId: course.id, userId: user.id, rating, comment },
    update: { rating, comment, updatedAt: new Date() },
    include: { user: { select: { id: true, fullName: true, title: true } } },
  });

  return ok({ review: toCourseReviewItem(review) });
}
