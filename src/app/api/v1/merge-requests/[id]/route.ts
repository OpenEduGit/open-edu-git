// GET /api/v1/merge-requests/[id] — MRDetail (contents + diff + canReview)
import { db } from "@/lib/db";
import { lineDiff } from "@/lib/diff";
import { getCurrentUser } from "@/lib/server/auth";
import { fail, ok } from "@/lib/server/http";
import { toMRItem } from "@/lib/server/serializers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const mr = await db.mergeRequest.findUnique({
    where: { id },
    include: {
      source: {
        select: {
          id: true,
          title: true,
          authorId: true,
          versions: { select: { content: true }, orderBy: { versionNumber: "desc" }, take: 1 },
        },
      },
      target: {
        select: {
          id: true,
          title: true,
          authorId: true,
          versions: { select: { content: true }, orderBy: { versionNumber: "desc" }, take: 1 },
        },
      },
      createdBy: { select: { id: true, fullName: true } },
      reviewedBy: { select: { id: true, fullName: true } },
    },
  });
  if (!mr) return fail("پیشنهاد ادغام پیدا نشد", 404);

  const sourceContent = mr.source.versions[0]?.content ?? "";
  const targetContent = mr.target.versions[0]?.content ?? "";

  return ok({
    ...toMRItem(mr),
    sourceContent,
    targetContent,
    diff: lineDiff(targetContent, sourceContent),
    canReview: !!user && user.id === mr.target.authorId,
  });
}
