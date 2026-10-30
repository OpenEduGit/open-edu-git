# ADR-0008 — GitFlow + Conventional Commits از این پس

- **Status:** ACCEPTED — اعمال عملی در **P2**
- **Date:** 2026-10-30

## Context

وضعیت فعلی ریپو: فقط شاخهٔ `main`، **بدون remote**، ۳ کامیت با پیام UUID بی‌معنی (`f9cdfc5c-…`)، و فایل‌های غیرمنبع (دیتابیس، tool-results، agent-ctx، package-lock.json دوم) در تاریخچه. از این پس تاریخچه باید خوانا و قابل اتکا باشد. گزینه‌ها: GitHub Flow (ساده) یا GitFlow (ساختارمند). با وجود تک‌توسعه‌دهنده بودن، GitFlow سبک ارزش بازبینی خودی دارد.

## Decision

**GitFlow:** `main` (پایدار) + `develop` (پیش‌فرض کار فعال) + `feature/*`, `fix/*`, `docs/*`, `release/*`, `hotfix/*`. پیام کامیت با **Conventional Commits** (`feat(scope): …`). PR برای هر تغییر روی `main`/`develop`. شرح عملیاتی: [docs/GIT-STRATEGY.md](../GIT-STRATEGY.md).

## Consequences

**(+)** تاریخچهٔ قابل‌فهم و ردیابی؛ نقطهٔ بازبینی حتی در self-review («main را خسته خراب نکنم»)؛ آماده بودن برایcontributors آینده؛ تگ‌گذاری SemVer تمیز ([CHANGELOG](../../CHANGELOG.md)).

**(-)** سربار فرایند برای تک‌نفر — توجیه‌پذیر چون `develop` در دورهٔ فعال شاخهٔ روزمره است و PR فقط دو کلیک است.

## Migration plan (P2)

1. به‌روزرسانی `.gitignore` + `git rm --cached` آرتیفکت‌ها (فهرست: `/tmp/oeg-diag/13-git-plan.md`).
2. «کامیت پایهٔ تمیز» فقط منبع (src, prisma/schema+seed, configs, docs).
3. `git remote add origin …` + محافظت شاخه‌ها + قالب‌های Issue/PR.
4. قاعدهٔ ماندگار: از این پس پیام کامیت معنادار — UUIDهای تاریخی در تاریخچه می‌مانند (بازنویسی تاریخچه نیازمند تصمیم جداگانه است).
