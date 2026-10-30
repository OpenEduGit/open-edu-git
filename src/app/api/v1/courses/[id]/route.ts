// /api/v1/courses/[id] — GET (detail, viewer-locked lessons) + PATCH (owner edit)
import { db } from "@/lib/db";
import { DIFFICULTIES, GRADES, SUBJECTS } from "@/lib/constants";
import {
  asString,
  fail,
  ok,
  oneOf,
  readJson,
  requireUser,
  unauthorized,
} from "@/lib/server/http";
import {
  courseCardInclude,
  toCourseCard,
  toCourseReviewItem,
  toLessonItem,
} from "@/lib/server/serializers";
import type { CourseDetail } from "@/lib/types";

const COURSE_MAX_PRICE = 5_000_000;

// ---------- GET: detail ----------
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireUser(); // optional — course detail is public

  const course = await db.videoCourse.findUnique({
    where: { id },
    include: {
      ...courseCardInclude,
      lessons: {
        orderBy: { order: "asc" },
        select: {
          id: true, order: true, title: true, description: true,
          durationMinutes: true, isFreePreview: true, videoUrl: true,
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true, rating: true, comment: true, createdAt: true,
          user: { select: { id: true, fullName: true, title: true } },
        },
      },
    },
  });
  if (!course) return fail("دوره پیدا نشد", 404);

  const isMine = !!viewer && viewer.id === course.teacherId;
  // hide DRAFT courses from everyone except the owner
  if (course.status === "DRAFT" && !isMine) return fail("دوره پیدا نشد", 404);

  const enrolled = !!viewer && !isMine
    ? !!(await db.courseEnrollment.findUnique({
        where: { courseId_studentId: { courseId: course.id, studentId: viewer.id } },
        select: { id: true },
      }))
    : false;

  const progressRows =
    viewer && enrolled
      ? await db.lessonProgress.findMany({
          where: { userId: viewer.id, lesson: { courseId: course.id }, watched: true },
          select: { lessonId: true },
        })
      : [];
  const watchedSet = new Set(progressRows.map((p) => p.lessonId));

  const lessons = course.lessons.map((l) => {
    const unlocked = isMine || enrolled || l.isFreePreview;
    return toLessonItem(l, {
      unlocked,
      watched: enrolled ? watchedSet.has(l.id) : undefined,
    });
  });

  const myReviewRow = viewer
    ? (course.reviews.find((r) => r.user.id === viewer.id) ?? null)
    : null;

  const detail: CourseDetail = {
    ...toCourseCard(course),
    description: course.description,
    status: course.status as "DRAFT" | "PUBLISHED",
    isMine,
    enrolled,
    canReview: enrolled && !isMine,
    lessons,
    reviews: course.reviews.map(toCourseReviewItem),
    myReview: myReviewRow ? toCourseReviewItem(myReviewRow) : null,
  };
  if (isMine) {
    detail.salesCount = course.enrollments.length;
  }
  return ok(detail);
}

// ---------- PATCH: owner edit ----------
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return unauthorized();

  const course = await db.videoCourse.findUnique({
    where: { id },
    select: { id: true, teacherId: true },
  });
  if (!course) return fail("دوره پیدا نشد", 404);
  if (course.teacherId !== user.id) {
    return fail("فقط مدرس دوره می‌تواند آن را ویرایش کند", 403);
  }

  const body = await readJson(req);
  if (!body) return fail("داده‌های ارسالی نامعتبر است");

  const data: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = asString(body.title)?.trim() ?? "";
    if (title.length < 3 || title.length > 120) {
      return fail("عنوان دوره باید بین ۳ تا ۱۲۰ نویسه باشد");
    }
    data.title = title;
  }
  if (body.description !== undefined) {
    const description = asString(body.description)?.trim() ?? "";
    if (description.length > 2000) return fail("توضیحات دوره حداکثر ۲۰۰۰ نویسه است");
    data.description = description || null;
  }
  if (body.grade !== undefined) {
    const grade = oneOf(body.grade, GRADES);
    if (!grade) return fail("پایه تحصیلی انتخاب‌شده معتبر نیست");
    data.grade = grade;
  }
  if (body.subject !== undefined) {
    const subject = oneOf(body.subject, SUBJECTS);
    if (!subject) return fail("درس انتخاب‌شده معتبر نیست");
    data.subject = subject;
  }
  if (body.level !== undefined) {
    if (body.level === null || body.level === "") {
      data.level = null;
    } else {
      const level = oneOf(body.level, DIFFICULTIES);
      if (!level) return fail("سطح دشواری انتخاب‌شده معتبر نیست");
      data.level = level;
    }
  }
  if (body.price !== undefined) {
    const price = body.price;
    if (
      typeof price !== "number" ||
      !Number.isInteger(price) ||
      price < 0 ||
      price > COURSE_MAX_PRICE ||
      price % 10_000 !== 0
    ) {
      return fail("قیمت باید حداکثر ۵,۰۰۰,۰۰۰ تومان و مضرب ۱۰,۰۰۰ باشد");
    }
    data.price = price;
  }
  if (body.status !== undefined) {
    if (body.status !== "DRAFT" && body.status !== "PUBLISHED") {
      return fail("وضعیت دوره معتبر نیست");
    }
    data.status = body.status;
  }

  if (Object.keys(data).length > 0) {
    await db.videoCourse.update({ where: { id }, data });
  }
  return ok({ ok: true });
}
