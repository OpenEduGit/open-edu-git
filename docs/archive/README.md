# 🗄️ Archive — آرشیو اسناد

این پوشه **مرجع فقط‌خواندنی** است. هیچ‌یک از اسناد اینجا «سند رسمی» فعلی پروژه نیستند.

## چیزهایی که اینجاست

این‌ها مستندات **چشم‌انداز اولیه** پروژه‌اند (پیش از پیاده‌سازی فاز ۱ و ۲)، وقتی پشتهٔ برنامه‌ریزی‌شده FastAPI + PostgreSQL + MinIO + Redis + Docker بود. پیاده‌سازی واقعی (به دلایل محیطی و سرعت رسیدن به بازار) با Next.js 16 + Prisma + SQLite انجام شد. اختلاف‌ها به‌صورت شفاف در ADRها مستند شده‌اند:

- [docs/adr/0001-use-nextjs-instead-of-fastapi.md](../../adr/0001-use-nextjs-instead-of-fastapi.md) — چرا FastAPI → Next.js
- [docs/adr/0002-sqlite-mvp-postgres-production.md](../../adr/0002-sqlite-mvp-postgres-production.md) — SQLite برای توسعه، PostgreSQL برای پروداکشن (برنامه‌ریزی‌شده)
- [docs/adr/0004-hmac-cookie-sessions.md](../../adr/0004-hmac-cookie-sessions.md) — HMAC به‌جای JWT (فعلاً)
- [docs/adr/0007-markdown-in-db.md](../../adr/0007-markdown-in-db.md) — Markdown در دیتابیس به‌جای MinIO (فعلاً)

## اسناد اصلیِ منعکس‌کنندهٔ واقعیت فعلی

- [README.md](../../README.md) (ریشه) — معرفی و شروع سریع
- [docs/ARCHITECTURE.md](../ARCHITECTURE.md) — معماری فعلی (واقعیت کد)
- [docs/DECISIONS.md](../DECISIONS.md) — فهرست تصمیم‌ها
- [docs/ROADMAP.md](../ROADMAP.md) — نقشهٔ راه به‌روز

## نگهداری

- این پوشه را ویرایش نکنید؛ برای اصلاح تاریخی، سند جدید در `docs/` بنویسید و به اینجا ارجاع دهید.
- `worklog-legacy.md` لاگ عملیاتی فاز ۱ و ۲ است (قرارداد API، مدل مشارکت، مالکیت فایل‌ها) — هنوز مرجع خوبی برای قراردادهای API است.

**تاریخ آرشیو:** 2026-10-30 (PROMPT 1 — Documentation Reconciliation)
