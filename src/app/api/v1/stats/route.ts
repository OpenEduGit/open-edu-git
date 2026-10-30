// GET /api/v1/stats — platform statistics
import { db } from "@/lib/db";
import { ok } from "@/lib/server/http";

export async function GET() {
  const [pamphlets, teachers, versions, reviews, forks, mergeRequests, mergedCount, sessions, courses] =
    await Promise.all([
      db.pamphlet.count(),
      db.user.count({ where: { role: "معلم" } }),
      db.pamphletVersion.count(),
      db.review.count(),
      db.pamphlet.count({ where: { forkedFromId: { not: null } } }),
      db.mergeRequest.count(),
      db.mergeRequest.count({ where: { status: "MERGED" } }),
      // Phase 2 — teaching marketplace
      db.classSession.count({ where: { status: "COMPLETED" } }),
      db.videoCourse.count({ where: { status: "PUBLISHED" } }),
    ]);

  return ok({ pamphlets, teachers, versions, reviews, forks, mergeRequests, mergedCount, sessions, courses });
}
