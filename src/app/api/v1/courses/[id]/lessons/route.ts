// POST /api/v1/courses/[id]/lessons — owner appends a lesson at the end
import { db } from "@/lib/db";
import { fail, ok, readJson, requireUser, unauthorized } from "@/lib/server/http";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return unauthorized();

  const course = await db.videoCourse.findUnique({
    where: { id },
    select: { id: true, teacherId: true },
  });
  if (!course) return fail("دوره پیدا نشد", 404);
  if (course.teacherId !== user.id) {
    return fail("فقط مدرس دوره می‌تواند درس اضافه کند", 403);
  }

  const body = await readJson(req);
  if (!body) return fail("داده‌های ارسالی نامعتبر است");

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length < 2 || title.length > 120) {
    return fail("عنوان درس باید بین ۲ تا ۱۲۰ نویسه باشد");
  }
  const videoUrl = typeof body.videoUrl === "string" ? body.videoUrl.trim() : "";
  if (!videoUrl || videoUrl.length > 500 || !(/^https?:\/\//.test(videoUrl) || videoUrl.startsWith("/"))) {
    return fail("آدرس ویدیو معتبر نیست");
  }
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length > 1000) return fail("توضیحات درس حداکثر ۱۰۰۰ نویسه است");
  let durationMinutes: number | null = null;
  if (body.durationMinutes !== undefined && body.durationMinutes !== null) {
    if (
      typeof body.durationMinutes !== "number" ||
      !Number.isInteger(body.durationMinutes) ||
      body.durationMinutes < 1 ||
      body.durationMinutes > 600
    ) {
      return fail("مدت درس باید بین ۱ تا ۶۰۰ دقیقه باشد");
    }
    durationMinutes = body.durationMinutes;
  }
  const isFreePreview = body.isFreePreview === true;

  const agg = await db.videoLesson.aggregate({
    where: { courseId: course.id },
    _max: { order: true },
  });
  const order = (agg._max.order ?? 0) + 1;

  const lesson = await db.videoLesson.create({
    data: {
      courseId: course.id,
      order,
      title,
      videoUrl,
      description: description || null,
      durationMinutes,
      isFreePreview,
    },
  });

  return ok({ id: lesson.id, order }, 201);
}
