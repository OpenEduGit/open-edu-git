// POST /api/v1/wallet/withdraw — debit the wallet (WITHDRAW txn)
import { db } from "@/lib/db";
import { WALLET_MIN_WITHDRAW } from "@/lib/constants";
import { fail, ok, readJson, requireUser, unauthorized } from "@/lib/server/http";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await readJson(req);
  if (!body) return fail("داده‌های ارسالی نامعتبر است");

  const amount = body.amount;
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
    return fail("مبلغ نامعتبر است");
  }
  if (amount < WALLET_MIN_WITHDRAW) {
    return fail("حداقل مبلغ برداشت ۵۰,۰۰۰ تومان است");
  }

  const balance = await db.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId: user.id },
      create: { userId: user.id, balance: 0 },
      update: {},
    });
    if (wallet.balance < amount) throw new Error("INSUFFICIENT");

    const balanceAfter = wallet.balance - amount;
    await tx.txn.create({
      data: {
        userId: user.id,
        type: "WITHDRAW",
        amount: -amount,
        balanceAfter,
        description: "برداشت از کیف پول",
        status: "SUCCESS",
        refType: null,
        refId: null,
        authority: null,
      },
    });
    await tx.wallet.update({ where: { userId: user.id }, data: { balance: balanceAfter } });
    return balanceAfter;
  }).catch((e: unknown) => {
    if (e instanceof Error && e.message === "INSUFFICIENT") return null;
    throw e;
  });

  if (balance === null) return fail("موجودی کافی نیست");
  return ok({ balance });
}
