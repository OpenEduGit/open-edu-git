# 🌿 GIT-STRATEGY.md — استراتژی گیت OpenEdu Git

> مصوب: ADR-0008 (پذیرفته‌شده؛ اعمال عملی در P2). این سند قرارداد عملیاتی است.

## 1. مدل شاخه‌ها (GitFlow سبک‌تک‌نفره)

```
main      ← پروداکشن/پایدار. فقط از طریق PR ادغام می‌شود.
develop   ← پیش‌فرض کار روزانه در دورهٔ فعال توسعه.
feature/* ← یک قابلیت = یک شاخه (از develop).
fix/*     ← رفع اشکال.
docs/*    ← فقط مستندات.
release/* ← (بعداً) آماده‌سازی نسخه.
hotfix/*  ← رفع فوری روی main.
```

**دلیل GitFlow برای تک‌توسعه‌دهنده:** چرخهٔ «شاخه → PR → مرج (حتی self-review)» نقطهٔ بازبینی می‌سازد و جلوی «main را خسته خراب کردم» را می‌گیرد.

## 2. قالب پیام کامیت (Conventional Commits)

```
<type>(<scope>): <توضیح کوتاه فارسی یا انگلیسی>

[بدنه اختیاری: چرا و چه]
```

انواع مجاز: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

نمونه:
```
feat(wallet): افزودن سقف شارژ ۵ میلیون تومانی
fix(classroom): رفع قطع شدن تخته روی قطع‌ووصل شبکه
docs(adr): ADR-0009 برای انتخاب Meilisearch
```

- Subject ≤ ۷۲ کاراکتر، زمان حال، بدون نقطهٔ پایانی.
- کامیت‌های UUID-مانند (میراث b237c70) دیگر تکرار نمی‌شوند.

## 3. فرایند Pull Request

1. از `develop` شاخه بساز (`feature/xyz`)، کار کن، push کن.
2. PR با قالب:
   - **چه:** خلاصهٔ تغییرات
   - **چرا:** Issue/انگیزه (با `Closes #N`)
   - **چک‌لیست:** lint ✓ / tsc ✓ / دستی تست شد ✓ / docs به‌روز ✓ / secrets ندارم ✓
3. حداقل یک تأیید (فعلاً self-review با تاخیر چندساعته) → squash-merge به `develop`.
4. شاخهٔ feature حذف شود.

## 4. تاکسونومی برچسب Issue

| گروه | برچسب‌ها |
|---|---|
| نوع | `bug`، `feature`، `enhancement`، `question` |
| حوزه | `backend`، `frontend`، `docs`، `classroom`، `design` |
| اولویت | `P0-critical`، `P1-high`، `P2-normal`، `P3-low` |
| جذب | `good first issue`، `help wanted`، `typist-needed` |
| چرخه | `in-progress`، `blocked`، `awaiting-review` |

## 5. فرایند انتشار

1. `release/vX.Y.Z` از `develop` (در صورت نیاز) → تست نهایی.
2. به‌روزرسانی `CHANGELOG.md` (Keep a Changelog) + شمارهٔ نسخه.
3. squash-merge به `main` + تگ: `git tag -a v0.3.0 -m "…"` → push تگ.
4. back-merge به `develop`.

## 6. نسخه‌گذاری (SemVer)

- `MAJOR`: شکستن قرارداد API یا مدل داده
- `MINOR`: فاز/قابلیت جدید (مثل 0.1.0 فاز ۱، 0.2.0 فاز ۲)
- `PATCH`: رفع اشکال

## 7. راه‌اندازی Remote (اجرا در P2)

```bash
git remote add origin git@github.com:OpenEduGit/open-edu-git.git
git push -u origin main develop
# محافظت شاخه‌ها: main و develop فقط با PR
# قالب‌ها: PR template + issue templates (bug/feature) — در P2 اضافه می‌شود
```

وضعیت فعلی: ریموتی وجود ندارد؛ تاریخچهٔ فعلی ۳ کامیت با پیام UUID است که در P2 با «کامیت پایهٔ تمیز» جایگزین/تکمیل می‌شود (ببینید `/tmp/oeg-diag/13-git-plan.md` و ADR-0008).
