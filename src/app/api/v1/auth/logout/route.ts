// POST /api/v1/auth/logout — clear session cookie
import { clearSessionCookie } from "@/lib/server/auth";
import { ok } from "@/lib/server/http";

export async function POST() {
  await clearSessionCookie();
  return ok({ ok: true });
}
