// DELETE /api/v1/courses/[id]/lessons/[lessonId] — owner removes a lesson + reorders 1..n
import { db } from "@/lib/db";
import { fail, ok, requireUser, unauthorized } from "@/lib/server/http";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  const { id, lessonId } = await params;
  const user = await requireUser();
  if (!user) return unauthorized();

  const course = await db.videoCourse.findUnique({
    where: { id },
    select: { id: true, teacherId: true },
  });
  if (!course) return fail("دوره پیدا نشد", 404);
  if (course.teacherId !== user.id) {
    return fail("فقط مدرس دوره می‌تواند درس حذف کند", 403);
  }

  const lesson = await db.videoLesson.findUnique({
    where: { id: lessonId },
    select: { id: true, courseId: true },
  });
  if (!lesson || lesson.courseId !== course.id) return fail("درس پیدا نشد", 404);

  const remaining = await db.videoLesson.count({ where: { courseId: course.id } });
  if (remaining <= 1) {
    return fail("دوره باید دست‌کم یک درس داشته باشد");
  }

  await db.$transaction(async (tx) => {
    await tx.videoLesson.delete({ where: { id: lessonId } });
    // renumber the remaining lessons 1..n (LessonProgress cascades on delete)
    const rest = await tx.videoLesson.findMany({
      where: { courseId: course.id },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    await Promise.all(
      rest.map((l, i) => tx.videoLesson.update({ where: { id: l.id }, data: { order: i + 1 } }))
    );
  });

  return ok({ ok: true });
}
