// GET /api/v1/market/teachers — marketplace listing (only teachers with future OPEN slots)
import { db } from "@/lib/db";
import { normalizePersian } from "@/lib/format";
import { ok } from "@/lib/server/http";
import { round1 } from "@/lib/server/serializers";
import type { MarketTeacher } from "@/lib/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = (url.searchParams.get("query") ?? "").trim();
  const sort = url.searchParams.get("sort") ?? "rating";

  const now = new Date();
  const openSlots = await db.teacherSlot.findMany({
    where: { status: "OPEN", startAt: { gt: now } },
    select: { teacherId: true, price: true },
  });

  // group future OPEN slots per teacher
  const slotAgg = new Map<string, { count: number; min: number }>();
  for (const s of openSlots) {
    const agg = slotAgg.get(s.teacherId) ?? { count: 0, min: Number.MAX_SAFE_INTEGER };
    agg.count += 1;
    agg.min = Math.min(agg.min, s.price);
    slotAgg.set(s.teacherId, agg);
  }
  const teacherIds = [...slotAgg.keys()];
  if (teacherIds.length === 0) return ok({ items: [] });

  const [users, sessions, pamphletCounts] = await Promise.all([
    db.user.findMany({
      where: { id: { in: teacherIds } },
      select: { id: true, fullName: true, title: true, bio: true, expertise: true },
    }),
    db.classSession.findMany({
      where: { teacherId: { in: teacherIds }, status: "COMPLETED" },
      select: { teacherId: true, review: { select: { rating: true } } },
    }),
    db.pamphlet.groupBy({
      by: ["authorId"],
      where: { authorId: { in: teacherIds } },
      _count: { _all: true },
    }),
  ]);

  const sessionAgg = new Map<string, { count: number; ratingSum: number; ratingCount: number }>();
  for (const s of sessions) {
    const agg = sessionAgg.get(s.teacherId) ?? { count: 0, ratingSum: 0, ratingCount: 0 };
    agg.count += 1;
    if (s.review) {
      agg.ratingSum += s.review.rating;
      agg.ratingCount += 1;
    }
    sessionAgg.set(s.teacherId, agg);
  }
  const pamphletMap = new Map(pamphletCounts.map((p) => [p.authorId, p._count._all]));

  const nq = normalizePersian(query);
  let items: MarketTeacher[] = users
    .filter((u) => {
      if (!nq) return true;
      const fields = [u.fullName, u.expertise ?? "", u.bio ?? ""];
      return fields.some((f) => normalizePersian(f).includes(nq));
    })
    .map((u) => {
      const slots = slotAgg.get(u.id)!;
      const sess = sessionAgg.get(u.id) ?? { count: 0, ratingSum: 0, ratingCount: 0 };
      return {
        id: u.id,
        fullName: u.fullName,
        title: u.title,
        bio: u.bio,
        expertise: u.expertise,
        openSlotCount: slots.count,
        minPrice: slots.min,
        sessionCount: sess.count,
        avgSessionRating: sess.ratingCount
          ? round1(sess.ratingSum / sess.ratingCount)
          : 0,
        ratingCount: sess.ratingCount,
        pamphletCount: pamphletMap.get(u.id) ?? 0,
      };
    });

  if (sort === "price_asc") {
    items.sort((a, b) => (a.minPrice ?? 0) - (b.minPrice ?? 0));
  } else if (sort === "price_desc") {
    items.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
  } else if (sort === "sessions") {
    items.sort((a, b) => b.sessionCount - a.sessionCount);
  } else {
    // rating (default): avgSessionRating desc, then sessionCount desc
    items.sort((a, b) => b.avgSessionRating - a.avgSessionRating || b.sessionCount - a.sessionCount);
  }

  return ok({ items });
}
