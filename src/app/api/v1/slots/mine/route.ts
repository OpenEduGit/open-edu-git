// GET /api/v1/slots/mine — teacher's own slots (future OPEN+BOOKED, past BOOKED)
import { db } from "@/lib/db";
import { ok, requireUser, unauthorized } from "@/lib/server/http";
import { mySlotInclude, toMySlotItem } from "@/lib/server/serializers";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const slots = await db.teacherSlot.findMany({
    where: {
      teacherId: user.id,
      OR: [{ startAt: { gt: new Date() } }, { status: "BOOKED" }],
    },
    orderBy: { startAt: "asc" },
    include: mySlotInclude,
  });

  return ok({ items: slots.map(toMySlotItem) });
}
