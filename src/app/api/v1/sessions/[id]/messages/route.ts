// POST /api/v1/sessions/[id]/messages — persist a classroom chat message (member only)
import { db } from "@/lib/db";
import { fail, ok, readJson, requireUser, unauthorized } from "@/lib/server/http";
import { toSessionMessageItem } from "@/lib/server/serializers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await readJson(req);
  if (!body) return fail("داده‌های ارسالی نامعتبر است");

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (text.length < 1 || text.length > 1000) {
    return fail("متن پیام باید بین ۱ تا ۱۰۰۰ نویسه باشد");
  }

  const session = await db.classSession.findUnique({ where: { id } });
  if (!session) return fail("جلسه پیدا نشد", 404);
  if (session.teacherId !== user.id && session.studentId !== user.id) {
    return fail("فقط شرکت‌کنندگان این جلسه دسترسی دارند", 403);
  }

  const message = await db.sessionMessage.create({
    data: { sessionId: session.id, senderId: user.id, body: text },
    include: { sender: { select: { id: true, fullName: true } } },
  });

  return ok({ message: toSessionMessageItem(message) }, 201);
}
