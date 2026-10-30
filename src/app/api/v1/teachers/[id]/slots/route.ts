// GET /api/v1/teachers/[id]/slots — public list of a teacher's future OPEN slots
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/server/http";
import { toSlotItem } from "@/lib/server/serializers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const teacher = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!teacher) return fail("کاربر پیدا نشد", 404);

  const slots = await db.teacherSlot.findMany({
    where: { teacherId: id, status: "OPEN", startAt: { gt: new Date() } },
    orderBy: { startAt: "asc" },
  });

  return ok({ items: slots.map(toSlotItem) });
}
