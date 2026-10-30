// GET /api/v1/learn — my enrolled courses with progress info
import { db } from "@/lib/db";
import { ok, requireUser, unauthorized } from "@/lib/server/http";
import { courseCardInclude, toCourseCard } from "@/lib/server/serializers";
import type { EnrolledCourse } from "@/lib/types";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const enrollments = await db.courseEnrollment.findMany({
    where: { studentId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      course: {
        include: {
          ...courseCardInclude,
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, durationMinutes: true },
          },
        },
      },
    },
  });

  const lessonIds = enrollments.flatMap((e) => e.course.lessons.map((l) => l.id));
  const progressRows = lessonIds.length
    ? await db.lessonProgress.findMany({
        where: { userId: user.id, lessonId: { in: lessonIds }, watched: true },
        select: { lessonId: true },
      })
    : [];
  const watchedSet = new Set(progressRows.map((p) => p.lessonId));

  const items: EnrolledCourse[] = enrollments.map((e) => {
    const card = toCourseCard(e.course);
    const lessons = e.course.lessons;
    const watchedLessons = lessons.filter((l) => watchedSet.has(l.id)).length;
    const progressPercent = lessons.length
      ? Math.round((watchedLessons / lessons.length) * 100)
      : 0;
    const nextLesson = lessons.find((l) => !watchedSet.has(l.id)) ?? lessons[lessons.length - 1];
    return {
      ...card,
      enrolledAt: e.createdAt.toISOString(),
      watchedLessons,
      progressPercent,
      nextLessonId: nextLesson?.id ?? null,
    };
  });

  return ok({ items });
}
