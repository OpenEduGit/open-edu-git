// GET /api/v1/users/top — top 6 teachers by pamphlet count, then merged MRs
import { db } from "@/lib/db";
import { ok } from "@/lib/server/http";
import { round1 } from "@/lib/server/serializers";

export async function GET() {
  const users = await db.user.findMany({
    select: {
      id: true,
      fullName: true,
      title: true,
      expertise: true,
      pamphlets: { select: { reviews: { select: { rating: true } } } },
      mergeRequests: { where: { status: "MERGED" }, select: { id: true } },
    },
  });

  const items = users
    .map((u) => {
      // Mean of per-pamphlet ratingAvg (0 for unrated pamphlets) — same as /users/[id].
      const perPamphletAvg = u.pamphlets.map((p) => {
        if (!p.reviews.length) return 0;
        const sum = p.reviews.reduce((s, r) => s + r.rating, 0);
        return round1(sum / p.reviews.length);
      });
      const avgRating = perPamphletAvg.length
        ? round1(perPamphletAvg.reduce((s, r) => s + r, 0) / perPamphletAvg.length)
        : 0;
      return {
        id: u.id,
        fullName: u.fullName,
        title: u.title,
        expertise: u.expertise,
        pamphletCount: u.pamphlets.length,
        mergedCount: u.mergeRequests.length,
        avgRating,
      };
    })
    .sort((a, b) => b.pamphletCount - a.pamphletCount || b.mergedCount - a.mergedCount)
    .slice(0, 6);

  return ok({ items });
}
