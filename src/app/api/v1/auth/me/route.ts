// GET /api/v1/auth/me — current session user
import { getCurrentUser, toPublicUser } from "@/lib/server/auth";
import { fail, ok } from "@/lib/server/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("وارد نشده‌اید", 401);
  return ok({ user: toPublicUser(user) });
}
