// POST /api/v1/wallet/deposit — start a mock-gateway deposit (PENDING txn + authority)
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { WALLET_MAX_DEPOSIT, WALLET_MIN_DEPOSIT } from "@/lib/constants";
import { fail, ok, readJson, requireUser, unauthorized } from "@/lib/server/http";
import type { DepositRequestResponse } from "@/lib/types";

const AUTHORITY_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Random 36-char alnum authority (like a Zarinpal authority). */
function genAuthority(): string {
  const bytes = crypto.randomBytes(36);
  let out = "";
  for (let i = 0; i < 36; i++) out += AUTHORITY_ALPHABET[bytes[i] % AUTHORITY_ALPHABET.length];
  return out;
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await readJson(req);
  if (!body) return fail("داده‌های ارسالی نامعتبر است");

  const amount = body.amount;
  if (
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount < WALLET_MIN_DEPOSIT ||
    amount > WALLET_MAX_DEPOSIT ||
    amount % 1_000 !== 0
  ) {
    return fail("مبلغ باید بین ۱۰,۰۰۰ تا ۵,۰۰۰,۰۰۰ تومان و مضرب ۱,۰۰۰ باشد");
  }

  // Lazy-upsert the wallet row (balance stays untouched while PENDING).
  const wallet = await db.wallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, balance: 0 },
    update: {},
  });

  // A PENDING deposit does not change the balance, so only the txn row is
  // written (balanceAfter = current balance). authority is unique — retry on
  // the (astronomically unlikely) collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const authority = genAuthority();
    try {
      await db.txn.create({
        data: {
          userId: user.id,
          type: "DEPOSIT",
          amount: +amount,
          balanceAfter: wallet.balance,
          description: "شارژ کیف پول از درگاه بانکی",
          status: "PENDING",
          refType: "GATEWAY",
          refId: null,
          authority,
        },
      });
      const response: DepositRequestResponse = { authority, amount };
      return ok(response, 201);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt < 2 && msg.includes("authority")) continue;
      throw e;
    }
  }
  return fail("خطای غیرمنتظره در ایجاد تراکنش؛ دوباره تلاش کنید", 500);
}
