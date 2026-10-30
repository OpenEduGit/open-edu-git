// GET /api/v1/courses/mine — my courses (incl. DRAFT) with status + salesCount
import { db } from "@/lib/db";
import { ok, requireUser, unauthorized } from "@/lib/server/http";
import { courseCardInclude, toCourseCard } from "@/lib/server/serializers";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const rows = await db.videoCourse.findMany({
    where: { teacherId: user.id },
    include: courseCardInclude,
    orderBy: { createdAt: "desc" },
  });

  const items = rows.map((c) => ({
    ...toCourseCard(c),
    status: c.status as "DRAFT" | "PUBLISHED",
    salesCount: c.enrollments.length,
  }));
  return ok({ items });
}
