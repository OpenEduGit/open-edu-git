// /api/v1/courses — GET (list/search/sort/paginate, PUBLISHED only) + POST (create)
import { db } from "@/lib/db";
import { DIFFICULTIES, GRADES, SUBJECTS } from "@/lib/constants";
import { normalizePersian } from "@/lib/format";
import { asString, fail, ok, oneOf, readJson, requireUser, unauthorized } from "@/lib/server/http";
import { courseCardInclude, toCourseCard } from "@/lib/server/serializers";
import type { CourseListResponse } from "@/lib/types";

const COURSE_MAX_PRICE = 5_000_000;

/** Video URL must be http(s)://… or a root-relative /path, ≤ 500 chars. */
function isValidVideoUrl(url: string): boolean {
  return url.length > 0 && url.length <= 500 && (/^https?:\/\//.test(url) || url.startsWith("/"));
}

/** Validate one lesson payload → normalized fields or a Persian error. */
function parseLesson(raw: unknown): { title: string; videoUrl: string; description: string | null; durationMinutes: number | null; isFreePreview: boolean } | string {
  if (!raw || typeof raw !== "object") return "داده‌های درس نامعتبر است";
  const l = raw as Record<string, unknown>;
  const title = typeof l.title === "string" ? l.title.trim() : "";
  if (title.length < 2 || title.length > 120) {
    return "عنوان درس باید بین ۲ تا ۱۲۰ نویسه باشد";
  }
  const videoUrl = typeof l.videoUrl === "string" ? l.videoUrl.trim() : "";
  if (!isValidVideoUrl(videoUrl)) return "آدرس ویدیو معتبر نیست";
  const description = typeof l.description === "string" ? l.description.trim() : "";
  if (description.length > 1000) return "توضیحات درس حداکثر ۱۰۰۰ نویسه است";
  let durationMinutes: number | null = null;
  if (l.durationMinutes !== undefined && l.durationMinutes !== null) {
    if (
      typeof l.durationMinutes !== "number" ||
      !Number.isInteger(l.durationMinutes) ||
      l.durationMinutes < 1 ||
      l.durationMinutes > 600
    ) {
      return "مدت درس باید بین ۱ تا ۶۰۰ دقیقه باشد";
    }
    durationMinutes = l.durationMinutes;
  }
  const isFreePreview = l.isFreePreview === true;
  return { title, videoUrl, description: description || null, durationMinutes, isFreePreview };
}

/** Validate course price (0 allowed = free). */
function parsePrice(raw: unknown): number | string {
  if (
    typeof raw !== "number" ||
    !Number.isInteger(raw) ||
    raw < 0 ||
    raw > COURSE_MAX_PRICE ||
    raw % 10_000 !== 0
  ) {
    return "قیمت باید حداکثر ۵,۰۰۰,۰۰۰ تومان و مضرب ۱۰,۰۰۰ باشد";
  }
  return raw;
}

// ---------- GET: list ----------
export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = (url.searchParams.get("query") ?? "").trim();
  const grade = url.searchParams.get("grade") ?? "";
  const subject = url.searchParams.get("subject") ?? "";
  const sort = url.searchParams.get("sort") ?? "newest";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    48,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "12", 10) || 12)
  );

  // Persian-normalized search over title/description/teacher name — fetch + JS filter
  const rows = await db.videoCourse.findMany({
    where: {
      status: "PUBLISHED",
      ...(grade ? { grade } : {}),
      ...(subject ? { subject } : {}),
    },
    include: { ...courseCardInclude, teacher: { select: { id: true, fullName: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });

  const nq = normalizePersian(query);
  const filtered = nq
    ? rows.filter((c) =>
        [c.title, c.description ?? "", c.teacher.fullName].some((f) =>
          normalizePersian(f).includes(nq)
        )
      )
    : rows;

  let items = filtered.map(toCourseCard);
  if (sort === "top") {
    items.sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount);
  } else if (sort === "popular") {
    items.sort((a, b) => b.studentCount - a.studentCount);
  } else if (sort === "price_asc") {
    items.sort((a, b) => a.price - b.price);
  } else if (sort === "price_desc") {
    items.sort((a, b) => b.price - a.price);
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  const response: CourseListResponse = {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  };
  return ok(response);
}

// ---------- POST: create ----------
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await readJson(req);
  if (!body) return fail("داده‌های ارسالی نامعتبر است");

  const title = asString(body.title)?.trim() ?? "";
  if (title.length < 3 || title.length > 120) {
    return fail("عنوان دوره باید بین ۳ تا ۱۲۰ نویسه باشد");
  }
  const description = asString(body.description)?.trim() ?? "";
  if (description.length > 2000) return fail("توضیحات دوره حداکثر ۲۰۰۰ نویسه است");
  const grade = oneOf(body.grade, GRADES);
  if (!grade) return fail("پایه تحصیلی انتخاب‌شده معتبر نیست");
  const subject = oneOf(body.subject, SUBJECTS);
  if (!subject) return fail("درس انتخاب‌شده معتبر نیست");
  let level: string | null = null;
  if (body.level !== undefined && body.level !== null) {
    level = oneOf(body.level, DIFFICULTIES);
    if (!level) return fail("سطح دشواری انتخاب‌شده معتبر نیست");
  }
  const price = parsePrice(body.price);
  if (typeof price === "string") return fail(price);
  const status = body.status === undefined ? "PUBLISHED" : body.status;
  if (status !== "DRAFT" && status !== "PUBLISHED") {
    return fail("وضعیت دوره معتبر نیست");
  }

  if (!Array.isArray(body.lessons) || body.lessons.length < 1) {
    return fail("هر دوره باید دست‌کم یک درس داشته باشد");
  }
  if (body.lessons.length > 40) return fail("حداکثر ۴۰ درس در هر دوره امکان‌پذیر است");
  const lessons: { title: string; videoUrl: string; description: string | null; durationMinutes: number | null; isFreePreview: boolean }[] = [];
  for (const raw of body.lessons) {
    const parsed = parseLesson(raw);
    if (typeof parsed === "string") return fail(parsed);
    lessons.push(parsed);
  }

  const course = await db.videoCourse.create({
    data: {
      teacherId: user.id,
      title,
      description: description || null,
      grade,
      subject,
      level,
      price,
      status,
      lessons: {
        create: lessons.map((l, i) => ({
          order: i + 1,
          title: l.title,
          videoUrl: l.videoUrl,
          description: l.description,
          durationMinutes: l.durationMinutes,
          isFreePreview: l.isFreePreview,
        })),
      },
    },
    select: { id: true },
  });
  return ok({ id: course.id }, 201);
}
