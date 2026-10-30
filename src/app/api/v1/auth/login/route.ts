// POST /api/v1/auth/login — email + password → session cookie
import { db } from "@/lib/db";
import { setSessionCookie, toPublicUser, verifyPassword } from "@/lib/server/auth";
import { asString, fail, ok, readJson } from "@/lib/server/http";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return fail("داده‌های ارسالی نامعتبر است");

  const email = asString(body.email)?.trim().toLowerCase() ?? "";
  const password = asString(body.password) ?? "";
  if (!email || !password) return fail("ایمیل و رمز عبور الزامی است");

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return fail("ایمیل یا رمز عبور اشتباه است", 401);
  }

  await setSessionCookie(user.id);
  return ok({ user: toPublicUser(user) });
}
