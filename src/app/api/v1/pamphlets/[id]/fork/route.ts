// POST /api/v1/pamphlets/[id]/fork — fork a pamphlet (not your own)
import { db } from "@/lib/db";
import { countContentLines } from "@/lib/diff";
import { fail, ok, requireUser, unauthorized } from "@/lib/server/http";
import { latestContent } from "@/lib/server/serializers";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return unauthorized();

  const source = await db.pamphlet.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      authorId: true,
      forkedFromId: true,
      grade: true,
      subject: true,
      chapter: true,
      teachingMethod: true,
      difficulty: true,
      versions: {
        select: { content: true },
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });
  if (!source) return fail("جزوه پیدا نشد", 404);
  if (source.authorId === user.id) {
    return fail("نمی‌توانید جزوهٔ خودتان را فورک کنید", 403);
  }

  const content = latestContent(source.versions);

  // Fork of a fork keeps the lineage title; fresh forks get the «(فورک)» suffix.
  const forkishSuffix =
    source.title.endsWith("(فورک)") || source.title.endsWith("(نسخهٔ بهبودیافته)");
  const title = source.forkedFromId || forkishSuffix ? source.title : `${source.title} (فورک)`;

  const fork = await db.pamphlet.create({
    data: {
      title,
      description: `فورکی از «${source.title}»`,
      grade: source.grade,
      subject: source.subject,
      chapter: source.chapter,
      teachingMethod: source.teachingMethod,
      difficulty: source.difficulty,
      authorId: user.id,
      forkedFromId: source.id,
      versions: {
        create: {
          versionNumber: 1,
          content,
          changeSummary: "فورک از جزوهٔ اصلی",
          createdById: user.id,
        },
      },
      contributions: {
        create: { userId: user.id, score: Math.max(countContentLines(content), 10) },
      },
    },
    select: { id: true },
  });
  return ok({ id: fork.id }, 201);
}
