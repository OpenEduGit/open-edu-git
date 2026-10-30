// POST /api/v1/wallet/deposit/verify — settle a mock-gateway deposit (success|fail)
import { db } from "@/lib/db";
import { asString, fail, ok, readJson, requireUser, unauthorized } from "@/lib/server/http";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await readJson(req);
  if (!body) return fail("داده‌های ارسالی نامعتبر است");

  const authority = asString(body.authority);
  if (!authority) return fail("شناسهٔ تراکنش درگاه الزامی است");
  const result = body.result;
  if (result !== "success" && result !== "fail") {
    return fail("نتیجهٔ پرداخت باید «success» یا «fail» باشد");
  }

  const txn = await db.txn.findFirst({
    where: { authority, userId: user.id, type: "DEPOSIT", status: "PENDING" },
  });
  if (!txn) return fail("تراکنش پرداخت پیدا نشد", 404);

  // Atomic: claim the PENDING txn first (guards double-verify), then settle.
  const balance = await db.$transaction(async (tx) => {
    const claimed = await tx.txn.updateMany({
      where: { id: txn.id, status: "PENDING" },
      data: { status: result === "success" ? "SUCCESS" : "FAILED" },
    });
    if (claimed.count === 0) throw new Error("ALREADY_SETTLED");

    if (result === "fail") {
      const w = await tx.wallet.upsert({
        where: { userId: user.id },
        create: { userId: user.id, balance: 0 },
        update: {},
      });
      return w.balance;
    }

    const wallet = await tx.wallet.upsert({
      where: { userId: user.id },
      create: { userId: user.id, balance: 0 },
      update: {},
    });
    const balanceAfter = wallet.balance + txn.amount;
    await tx.txn.update({ where: { id: txn.id }, data: { balanceAfter } });
    await tx.wallet.update({
      where: { userId: user.id },
      data: { balance: balanceAfter },
    });
    return balanceAfter;
  }).catch(() => null);

  if (balance === null) return fail("تراکنش پرداخت پیدا نشد", 404);
  return ok({ balance });
}
