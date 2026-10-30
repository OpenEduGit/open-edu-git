// DELETE /api/v1/slots/[id] — remove one of my future OPEN slots
import { db } from "@/lib/db";
import { fail, ok, requireUser, unauthorized } from "@/lib/server/http";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return unauthorized();

  const slot = await db.teacherSlot.findUnique({ where: { id } });
  // 404 for both missing and someone else's slot (no enumeration leak)
  if (!slot || slot.teacherId !== user.id) return fail("اسلات پیدا نشد", 404);

  if (slot.status !== "OPEN" || slot.startAt.getTime() <= Date.now()) {
    return fail("این اسلات قابل حذف نیست");
  }

  await db.teacherSlot.delete({ where: { id } });
  return ok({ ok: true });
}
