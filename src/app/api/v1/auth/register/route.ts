// POST /api/v1/auth/register — create account + session
import { db } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import { hashPassword, setSessionCookie, toPublicUser } from "@/lib/server/auth";
import { asString, fail, ok, oneOf, readJson } from "@/lib/server/http";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return fail("داده‌های ارسالی نامعتبر است");

  const email = asString(body.email)?.trim().toLowerCase() ?? "";
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return fail("ایمیل واردشده معتبر نیست");
  }
  const password = asString(body.password) ?? "";
  if (password.length < 6) {
    return fail("رمز عبور باید حداقل ۶ نویسه باشد");
  }
  const fullName = asString(body.fullName)?.trim() ?? "";
  if (fullName.length < 2 || fullName.length > 80) {
    return fail("نام و نام خانوادگی باید بین ۲ تا ۸۰ نویسه باشد");
  }
  let role = "معلم";
  if (body.role !== undefined && body.role !== null) {
    const parsedRole = oneOf(body.role, ROLES);
    if (!parsedRole) return fail("نقش انتخاب‌شده معتبر نیست");
    role = parsedRole;
  }

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return fail("این ایمیل قبلاً ثبت شده است", 409);

  const user = await db.user.create({
    data: { email, passwordHash: hashPassword(password), fullName, role },
  });
  await setSessionCookie(user.id);
  return ok({ user: toPublicUser(user) }, 201);
}
