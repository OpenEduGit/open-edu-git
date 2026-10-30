// POST /api/v1/pamphlets/[id]/versions — publish a new version (author only)
import { db } from "@/lib/db";
import { countContentLines, lineDiff } from "@/lib/diff";
import { asString, fail, ok, readJson, requireUser, unauthorized } from "@/lib/server/http";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await readJson(req);
  if (!body) return fail("داده‌های ارسالی نامعتبر است");

  const content = asString(body.content) ?? "";
  if (content.trim().length < 30) {
    return fail("محتوای نسخه باید حداقل ۳۰ نویسه باشد");
  }
  const changeSummary = asString(body.changeSummary)?.trim() ?? "";
  if (changeSummary.length > 200) return fail("خلاصهٔ تغییرات حداکثر ۲۰۰ نویسه است");

  const p = await db.pamphlet.findUnique({
    where: { id },
    select: {
      authorId: true,
      versions: {
        select: { versionNumber: true, content: true },
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });
  if (!p) return fail("جزوه پیدا نشد", 404);
  if (p.authorId !== user.id) {
    return fail("فقط نویسندهٔ جزوه می‌تواند نسخهٔ جدید منتشر کند", 403);
  }

  const latest = p.versions[0];
  const nextNumber = (latest?.versionNumber ?? 0) + 1;
  const addedCount = latest
    ? lineDiff(latest.content, content).addedCount
    : countContentLines(content);

  await db.$transaction([
    db.pamphletVersion.create({
      data: {
        pamphletId: id,
        versionNumber: nextNumber,
        content,
        changeSummary: changeSummary || null,
        createdById: user.id,
      },
    }),
    db.pamphlet.update({ where: { id }, data: { updatedAt: new Date() } }),
    db.contribution.upsert({
      where: { pamphletId_userId: { pamphletId: id, userId: user.id } },
      create: { pamphletId: id, userId: user.id, score: Math.max(addedCount, 10) },
      update: { score: { increment: addedCount } },
    }),
  ]);

  return ok({ versionNumber: nextNumber }, 201);
}
