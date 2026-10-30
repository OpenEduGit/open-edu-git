// GET /api/v1/wallet — balance + last 50 transactions (lazy wallet creation)
import { db } from "@/lib/db";
import { ok, requireUser, unauthorized } from "@/lib/server/http";
import { toTxnItem } from "@/lib/server/serializers";
import type { WalletResponse } from "@/lib/types";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  // Lazy-upsert: first access creates the row with balance 0.
  const wallet = await db.wallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, balance: 0 },
    update: {},
  });

  const txns = await db.txn.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const response: WalletResponse = {
    balance: wallet.balance,
    transactions: txns.map(toTxnItem),
  };
  return ok(response);
}
