// POST /api/v1/lessons/[id]/watched — toggle lesson progress (enrolled students)
import { db } from "@/lib/db";
import { fail, ok, readJson, requireUser, unauthorized } from "@/lib/server/http";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await readJson(req);
  if (!body) return fail("داده‌های ارسالی نامعتبر است");
  if (typeof body.watched !== "boolean") return fail("مقدار watched باید true یا false باشد");

  const lesson = await db.videoLesson.findUnique({
    where: { id },
    select: { id: true, courseId: true },
  });
  if (!lesson) return fail("درس پیدا نشد", 404);

  const enrollment = await db.courseEnrollment.findUnique({
    where: { courseId_studentId: { courseId: lesson.courseId, studentId: user.id } },
    select: { id: true },
  });
  if (!enrollment) {
    return fail("برای ثبت پیشرفت، ابتدا دوره را خریداری کنید", 403);
  }

  await db.lessonProgress.upsert({
    where: { lessonId_userId: { lessonId: lesson.id, userId: user.id } },
    create: { lessonId: lesson.id, userId: user.id, watched: body.watched },
    update: { watched: body.watched, watchedAt: new Date() },
  });

  // recompute the viewer's progress across the whole course
  const [lessons, progressRows] = await Promise.all([
    db.videoLesson.findMany({
      where: { courseId: lesson.courseId },
      select: { id: true },
    }),
    db.lessonProgress.findMany({
      where: { userId: user.id, lesson: { courseId: lesson.courseId }, watched: true },
      select: { lessonId: true },
    }),
  ]);
  const watchedSet = new Set(progressRows.map((p) => p.lessonId));
  const watchedCount = lessons.filter((l) => watchedSet.has(l.id)).length;
  const progressPercent = lessons.length
    ? Math.round((watchedCount / lessons.length) * 100)
    : 0;

  return ok({ progressPercent });
}
