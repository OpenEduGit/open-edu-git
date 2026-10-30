// GET /api/v1/sessions/[id]/join — HMAC room ticket for the socket.io classroom
import { db } from "@/lib/db";
import { ROOM_TICKET_MAX_AGE_MS, signTicket } from "@/lib/server/auth";
import { fail, ok, requireUser, unauthorized } from "@/lib/server/http";
import type { JoinTicketResponse } from "@/lib/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return unauthorized();

  const session = await db.classSession.findUnique({ where: { id } });
  if (!session) return fail("جلسه پیدا نشد", 404);
  if (session.teacherId !== user.id && session.studentId !== user.id) {
    return fail("فقط شرکت‌کنندگان این جلسه دسترسی دارند", 403);
  }
  if (session.status !== "BOOKED") return fail("جلسه در دسترس نیست");

  const role: "teacher" | "student" = session.teacherId === user.id ? "teacher" : "student";
  const ticket = signTicket({
    uid: user.id,
    sid: session.id,
    role,
    name: user.fullName,
    exp: Date.now() + ROOM_TICKET_MAX_AGE_MS,
  });

  const response: JoinTicketResponse = {
    ticket,
    meetingCode: session.meetingCode,
    room: `session:${session.id}`,
    role,
    me: { id: user.id, fullName: user.fullName },
  };
  return ok(response);
}
