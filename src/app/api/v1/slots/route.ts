// POST /api/v1/slots — create one or more teaching slots (batch, max 20)
import { db } from "@/lib/db";
import { SLOT_DURATIONS, SLOT_MAX_PRICE, SLOT_MIN_PRICE } from "@/lib/constants";
import { fail, ok, readJson, requireUser, unauthorized } from "@/lib/server/http";

const MAX_BATCH = 20;
const OVERLAP_TOLERANCE_MS = 15 * 60_000; // ±15 minutes
const MIN_LEAD_MS = 60 * 60_000; // startAt must be ≥ now + 60min

interface SlotInput {
  startAt: string;
  durationMinutes?: number;
  price: number;
}

/** Validate a slot payload → parsed input or a Persian error message. */
function parseSlot(raw: unknown, mySlots: { startAt: Date; durationMinutes: number }[]): SlotInput | string {
  if (!raw || typeof raw !== "object") return "داده‌های ارسالی نامعتبر است";
  const s = raw as Record<string, unknown>;

  if (typeof s.startAt !== "string") return "زمان شروع معتبر نیست";
  const startMs = Date.parse(s.startAt);
  if (Number.isNaN(startMs)) return "زمان شروع معتبر نیست";
  if (startMs < Date.now() + MIN_LEAD_MS) {
    return "زمان شروع باید دست‌کم یک ساعت بعد از اکنون باشد";
  }

  const duration =
    s.durationMinutes === undefined || s.durationMinutes === null ? 60 : s.durationMinutes;
  if (typeof duration !== "number" || !Number.isInteger(duration) || !SLOT_DURATIONS.includes(duration as 30)) {
    return "مدت جلسه باید یکی از مقادیر ۳۰، ۴۵، ۶۰، ۹۰ یا ۱۲۰ دقیقه باشد";
  }

  if (
    typeof s.price !== "number" ||
    !Number.isInteger(s.price) ||
    s.price < SLOT_MIN_PRICE ||
    s.price > SLOT_MAX_PRICE ||
    s.price % 5_000 !== 0
  ) {
    return "نرخ هر جلسه باید بین ۲۰,۰۰۰ تا ۲,۰۰۰,۰۰۰ تومان و مضرب ۵,۰۰۰ باشد";
  }

  // overlap check (±15min tolerance) against existing own slots + this batch
  const ns = startMs - OVERLAP_TOLERANCE_MS;
  const ne = startMs + duration * 60_000 + OVERLAP_TOLERANCE_MS;
  const overlaps = mySlots.some((x) => {
    const es = x.startAt.getTime();
    const ee = es + x.durationMinutes * 60_000;
    return ns < ee && es < ne;
  });
  if (overlaps) return "این زمان با اسلات دیگری شما هم‌پوشانی دارد";

  return { startAt: s.startAt, durationMinutes: duration, price: s.price };
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await readJson(req);
  if (!body) return fail("داده‌های ارسالی نامعتبر است");

  // accept {slots:[...]} or a single slot object
  const rawList = Array.isArray(body.slots)
    ? body.slots
    : body.slots === undefined && (body.startAt !== undefined || body.price !== undefined)
      ? [body]
      : null;
  if (!rawList) return fail("داده‌های ارسالی نامعتبر است");
  if (rawList.length === 0) return fail("حداقل یک اسلات ارسال کنید");
  if (rawList.length > MAX_BATCH) {
    return fail("حداکثر ۲۰ اسلات در هر بار امکان‌پذیر است");
  }

  const existing = await db.teacherSlot.findMany({
    where: { teacherId: user.id },
    select: { startAt: true, durationMinutes: true },
  });

  const parsed: SlotInput[] = [];
  for (const raw of rawList) {
    const result = parseSlot(raw, [...existing, ...parsed.map((p) => ({
      startAt: new Date(p.startAt),
      durationMinutes: p.durationMinutes ?? 60,
    }))]);
    if (typeof result === "string") return fail(result);
    parsed.push(result);
  }

  await db.$transaction(
    parsed.map((p) =>
      db.teacherSlot.create({
        data: {
          teacherId: user.id,
          startAt: new Date(p.startAt),
          durationMinutes: p.durationMinutes ?? 60,
          price: p.price,
          status: "OPEN",
        },
      })
    )
  );

  return ok({ created: parsed.length }, 201);
}
