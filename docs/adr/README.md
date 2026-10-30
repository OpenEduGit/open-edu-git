# 📐 ADR Index — معماری تصمیم‌ها

Architecture Decision Records — هر تصمیم مهم فنی یک فایل، با قالب: Context / Decision / Consequences / Migration plan.

| # | عنوان | وضعیت |
|---|---|---|
| [0001](0001-use-nextjs-instead-of-fastapi.md) | استفاده از Next.js به‌جای FastAPI | ACCEPTED |
| [0002](0002-sqlite-mvp-postgres-production.md) | SQLite برای توسعه، PostgreSQL برای پروداکشن | ACCEPTED |
| [0003](0003-prisma-orm.md) | Prisma به‌عنوان ORM | ACCEPTED |
| [0004](0004-hmac-cookie-sessions.md) | نشست‌های کوکی HMAC (تا JWT) | ACCEPTED |
| [0005](0005-mock-payment-gateway.md) | درگاه پرداخت نمایشی تا e-namad | ACCEPTED |
| [0006](0006-chat-whiteboard-classroom.md) | کلاس زنده: چت + تخته (تا WebRTC) | ACCEPTED |
| [0007](0007-markdown-in-db.md) | محتوای جزوه: Markdown در دیتابیس (تا MinIO) | ACCEPTED |
| [0008](0008-gitflow-going-forward.md) | GitFlow + Conventional Commits | ACCEPTED |

## قالب و قواعد

- فایل جدید: `NNNN-kebab-case-title.md` (شمارهٔ ترتیبی، هرگز استفادهٔ مجدد نمی‌شود).
- وضعیت‌ها: `PROPOSED` → `ACCEPTED` / `REJECTED` / `SUPERSEDED by NNNN`.
- تصمیم قبلی حذف نمی‌شود؛ اگر عوض شد، ADR جدید بنویسید و قدیمی را SUPERSEDED کنید.
- فهرست در [docs/DECISIONS.md](../DECISIONS.md) نگهداری می‌شود — آنجا هم اضافه کنید.
