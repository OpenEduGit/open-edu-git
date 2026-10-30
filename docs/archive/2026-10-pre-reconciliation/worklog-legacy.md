# OpenEdu Git — Worklog

Project: OpenEdu Git (اُپن‌ای‌دیو گیت) — Phase 1 MVP «کتابخانهٔ جزوه‌ها» (Pamphlet Hub)
A Persian/RTL, GitHub-inspired, collaborative handout platform for Iranian teachers.
Source docs: /home/z/my-project/upload/*.md (README, BRAND, ROADMAP, ARCHITECTURE, DECISIONS, DEVELOPMENT...)

## Global decisions (adapted to sandbox stack)
- Next.js 16 App Router + TypeScript (mandated by sandbox; replaces FastAPI/PostgreSQL stack from DECISIONS.md)
- Prisma ORM + SQLite (replaces PostgreSQL 16; search = LIKE with Persian normalization instead of pg_trgm)
- Auth: email+password, HMAC-signed session token in httpOnly cookie `oeg_session` (replaces JWT lib; scrypt password hashing via node:crypto)
- Pamphlet content: Markdown text stored in DB `PamphletVersion.content` (replaces MinIO file storage); viewer = react-markdown
- UI: single visible route `/` — client-side SPA with hash routing (e.g. `#/pamphlet/{id}`)
- Brand: Primary #DD614C, Secondary #DAA144, Text #111827, Success #16A34A, Warning #D97706, Danger #DC2626. Sharp corners (brutalist, radius=0), Vazirmatn font, RTL-first, JetBrains Mono accents. NO blue/indigo.
- Footer: sticky bottom (min-h-screen flex flex-col + mt-auto)

## Shared types & API contract (v1) — ALL under /api/v1
Auth cookie: `oeg_session` (httpOnly). Response shapes:

```ts
PublicUser { id, fullName, title?, bio?, expertise?, role, createdAt } // never expose email/passwordHash
PamphletSummary { id, title, description?, grade, subject, chapter?, teachingMethod, difficulty,
  viewCount, ratingAvg (float 0-5), ratingCount, versionCount, forkCount,
  forkedFromId?, forkedFromTitle?, author:{id,fullName,title?}, createdAt, updatedAt }
VersionSummary { id, versionNumber, changeSummary?, createdAt, createdBy:{id,fullName} }
Contributor { userId, fullName, score, percentage (int, sums to 100), isAuthor }
ReviewItem { id, rating, comment, helpful, unhelpful, createdAt, user:{id,fullName,title?}, myVote? (1|-1|0) }
PamphletDetail extends PamphletSummary { content (latest version markdown), latestVersionNumber,
  versions: VersionSummary[], contributors: Contributor[], openMergeRequestCount, isMine, myReview? }
MergeRequestItem { id, title, description?, status: 'OPEN'|'APPROVED'|'REJECTED'|'MERGED',
  source:{id,title}, target:{id,title}, createdBy:{id,fullName},
  reviewedBy?|null, reviewedAt?|null, createdAt, updatedAt }
MRDetail extends MergeRequestItem { sourceContent, targetContent,
  diff: { added: string[], removed: string[], addedCount, removedCount }, canReview (bool) }
Stats { pamphlets, teachers, versions, reviews, forks, mergeRequests, mergedCount }
```

Endpoints:
- POST /api/v1/auth/register {email,password,fullName,role?} → {user} (400/409)
- POST /api/v1/auth/login {email,password} → {user} (401)
- POST /api/v1/auth/logout → {ok:true}
- GET  /api/v1/auth/me → {user} (401)
- GET  /api/v1/pamphlets?query&grade&subject&method&difficulty&sort=newest|top|popular&page=1&pageSize=12 → {items,total,page,pageSize}
- POST /api/v1/pamphlets {title,description?,grade,subject,chapter?,teachingMethod,difficulty,content} → {id} (auth)
- GET  /api/v1/pamphlets/[id] → PamphletDetail (increments viewCount; 404)
- POST /api/v1/pamphlets/[id]/versions {content,changeSummary?} → {versionNumber} (auth, author only)
- POST /api/v1/pamphlets/[id]/fork → {id} (auth, not own)
- GET  /api/v1/pamphlets/[id]/reviews → {items:ReviewItem[]}
- POST /api/v1/pamphlets/[id]/reviews {rating,comment} → {review} (auth, upsert per user)
- POST /api/v1/reviews/[id]/vote {value:1|-1|0} → {helpful,unhelpful,myVote} (auth)
- GET  /api/v1/merge-requests?status&targetId&sourceId → {items}
- GET  /api/v1/merge-requests/[id] → MRDetail
- POST /api/v1/merge-requests {sourceId,targetId,title,description?} → {id} (auth, owns source, source.forkedFromId===targetId)
- POST /api/v1/merge-requests/[id]/review {action:"approve"|"reject"} → {status} (auth, owns target; approve → new merged version on target + contributions += diff.addedCount)
- GET  /api/v1/users/[id] → {user, pamphlets: PamphletSummary[], stats:{pamphletCount,mergedCount,avgRating,linesContributed}}
- PATCH /api/v1/users/me {fullName?,title?,bio?,expertise?} → {user} (auth)
- GET  /api/v1/stats → Stats
- GET  /api/v1/users/top → {items:[{id,fullName,title?,expertise?,pamphletCount,mergedCount,avgRating}]}

## Contribution model (intellectual property %)
- On pamphlet create: author Contribution.score = max(non-empty lines of content, 10)
- On own new version: author score += added non-empty lines
- On MR approve (merge): source owner score += max(diff.addedCount, 1) on TARGET pamphlet
- percentage = round(score/total*100), adjusted so sum === 100

## Files ownership map
- src/lib/constants.ts, types.ts, diff.ts, format.ts, server/auth.ts — shared (Task 1, done by lead)
- src/app/api/** — Task 2-a (backend agent)
- src/app/page.tsx, src/components/edu/**, src/lib/client.ts — Task 2-b (frontend agent)
- src/app/layout.tsx, globals.css — Task 1 (lead) — DO NOT modify in 2-a/2-b

---

---
Task ID: 1
Agent: lead (Z.ai Code)
Task: Foundation — Prisma schema, shared libs, brand styling, seed data

Work Log:
- Read all upload/*.md docs; defined MVP scope (Phase 1 Pamphlet Hub) adapted to sandbox stack
- prisma/schema.prisma: User, Pamphlet (fork lineage self-relation), PamphletVersion, Review (+helpfulBase/unhelpfulBase denormalized seed counters), ReviewVote, MergeRequest, Contribution — pushed to SQLite (db/custom.db)
- src/lib/constants.ts: GRADES/SUBJECTS/TEACHING_METHODS/DIFFICULTIES/ROLES (Persian), badge style maps, session cookie constants
- src/lib/types.ts: full shared API types (PublicUser, PamphletSummary/Detail, ReviewItem, MergeRequestItem/MRDetail, Stats, UserProfile, TopTeacher)
- src/lib/diff.ts: LCS lineDiff() + computePercentages() (sums to 100) + countContentLines()
- src/lib/format.ts: toFaDigits, faNumber, faDate (Jalali via Intl fa-IR), faRelative, normalizePersian (unify ی/ک, strip ZWNJ/diacritics, digit fold) — CLIENT-SAFE
- src/lib/server/auth.ts: scrypt hash/verify, HMAC session token, cookie set/clear, getCurrentUser(), toPublicUser()
- src/lib/db.ts: log level reduced to errors only
- src/app/layout.tsx: lang="fa" dir="rtl", Vazirmatn + JetBrains_Mono + Darker_Grotesque fonts, Persian metadata
- src/app/globals.css: brand tokens (#DD614C primary, #DAA144 gold, #16A34A/#D97706/#DC2626, #111827 ink), radius=0 (brutalist sharp), .oeg-markdown RTL styles, .oeg-diff-add/del, .oeg-hard-shadow, .oeg-grid-bg, .oeg-mono, custom scrollbar .oeg-scroll
- prisma/seed.ts + ran: 7 users (password 123456), 14 pamphlets (real Persian markdown content incl. LaTeX-ish $ math), 16 versions, 12 reviews (with helpfulBase counts), 3 MRs (1 MERGED with contribution %, 1 OPEN, 1 REJECTED), fork lineage (مشتق → نسخهٔ بهبودیافته by علی رضایی)

Stage Summary:
- DB ready and seeded. Demo logins: montajebii@openedu.ir / ali.rezaei@openedu.ir / z.ahmadi@openedu.ir / s.mohammadi@openedu.ir / m.karimi@openedu.ir / f.hosseini@openedu.ir / hossein@openedu.ir — ALL with password: 123456
- IMPORTANT for Task 2-a: Review helpful/unhelpful = helpfulBase + count(ReviewVote.value=1|-1) for that review; myVote from ReviewVote of current user
- IMPORTANT for Task 2-a: pamphlet ratingAvg = avg(Review.rating) (0 if none); versionCount = count versions; forkCount = count pamphlets where forkedFromId = id
- CONTRIBUTION RULES: create → author score = max(countContentLines(content),10); own new version → author score += lineDiff(prev, new).addedCount; MR approve → source author score += max(diff.addedCount,1) on target pamphlet (upsert Contribution)
- Do NOT touch: src/app/layout.tsx, src/app/globals.css, src/lib/server/auth.ts (stable)

---
Task ID: 2-a
Agent: backend (Z.ai Code)
Task: All /api/v1 route handlers — auth, pamphlets, versions, forks, reviews+votes, merge requests, users, stats

Work Log:
- Created src/lib/server/http.ts (ok/fail/readJson/requireUser/oneOf/asString/unauthorized) and src/lib/server/serializers.ts (toPamphletSummary, toMRItem, toReviewItem with helpfulBase+live votes, buildContributors via computePercentages, shared Prisma includes)
- Auth: POST register (email regex, pw ≥6, fullName 2..80, role ∈ ROLES default «معلم», 409 «این ایمیل قبلاً ثبت شده است», scrypt + session cookie), POST login (401 «ایمیل یا رمز عبور اشتباه است»), POST logout, GET me (401 «وارد نشده‌اید»)
- GET /pamphlets: Persian-normalized search (normalizePersian both sides; title/description/subject/chapter/latest version content; fetch + JS filter since Prisma can't), exact filters grade/subject/method/difficulty, sort newest(updatedAt desc)/top(ratingAvg desc, ties ratingCount)/popular(viewCount desc), page default 1, pageSize default 12 max 48
- POST /pamphlets: full validation vs constants; nested create pamphlet + v1 (changeSummary «انتشار نسخهٔ اول») + Contribution max(countContentLines,10) → {id}
- GET /pamphlets/[id]: PamphletDetail — fire-and-forget viewCount increment, versions desc with createdBy, contributors (percentages sum 100, isAuthor, percentage desc), openMergeRequestCount (OPEN, targetId), isMine, myReview; 404 «جزوه پیدا نشد»
- POST /pamphlets/[id]/versions: author-only 403 «فقط نویسندهٔ جزوه می‌تواند نسخهٔ جدید منتشر کند», version N+1, Contribution += lineDiff(prev,new).addedCount (upsert), pamphlet.updatedAt touched
- POST /pamphlets/[id]/fork: 403 own, fork-of-fork / «(فورک)»/«(نسخهٔ بهبودیافته)»-suffixed titles kept as-is else + « (فورک)», desc «فورکی از «TITLE»», copies taxonomy + latest content v1 «فورک از جزوهٔ اصلی», Contribution for forker
- Reviews: GET newest-first (myVote when logged in), POST upsert per user (rating int 1..5, comment 2..1000); POST /reviews/[id]/vote value 1|-1|0 (0 = delete) → {helpful, unhelpful, myVote} incl. seed bases
- MRs: GET list (status/targetId/sourceId filters, newest first, source/target/createdBy/reviewedBy); GET [id] → MRDetail with sourceContent/targetContent/diff lineDiff(target,source)/canReview; POST (owns source 403, source.forkedFromId===targetId 400 «پیشنهاد ادغام فقط از جزوهٔ فورک‌شده به جزوهٔ اصلی امکان‌پذیر است», dup OPEN 409 «یک پیشنهاد ادغام باز برای این دو جزوه وجود دارد»); POST [id]/review approve|reject — target-author-only 403 «فقط نویسندهٔ جزوهٔ اصلی می‌تواند تصمیم بگیرد», must be OPEN 400; approve creates target version (content = source latest, changeSummary «ادغام پیشنهاد «TITLE»», createdBy = source author), Contribution upsert score += max(diff.addedCount,1)
- Users: GET [id] (profile + pamphlets updatedAt desc + stats pamphletCount/mergedCount/avgRating/linesContributed/reviewCount), PATCH me (fullName 2..80, title ≤40, bio ≤600, expertise ≤200), GET top (6, pamphletCount desc then mergedCount); GET /stats (teachers = role «معلم»)
- Fixed a NaN→null JSON bug in toPamphletSummary (reduce over already-mapped numbers)
- Tested EVERY endpoint with curl incl. full flows: register/login/logout/me, search w/ Arabic ي + digit folding, create→version→fork→MR→approve (contributors 93%/7%) and reject; seeded OPEN MR (سلول) approved as f.hosseini → +9 for حسین (69%/31%); re-ran bun prisma/seed.ts afterwards → stats back to 14/6/16/12/3/3/1 pristine
- bun run lint clean; dev.log free of runtime errors

Stage Summary:
- Full REST API live under /api/v1 (19 route files + 2 server lib files). All Persian error messages. Ready for Task 2-b frontend consumption.
- Notes for frontend: 201 on create POSTs (treat any 2xx as ok); user avgRating = mean of per-pamphlet ratingAvg (0 for unrated); GET list also accepts teachingMethod as alias of method param; myVote omitted when logged out; user pamphlets sorted by updatedAt desc.

---
Task ID: 2-b
Agent: frontend
Task: Phase-1 MVP frontend — single-route SPA (hash routing), all views, auth, brutalist RTL UI

Work Log:
- src/lib/client.ts: `api<T>()` fetch helper (same-origin /api/v1, JSON bodies, Persian error messages from {error} or per-status fallback, network-failure message). ApiError with status.
- src/components/edu/router.ts: hash router — parseHash/homeHash/navigate + `useHashRoute()` (server-safe initial state = Home → zero hydration mismatch; hashchange listener). Routes: #/ , #/pamphlet/{id} , #/create , #/edit/{id} , #/requests , #/request/{id} , #/user/{id} , #/profile. Home filters/search/pagination/sort live in the hash query (URLSearchParams; defaults omitted).
- src/components/edu/store.ts: zustand global state — {user, sessionLoaded, authOpen, authHint} + refreshSession() (GET /auth/me on app mount; 401 → anonymous).
- src/components/edu/hooks.ts: `useFetch` (loading/error/retry/setData; derived-state design — no setState-in-effect, request-key based, `enabled` flag for lazy tabs) + `useDebounced` (300ms).
- src/components/edu/bits.tsx: InitialsAvatar + initialsOf (Persian «م م»), LogoMark (inline SVG git-branch mark, brand/gold nodes), ErrorBox (retry), EmptyBox, InfoNote (gold), AuthRequiredBox, SkeletonCards, PageSkeleton, Spinner, MRStatusBadge.
- rating-stars.tsx: display mode (gold fill, rounded half-star approx, aria-label امتیاز) + input mode (hover/click radiogroup 1–5, keyboard accessible).
- markdown-viewer.tsx: react-markdown + remark-math + rehype-katex + katex CSS import (verified KaTeX renders live in browser), dir=rtl .oeg-markdown wrapper, loading skeleton.
- content-editor.tsx: shared Markdown textarea + ویرایش/پیش‌نمایش toggle + markdown/math helper text (used by create step-2 and edit view).
- auth-dialog.tsx: Tabs ورود/ثبت‌نام, inline Persian validation, role select (ROLES), CC BY-SA 4.0 note, gold demo-account hint (montajebii@openedu.ir / 123456); success → setUser + toast «خوش آمدید …».
- navbar.tsx: sticky top, border-b-2 ink, logo+wordmark, desktop search (submits → home ?q=), nav links (جزوه‌ها، درخواست‌های ادغام), بارگذاری جزوه CTA (auth-gated with Persian hint), user dropdown (initials avatar, پروفایل من، خروج) / ورود|ثبت‌نام, mobile hamburger → Sheet drawer (search + links + معلم‌های برتر scroll-to + auth actions).
- footer.tsx: mt-auto sticky-bottom ink footer — mission line, quick links, licenses (کد AGPLv3 — محتوا CC BY-SA 4.0), gold slogan quote «تنها راه رسیدن به بهترین جزوه…», pb-[env(safe-area-inset-bottom)].
- pamphlet-card.tsx: border-2 ink card, hover border-primary + translate + hard shadow, method/difficulty style badges, فورک از chip, 2-line clamps, initials author row, footer stats (stars+faRating+faNumber count, Eye, GitFork, History — all Persian digits).
- home-view.tsx: hero (oeg-grid-bg, overline, huge headline, big search, CTA row w/ oeg-hard-shadow) + ink stats strip (4 cells, mono faNumber, dash on API failure) + browse section (desktop 260px sticky filter aside / mobile «فیلترها» Sheet with count badge + مشاهدهٔ نتایج) — filters: پایه/درس/روش/سطح/مرتب‌سازی + removable active-filter chips + حذف فیلترها; debounced search (render-time adopt pattern + lastPushed guard so external URL changes are adopted but self-pushed changes never wipe typing — lint-clean under react-hooks/set-state-in-* rules); skeleton grid / ErrorBox retry / per-empty-state; numbered pagination (window, faNumber); چطور کار می‌کند (4 steps, hover translate) + معلم‌های برتر (horizontal snap-scroll cards from /users/top, hidden on failure).
- pamphlet-view.tsx: back link, gold fork-lineage banner, title/author link/meta badges/stats row (incl. open-MR gold chip), actions (فورک → POST fork → toast → #/edit/{newId}; ویرایش و نسخهٔ جدید if isMine; پیشنهاد ادغام dialog if isMine && forkedFromId → POST merge-requests → #/request/{id}; login hint if anonymous), GitHub-style tabs: محتوا (MarkdownViewer), تاریخچه (versions list, vN chips, .oeg-scroll max-h-96), مشارکت‌کنندگان (animated percentage bars — runtime width style commented, مؤلف اصلی badge, جمع: ۱۰۰٪), بازخوردها (my-review upsert form w/ star input + list w/ helpful/unhelpful vote buttons, myVote highlighted, optimistic setData, refetch after login), درخواست‌های ادغام (lazy fetch ?targetId=, status badges).
- create-view.tsx: auth-gated 3-step wizard (progress stepper with checkmarks) — مشخصات (validated selects w/ Persian errors), محتوا (ContentEditor + live preview), بازبینی (summary dl + preview) → POST /pamphlets → toast «جزوه شما منتشر شد! نامتان برای همیشه کنارش می‌ماند.» → detail.
- edit-view.tsx: author-only (isMine guard → error toast + redirect), loads current content once, ContentEditor + «خلاصهٔ تغییرات این نسخه» (commit-message-like) → POST versions → toast «نسخهٔ N ثبت شد» → detail.
- requests-view.tsx: status tabs (همه/باز/ادغام‌شده/ردشده) → filtered list cards with MRStatusBadge, «از: source ← به: target» (ArrowLeft icon, RTL-correct), per-tab empty states.
- request-detail-view.tsx: meta card (source/target/creator/reviewer links + faRelative/faDate), +N/−N stats, diff card (.oeg-diff-del/.oeg-diff-add line lists, whitespace-pre-wrap dir=auto, empty-diff InfoNote), canReview && OPEN → «تأیید و ادغام» (success bg + AlertDialog w/ سهم ثبت می‌شود copy) / «رد کردن» (danger outline + AlertDialog) → POST review → toast + refetch; creator hint «در انتظار بررسی نویسندهٔ جزوهٔ اصلی…».
- profile-view.tsx: header card (big gold initials avatar, role badge, bio, expertise chips, عضو از: faDate), 4-cell stats (جزوه/ادغام/میانگین امتیاز/سطر مشارکت), pamphlets grid; #/profile → isMe + ویرایش پروفایل dialog (fullName/title/bio/expertise) → PATCH /users/me → setUser + refetch.
- src/app/page.tsx: 'use client' SPA shell — min-h-screen flex-col root, Navbar, main route switch (views keyed by id), SiteFooter (mt-auto), AuthDialog; session bootstrap on mount; scroll-to-top on route change (home → scrolls to #browse on pagination).
- E2E verified in headless browser against live backend (2-a was done by the time I tested): home render + stats + filters + debounced search + chips + pagination, pamphlet detail all 5 tabs, KaTeX math, login dialog, review post → editable upsert, vote buttons, MR list + diff + meta, create wizard full publish (test pamphlet deleted from DB afterward via prisma cleanup), edit view + preview, profile, mobile drawer + filters Sheet, radius=0/RTL/footer confirmed. Console fully clean (fixed a div-in-p hydration warning + missing Sheet Description warnings).

Stage Summary:
- 19 frontend files: src/app/page.tsx, src/lib/client.ts, src/components/edu/{router,store,hooks,bits,rating-stars,markdown-viewer,content-editor,auth-dialog,navbar,footer,pamphlet-card,home-view,pamphlet-view,create-view,edit-view,requests-view,request-detail-view,profile-view}.tsx — ~4200 lines.
- `bun run lint` clean. tsc: no errors in frontend files (pre-existing errors in prisma/seed.ts + src/lib/diff.ts belong to Task 1).
- State: zustand (session/auth-dialog) + local useState per view + useFetch hook; NO server actions, all via /api/v1 fetch.
- Deviations: (1) content Textarea uses Vazirmatn (default) instead of mono — Persian monospace fallback renders poorly; (2) search input state adopts URL q via render-time adjust pattern + debounce-pending guard (react-hooks v6 lint-compliant); (3) «معلم‌ها» nav link = home + smooth-scroll to #top-teachers.
- Note for lead: dev DB has one extra review by محمدرضا منتجبی on «مشتق و کاربردهای آن — از صفر تا صد» (natural Persian text, from E2E test — kept, looks like seed data).

---
Task ID: 3 + 4
Agent: lead (Z.ai Code)
Task: Integration, end-to-end browser verification, and polish

Work Log:
- Merged both agents' work (no conflicts — file ownership respected); lint fully clean
- Fixed seed title English placeholder: «شیمی آلی: recognizing...» → «شیمی آلی: شناخت گروه‌های عاملی» (BRAND.md anti-pattern) + re-seeded
- Fixed real bug found in browser testing: RequestDetailView did not refetch after login/logout (canReview stale) → added user?.id to useFetch deps (same pattern as pamphlet-view)
- Verified with VLM on screenshots: home (RTL, brand palette, brutalist, no defects), math page (KaTeX formulas render, no raw $ code), mobile 390px (clean layout, no overflow, hamburger menu) — all confirmed production-quality
- Agent Browser E2E golden paths ALL PASS (in fresh tab — note: old headless tab had stuck input pipeline, an environment quirk, not an app bug):
  * Home: hero, stats strip, 14 seeded pamphlets, filters, pagination, search (URL-encoded q + result filtering), how-it-works, top teachers
  * Pamphlet detail: markdown + KaTeX content, versions history (۳), contributors % bars (۸۸٪/۱۲٪ sums ۱۰۰٪), reviews with helpful counts, fork lineage banner
  * Auth: login montajebii@openedu.ir + f.hosseini@openedu.ir (password 123456), logout, session menu
  * Fork flow: fork سلول pamphlet → auto-redirect to edit → publish new version → MR dialog → MR created → diff view (+۳ lines green) → approve as target owner → MR MERGED, new version on target «ادغام پیشنهاد ...», contributions updated (فاطمه=۲۰، محمدرضا=۳)
  * Review flow: posted ۴★ review (upsert, shows as editable), helpful vote (۸→۹)
  * Create flow: full 3-step wizard → published «تصادف و احتمال» pamphlet with math content
  * Profile: stats, expertise chips, own pamphlets, edit button
  * Requests list: status tabs (همه/باز/ادغام‌شده/ردشده)
  * Responsive: mobile 390px no h-scroll, sticky footer structure verified (min-h-screen flex flex-col + mt-auto + safe-area), long-page push behavior correct
- Restored pristine seed state after testing (7 users, 14 pamphlets, 16 versions, 12 reviews, 3 MRs: 1 OPEN / 1 MERGED / 1 REJECTED)
- dev.log clean (only transient mid-development SheetDescription errors, long fixed)

Stage Summary:
- PROJECT COMPLETE & BROWSER-VERIFIED. OpenEdu Git Phase-1 MVP live on port 3000.
- Demo accounts (password 123456): montajebii@openedu.ir (محمدرضا، founder), ali.rezaei, z.ahmadi, s.mohammadi, m.karimi, f.hosseini, hossein — all @openedu.ir
- Remaining known gaps (future phases per ROADMAP.md): file upload (PDF/LaTeX → MinIO), full-text search engine (Meilisearch), payments/classes (Phase 2), exam builder (Phase 3), AI assistant (Phase 4)

---
Task ID: 5
Agent: lead (Z.ai Code)
Task: Phase 2 foundation — «بازارچهٔ تدریس» schema, shared types/constants, seed data, assets, SPA skeleton

Work Log:
- Read ROADMAP Phase 2 (کلاس آنلاین + فروش دوره) and adapted to sandbox: mock Zarinpal-style gateway (no real Shaparak), socket.io classroom (no WebRTC video — sandbox has single-port gateway), local sample MP4s (no CDN)
- prisma/schema.prisma: added Wallet, Txn, TeacherSlot, ClassSession, SessionMessage, SessionReview, VideoCourse, VideoLesson, CourseEnrollment, CourseReview, LessonProgress + User back-relations — pushed to SQLite
- src/lib/types.ts: Phase 2 section — TxnType/TxnItem, WalletResponse, SlotItem/MySlotItem, SessionItem/SessionDetail/SessionMessageItem/SessionReviewItem, JoinTicketResponse, MarketTeacher, CourseCard/CourseDetail/LessonItem/CourseReviewItem, EnrolledCourse, UserProfileTeach
- src/lib/constants.ts: PLATFORM_COMMISSION_PERCENT=20, TXN_LABELS/TXN_STYLES, SESSION_STATUS_LABELS/STYLES, SLOT_STATUS_LABELS, COURSE_SORT_OPTIONS, MARKET_SORT_OPTIONS, WALLET_MIN/MAX_DEPOSIT, WALLET_MIN_WITHDRAW, SLOT_MIN/MAX_PRICE, SLOT_DURATIONS, SESSION_CANCEL_FULL_REFUND_HOURS=2
- src/lib/format.ts: NEW faDateTime, faTime, faDayLabel (weekday+Jalali month-day), faToman (۱۲۵٬۰۰۰ تومان / رایگان), faSignedAmount, faDuration — all client-safe
- bun add socket.io-client@4.8.4 (main app)
- Assets: public/videos/lesson-{calculus,statistics,science,literature,geometry}.mp4 (local sample MP4s ~1-2MB each — reliable, no external CDN); public/courses/cover-{calculus,statistics,science,literature,geometry}.png (AI-generated flat illustrations, brand terracotta/gold on cream, 1344x768, no text)
- prisma/seed.ts extended + re-ran: wallets for all 7 users with chronological Txn chains (verified wallet.balance === last txn.balanceAfter for every user), 29 OPEN future slots (6 teachers, Tehran afternoons next 14d), 3 sessions (COMPLETED zahra↔hossein 6d ago w/ 4 messages + 5★ review; CANCELLED_STUDENT ali↔hossein refunded; BOOKED mohammad↔hossein TOMORROW 19:00 Tehran = classroom demo), 5 video courses (23 lessons, first lesson of each isFreePreview), 6 enrollments (paid: hossein→course1+course4, sara→course2, fateme→course1; free: sara+fateme→course5), 6 course reviews, lesson progress rows
- router.ts: new routes #/market (ListParams), #/book/{id}, #/sessions, #/session/{id}, #/courses (ListParams), #/course/{id}, #/learn, #/learn/{id}, #/teach, #/wallet + listHash() helper (like homeHash for courses/market filters)
- page.tsx: dispatches all new routes; sessions/learn/wallet views auth-gated with AuthRequiredBox; imports default exports from 10 new placeholder view files
- Created placeholder views (frontend agent 6-b replaces them): market-view, book-view, sessions-view, classroom-view, courses-view, course-view, learn-view, learn-player-view, teach-view, wallet-view — ALL default exports: MarketView, BookView, SessionsView, ClassroomView, CoursesView, CourseView, LearnView, LearnPlayerView, TeachView, WalletView
- navbar.tsx: desktop nav جزوه‌ها|دوره‌ها|بازارچهٔ تدریس|درخواست‌های ادغام; user dropdown + mobile drawer gain کیف پول/کلاس‌های من/یادگیری من/پنل تدریس; footer quick-links updated
- bun run lint clean; dev server healthy

Stage Summary:
- DB seeded & verified. Demo logins (password 123456): montajebii@openedu.ir (معلم حسابان — slots + 2 دوره + پنل تدریس), hossein@openedu.ir (دانش‌آموز — کیف پول ۵۹۰٬۰۰۰، جلسهٔ فردا ۱۹:۰۰ با منتجبی، ۲ دورهٔ خریده). Others: ali.rezaei / z.ahmadi / s.mohammadi / m.karimi / f.hosseini (all معلم, all have OPEN slots)
- Seed state: 7 users, 14 pamphlets, 29 open slots, 3 sessions (1 BOOKED upcoming MT4G8S), 5 courses, 6 enrollments, 22 txns, wallets: mohammad 1,108,000 / zahra 1,072,000 / fateme 1,620,000 / ali 500,000 / mehdi 476,000 / sara 250,000 / hossein 590,000
- FILE OWNERSHIP: Task 6-a owns src/app/api/v1/{wallet,slots,sessions,market,courses,learn,lessons}/**, src/lib/server/serializers.ts (append), mini-services/classroom-service/**. Task 6-b owns the 10 placeholder view files + new src/components/edu/use-classroom.ts + may edit home-view.tsx (Phase-2 promo band) and profile-view.tsx (teach section). NEITHER touches: schema.prisma (ask lead), types.ts/constants.ts/format.ts (already final — if a type is missing, note it in worklog instead of editing), layout.tsx, globals.css, page.tsx, router.ts, navbar.tsx, footer.tsx, auth-dialog.tsx, store.ts, client.ts, hooks.ts, bits.tsx (bits.tsx: 6-b may APPEND new shared components at the end if truly needed)
- FULL API CONTRACT v2 follows (below) — binding for both agents

## Phase 2 API contract (v2) — all under /api/v1, cookie oeg_session

### Wallet
- GET /wallet (auth) → WalletResponse { balance, transactions: TxnItem[] } (txns = last 50 desc; create wallet row lazily on first access if missing, balance 0)
- POST /wallet/deposit { amount } (auth) → 201 { authority, amount } — amount int, WALLET_MIN_DEPOSIT..WALLET_MAX_DEPOSIT, multiple of 1,000. Creates Txn type DEPOSIT status PENDING amount=+amount balanceAfter=current, description «شارژ کیف پول از درگاه بانکی», authority = random 36-char alnum (unique). Error: «مبلغ باید بین ۱۰,۰۰۰ تا ۵,۰۰۰,۰۰۰ تومان و مضرب ۱,۰۰۰ باشد»
- POST /wallet/deposit/verify { authority, result: "success"|"fail" } (auth; authority must belong to user & PENDING) → success: txn→SUCCESS, wallet.balance+=amount, update balanceAfter → { balance }; fail: txn→FAILED → { balance }. Error 404 «تراکنش پرداخت پیدا نشد»
- POST /wallet/withdraw { amount } (auth) → { balance } — amount ≥ WALLET_MIN_WITHDRAW, ≤ balance. Txn WITHDRAW −amount SUCCESS, wallet.balance−=amount. Errors: «حداقل مبلغ برداشت ۵۰,۰۰۰ تومان است» / «موجودی کافی نیست»

### Marketplace
- GET /market/teachers?query&sort=rating|price_asc|price_desc|sessions (default rating) → { items: MarketTeacher[] } — ONLY users with ≥1 OPEN slot with startAt > now. query: normalizePersian match on fullName/expertise/bio. openSlotCount = future OPEN slots; minPrice = min of those; sessionCount = taught COMPLETED sessions; avgSessionRating = avg of SessionReview.rating on taught COMPLETED sessions (0 if none); pamphletCount = authored pamphlets. Sort: rating = avgSessionRating desc then sessionCount desc; price_asc/desc = minPrice asc/desc; sessions = sessionCount desc

### Slots
- GET /teachers/[id]/slots (public) → { items: SlotItem[] } — this teacher's OPEN slots with startAt > now, startAt asc. 404 «کاربر پیدا نشد»
- GET /slots/mine (auth) → { items: MySlotItem[] } — ALL my future slots (OPEN+BOOKED) + past BOOKED, startAt asc; BOOKED ones include session { id, student:{id,fullName}, topic }
- POST /slots (auth) { slots: [{ startAt: ISO string, durationMinutes?, price }] } (accept single object too) → 201 { created: n } — per slot: startAt ≥ now+60min («زمان شروع باید دست‌کم یک ساعت بعد از اکنون باشد»), durationMinutes ∈ SLOT_DURATIONS (default 60), price SLOT_MIN_PRICE..SLOT_MAX_PRICE multiple of 5,000 («نرخ هر جلسه باید بین ۲۰,۰۰۰ تا ۲,۰۰۰,۰۰۰ تومان و مضرب ۵,۰۰۰ باشد»), no overlap with own slots (±15min tolerance) («این زمان با اسلات دیگری شما هم‌پوشانی دارد»). Max 20 per call
- DELETE /slots/[id] (auth, own slot, status OPEN, future) → { ok: true } — errors: «این اسلات قابل حذف نیست» (BOOKED/past), 404

### Sessions
- POST /sessions { slotId, topic? } (auth = student) → 201 { id } — slot must exist, be OPEN, future, NOT mine («نمی‌توانید اسلات خودتان را رزرو کنید»), topic ≤ 120 chars. Wallet upsert; balance ≥ price else 402 «موجودی کیف پول کافی نیست؛ ابتدا کیف پول را شارژ کنید». ATOMIC $transaction: [slot update status→BOOKED (guard OPEN), create ClassSession {startAt=slot.startAt, endAt=+duration, durationMinutes, price, teacherShare=80%, commission=20%, meetingCode=6-char uppercase alnum (unskewed alphabet, retry on collision), status BOOKED}, student Txn SESSION_PAYMENT −price, wallet.balance−=price]. Description: «رزرو جلسهٔ «topic||جلسهٔ تدریس» با «teacher name»». 409 if slot got booked concurrently («این اسلات همین حالا رزرو شد»)
- GET /sessions?role=student|teacher|all(default all)&status=upcoming|past|all(default all)&page=1&pageSize=20 (auth) → { items: SessionItem[], total } — mine as teacher OR student; upcoming = startAt ≥ now, past = startAt < now; order upcoming asc / past desc (when mixed default: startAt desc). myRole/canJoin(=BOOKED)/hasReview computed per viewer
- GET /sessions/[id] (auth, member only 403 «فقط شرکت‌کنندگان این جلسه دسترسی دارند») → SessionDetail (+ last 100 messages asc, myReview if student)
- POST /sessions/[id]/cancel (auth, member, status BOOKED) → { status } — student cancels: if startAt−now ≥ 2h → full SESSION_REFUND +price to student, status CANCELLED_STUDENT; else 50% refund + 50% SESSION_EARNING to teacher (description «غرامت لغو جلسهٔ دیرهنگام»), status CANCELLED_STUDENT. Teacher cancels: full refund to student, status CANCELLED_TEACHER. Slot back to OPEN only if future. Errors: «این جلسه قابل لغو نیست»
- POST /sessions/[id]/complete (auth = teacher only 403 «فقط معلم می‌تواند جلسه را پایان دهد», status BOOKED) → { status: "COMPLETED" } — releases escrow: teacher Txn SESSION_EARNING +teacherShare (description «درآمد برگزاری جلسهٔ «topic» (کمیسیون پلتفرم: X تومان)»), teacher wallet += teacherShare, endAt=now
- POST /sessions/[id]/review { rating 1..5, comment 2..1000 } (auth = student, status COMPLETED, upsert) → { review: SessionReviewItem }
- GET /sessions/[id]/join (auth, member, status BOOKED «جلسه در دسترس نیست») → JoinTicketResponse { ticket, meetingCode, room:"session:{id}", role, me } — ticket = base64url(JSON {uid,sid,role,name,exp:now+6h}) + "." + HMAC-SHA256 base64url, SECRET = process.env.AUTH_SECRET || "openedu-git-dev-secret-change-in-production" (same as src/lib/server/auth.ts — EXPORT a shared signTicket/verifyTicket helper from src/lib/server/auth.ts so 6-a reuses it)
- POST /sessions/[id]/messages { body 1..1000 } (auth, member) → 201 { message: SessionMessageItem } — persists; client relays via socket after this returns

### Courses
- GET /courses?query&grade&subject&sort=newest|top|popular|price_asc|price_desc&page=1&pageSize=12 (PUBLISHED only) → CourseListResponse — query: normalizePersian title/description/teacher name; top = ratingAvg desc; popular = studentCount desc. CourseCard: ratingAvg = avg reviews round1, studentCount = enrollments, lessonCount, totalMinutes = sum durations
- POST /courses (auth) { title 3..120, description? ≤2000, grade ∈ GRADES, subject ∈ SUBJECTS, level? ∈ DIFFICULTIES, price 0..5,000,000 multiple of 10,000, lessons: [{title 2..120, videoUrl (http(s):// or /path, ≤500), description? ≤1000, durationMinutes? 1..600, isFreePreview?}] 1..40 items, status? "DRAFT"|"PUBLISHED" default PUBLISHED } → 201 { id } — order = 1..n. Error examples: «عنوان دوره باید بین ۳ تا ۱۲۰ نویسه باشد»، «قیمت باید حداکثر ۵,۰۰۰,۰۰۰ تومان و مضرب ۱۰,۰۰۰ باشد»، «هر دوره دست‌کم یک درس needs»→«هر دوره باید دست‌کم یک درس داشته باشد»
- GET /courses/mine (auth) → { items: (CourseCard & { status, salesCount })[] } — all my courses incl DRAFT, newest first
- GET /courses/[id] (public) → CourseDetail — locked per viewer: videoUrl INCLUDED only when (lesson.isFreePreview || viewer enrolled || viewer is owner). enrolled = CourseEnrollment exists for viewer. canReview = enrolled && !isMine. myReview. salesCount only when isMine. 404 «دوره پیدا نشد» (and hide DRAFT from non-owners 404)
- PATCH /courses/[id] (auth, owner) { title?, description?, grade?, subject?, level?, price?, status? } → { ok } — same validations
- POST /courses/[id]/lessons (auth, owner) { title, videoUrl, description?, durationMinutes?, isFreePreview? } → 201 { id, order } — appends at end
- DELETE /courses/[id]/lessons/[lessonId] (auth, owner) → { ok } — deletes + reorders remaining 1..n (also cascades LessonProgress). Error if it's the last lesson: «دوره باید دست‌کم یک درس داشته باشد»
- POST /courses/[id]/purchase (auth, not owner 403 «این دورهٔ خودتان است», not enrolled 409 «شما قبلاً این دوره را خریده‌اید») → 201 { ok } — price 0: direct enroll. Else balance check 402 «موجودی کیف پول کافی نیست؛ ابتدا کیف پول را شارژ کنید». $transaction: enrollment create (price), student Txn COURSE_PURCHASE −price, teacher Txn COURSE_EARNING +80% (if price>0), wallets updated
- POST /courses/[id]/reviews { rating 1..5, comment 2..1000 } (auth, enrolled && !owner, upsert) → { review: CourseReviewItem }
- GET /learn (auth) → { items: EnrolledCourse[] } — my enrollments desc; watchedLessons = count LessonProgress watched=true; progressPercent = round(watched/total*100); nextLessonId = first unwatched lesson id (or last if all watched)
- POST /lessons/[id]/watched { watched: boolean } (auth, enrolled in that lesson's course) → { progressPercent } — upsert LessonProgress

### Profile + stats extensions (modify EXISTING routes)
- GET /users/[id]: ADD to response { teach: UserProfileTeach, courses: CourseCard[] } — courses = PUBLISHED by user (PamphletSummary stays as-is). teach.openSlots = future OPEN count; minSlotPrice; completedSessions; avgSessionRating (received, COMPLETED); sessionRatingCount; courseCount (PUBLISHED)
- GET /stats: ADD { sessions: completed ClassSession count, courses: PUBLISHED VideoCourse count } (keep existing fields)

### Socket mini-service — mini-services/classroom-service (Task 6-a)
- Independent bun project: own package.json (deps: socket.io), index.ts entry, PORT 3003, io path MUST be '/', cors *
- Health: plain http handler for GET /health → { ok: true } (non-socket paths fall through)
- Client connects: io("/?XTransformPort=3003", { auth: { ticket } }) — NEVER any other URL/path
- On connection: verify ticket HMAC (same SECRET pattern as auth.ts; exp ≤ 6h; reimplement the 30-line verify in the service — NO imports from src/) → socket.data { uid, sid, role, name }; invalid → disconnect. Join room `session:${sid}`. Emit to socket: room:welcome { snapshot: Stroke[], members: Member[], me: Member }; broadcast to room others: room:member-joined { member }
- Member = { uid, name, role: "teacher"|"student", online: true } — dedupe by uid (multiple tabs), track socket count per uid per room; on last socket disconnect → broadcast room:member-left { uid }
- Stroke = { uid, color: string, width: number, tool: "pen"|"eraser", points: { x: number, y: number }[] } (x/y normalized 0..1)
- Events client→server: `chat:relay` { message: SessionMessageItem } → broadcast others `chat:new` { message } (server does NOT persist; client already POSTed to REST); `board:stroke` { stroke } → append room snapshot (cap 800, drop oldest) + broadcast others `board:stroke`; `board:clear` → snapshot=[] + broadcast `board:cleared`; `board:undo` {} → remove LAST stroke in snapshot with uid===socket.data.uid (if any) + broadcast `board:undo` { uid }
- Validate payloads (shapes/lengths) and wrap ALL handlers in try/catch — service must never crash
- package.json dev script: `bun --hot index.ts`; MUST `bun install` inside mini-services/classroom-service; start with nohup in background; verify: curl localhost:3003/health

### Payment gateway UX note (6-b)
Deposit flow in wallet view: amount picker → POST /wallet/deposit → show Dialog styled like a Zarinpal-style gateway («درگاه پرداخت امن — پرداخت‌یار» fake brand, card number prefilled 6037-99-75-1234-5678, CVV2/exp mock, «پرداخت» button → POST /wallet/deposit/verify { authority, result: "success" } → toast + refresh; «شکست پرداخت» link → result "fail"). Add a small gold note: «درگاه پرداخت در این نسخهٔ نمایشی شبیه‌سازی شده است».

---
Task ID: 6-a
Agent: backend
Task: Phase 2 REST API + classroom socket service

Work Log:
- Read contract v2 + studied Phase 1 conventions (http.ts/serializers.ts/auth.ts/pamphlets+MR routes); implemented exactly to contract
- src/lib/server/auth.ts APPEND: RoomTicketPayload + ROOM_TICKET_MAX_AGE_MS (6h) + signTicket/verifyTicket (base64url payload + HMAC-SHA256 base64url, same SECRET fallback as session token)
- src/lib/server/serializers.ts APPEND: toTxnItem, slotEndAt, toSlotItem, mySlotInclude/toMySlotItem (session embedded only while not cancelled), sessionInclude/toSessionItem (viewer-aware myRole/canJoin/hasReview), toSessionReviewItem, toSessionMessageItem, courseCardInclude/toCourseCard (ratingAvg round1, studentCount, lessonCount, totalMinutes), toCourseReviewItem, toLessonItem (videoUrl emitted ONLY when unlocked)
- Wallet: GET /wallet (lazy upsert balance 0, last 50 txns desc); POST /wallet/deposit (int, 10k..5M, ×1,000, PENDING txn balanceAfter=current, 36-char alnum authority with retry); POST /wallet/deposit/verify (claims PENDING via conditional updateMany → guards double-verify, success: +amount & balanceAfter updated, fail: FAILED; 404 «تراکنش پرداخت پیدا نشد»); POST /wallet/withdraw (≥50k, ≤balance, WITHDRAW txn in $transaction)
- GET /market/teachers: only users with ≥1 future OPEN slot; openSlotCount/minPrice from those slots, sessionCount = COMPLETED taught, avgSessionRating round1 of SessionReviews on COMPLETED taught (0 if none), pamphletCount via groupBy; normalizePersian search on fullName/expertise/bio; 4 sorts (rating→avg desc then sessionCount desc, price_asc/desc, sessions)
- Slots: GET /teachers/[id]/slots (public OPEN future asc, 404 «کاربر پیدا نشد»); GET /slots/mine (future OPEN+BOOKED + past BOOKED asc, session {id,student,topic} on live bookings); POST /slots (batch or single object, max 20, startAt ≥ now+60min, duration ∈ SLOT_DURATIONS default 60, price 20k..2M ×5,000, overlap ±15min vs own slots incl. same-batch, all-or-nothing $transaction); DELETE /slots/[id] (own+OPEN+future, else «این اسلات قابل حذف نیست», 404 for missing/foreign)
- Sessions: POST /sessions atomic interactive $transaction — conditional slot guard updateMany(OPEN→BOOKED) (0 rows → 409 «این اسلات همین حالا رزرو شد»), wallet re-check (402 «موجودی کیف پول کافی نیست؛ ابتدا کیف پول را شارژ کنید»), ClassSession create (teacherShare=floor(80%), commission=rest, meetingCode 6-char from ABCDEFGHJKLMNPQRSTUVWXYZ23456789 with P2002-target retry loop, endAt=start+duration), SESSION_PAYMENT txn with refType SESSION/refId. GET /sessions?role&status&page (upcoming asc, past desc, mixed desc; myRole/canJoin/hasReview). GET /sessions/[id] member-only 403, last-100 messages asc, myReview (student). POST cancel: teacher → full refund CANCELLED_TEACHER; student ≥2h → full refund; student <2h → 50% refund + 50% SESSION_EARNING «غرامت لغو جلسهٔ دیرهنگام»; slot back to OPEN only if future. POST complete (teacher-only 403 «فقط معلم می‌تواند جلسه را پایان دهد», BOOKED-only): SESSION_EARNING +teacherShare, description «درآمد برگزاری جلسهٔ «topic» (کمیسیون پلتفرم: X تومان)» (X en-US grouped), endAt=now. POST review (student-only, COMPLETED-only, upsert by session). GET join (member, BOOKED-only «جلسه در دسترس نیست») → JoinTicketResponse with 6h HMAC ticket. POST messages (member, 1..1000, persists; client relays via socket)
- Courses: GET /courses (PUBLISHED, Persian search title/desc/teacher, 5 sorts, filters, pagination max 48); POST /courses (title 3..120, desc ≤2000, grade/subject/level ∈ constants, price 0..5M ×10,000, 1..40 lessons each title 2..120 + videoUrl http(s):// or /path ≤500 + duration 1..600 + isFreePreview, status DRAFT/PUBLISHED default PUBLISHED, order 1..n nested create); GET /courses/mine (all incl DRAFT, +status +salesCount=enrollments count); GET /courses/[id] (public, DRAFT hidden from non-owners 404, per-lesson lock = !(isFreePreview||enrolled||isMine) with videoUrl STRIPPED when locked, watched when enrolled, canReview=enrolled&&!isMine, salesCount only for owner); PATCH (owner, partial, same validations); POST lessons (owner, append order=max+1); DELETE lesson (owner, ≥2 lessons else «دوره باید دست‌کم یک درس داشته باشد», cascade + renumber 1..n); POST purchase (price 0 → direct enroll; else atomic: unique-enrollment guard → P2002→409 «شما قبلاً این دوره را خریده‌اید», COURSE_PURCHASE −price, COURSE_EARNING +80% to teacher, wallets updated; own course 403 «این دورهٔ خودتان است»; 402 insufficient); POST reviews (enrolled && !owner, upsert); GET /learn (enrollments desc, watchedLessons, progressPercent round, nextLessonId = first unwatched else last); POST /lessons/[id]/watched (enrolled-only 403 «برای ثبت پیشرفت، ابتدا دوره را خریداری کنید», upsert, returns recomputed progressPercent)
- Extended GET /users/[id] (+teach: openSlots/minSlotPrice/completedSessions/avgSessionRating/sessionRatingCount/courseCount; +courses: PUBLISHED CourseCards) and GET /stats (+sessions COMPLETED count, +courses PUBLISHED count) — Phase 1 fields untouched (verified 14 pamphlets / same stats)
- mini-services/classroom-service: independent bun project (socket.io 4.8.4, bun --hot), port 3003, io path "/", cors *. Local ~40-line ticket HMAC verify (NO src/ imports). Rooms session:{sid}; room:welcome {snapshot≤800, members, me}; member-joined/left with per-uid socket-count dedupe (multi-tab); chat:relay→chat:new (sender identity OVERRIDDEN from ticket — anti-spoof); board:stroke (snapshot append, cap 800 drop-oldest, points clamped 0..1, uid overridden); board:clear→board:cleared; board:undo (removes last own stroke)→board:undo{uid}; all payloads validated + every handler try/catch. NOTE: engine.io path "/" claims every URL prefix and swallowed /health → re-wrapped the server "request" listener: /health & non-EIO paths → plain HTTP handler, EIO= traffic → socket.io (verified curl /health {"ok":true}, polling handshake, 404 fallthrough)
- ENVIRONMENT FIX (lead must know): the running Next dev server (started before Task 5's prisma generate) had a stale in-memory Prisma client — db.wallet was undefined (500 on every Phase 2 route). Touching files/clearing .next/dev/cache/turbopack did NOT help; fixed by restarting `bun run dev` (same port 3000, same command, background). If the container restarts, /start.sh runs bun install + db:push + bun run dev itself, so this is self-healing on reboot. Also /start.sh auto-discovers mini-services/*/package.json → classroom-service auto-starts on container boot (log /tmp/mini-service-classroom-service.log)
- TESTING (all via curl + cookie jars, then bun scripts for sockets): wallet 25/25 (PENDING→success +50k, fail→FAILED, double-verify 404, withdraw min/insufficient/ok, lazy wallet for fresh user); market 10/10 (6 teachers, all 4 sorts verified numerically, Persian/Arabic-char search, empty results); slots 31/31 + follow-ups (batch, single-object, overlap ±15min, 21→400, last-lesson... all error messages exact); sessions part1 39/39 (golden path book→list→detail→message→join-ticket→cancel>2h full refund + slot reopened + 409 rebook + 80/20 math + meetingCode 6 chars); sessions part2 27/27 (complete→earning+desc exact, review upsert same id, late-cancel 50/50 split exact to the toman, teacher-cancel full refund, insufficient 402, market rating updated live); courses 44+42+5 follow-ups (anonymous locking — NO videoUrl on locked lessons, free-preview unlocked, enrolled/owner unlocked, salesCount owner-only, DRAFT hidden 404, PATCH/append/reorder/last-lesson guard, purchase math 380k→304k teacher, 409 repeat, free purchase no txn, review upsert, learn progress 0→17→100 %, nextLessonId first-unwatched→last, unenrolled 403s); users/stats extensions + Phase 1 regression (pamphlets total 14, /users/top, auth flows); socket two-client integration test 23/23 (welcome/me/members, chat relay + anti-spoof + no echo, stroke relay + snapshot persistence, undo/clear, multi-tab dedupe, member-left only after last tab, invalid ticket server-disconnects with no room:welcome) + gateway path test (io http://localhost:81/?XTransformPort=3003 works) + 800-stroke cap test — all pass; test scripts deleted afterwards
- Re-ran bun prisma/seed.ts → pristine state verified: stats {14 pamphlets, 6 teachers, 16 versions, 12 reviews, 3 forks, 3 MRs, 1 merged, 1 session, 5 courses}, pamphlets list OK, market 6, hossein wallet 590,000, upcoming session MT4G8S with منتجبی intact (classroom demo), classroom-service healthy
- bun run lint CLEAN; tsc: zero errors in all Phase 2 files (pre-existing errors remain only in prisma/seed.ts, src/lib/diff.ts, examples/, skills/ — Task 1/sandbox files); dev.log free of runtime errors; classroom-service log clean

Stage Summary:
- 28 route files + 2 extended routes + serializers/auth appends + classroom-service: complete Phase 2 backend live
- Deviations/decisions for 6-b/frontend:
  * POST /sessions returns {id} (201); booking txn description «رزرو جلسهٔ «topic|جلسهٔ تدریس» با «teacher»»
  * earning description commission formatted with ASCII thousands separator (e.g. «24,000 تومان»)
  * salesCount (mine + owner detail) = total enrollments (free course "sales" = students too)
  * slots/mine includes session object ONLY while that session is BOOKED/COMPLETED (cancelled bookings → session:null)
  * DELETE /slots/[id] returns 404 for foreign slots (no enumeration leak)
  * Extra error messages not in contract: «اسلات مورد نظر پیدا نشد» (404), «زمان این اسلات گذشته است» (400), «موضوع جلسه حداکثر ۱۲۰ نویسه است», «فقط دانش‌آموز این جلسه می‌تواند امتیاز دهد» (403), «امتیازدهی فقط پس از برگزار شدن جلسه ممکن است» (400), «فقط مدرس دوره می‌تواند آن را ویرایش کند/درس اضافه کند/درس حذف کند» (403), «نمی‌توانید برای دورهٔ خودتان نظر ثبت کنید» (403), «فقط دانش‌آموزان دوره می‌توانند نظر ثبت کنند» (403), «برای ثبت پیشرفت، ابتدا دوره را خریداری کنید» (403), «درس پیدا نشد» (404), «حداکثر ۲۰ اسلات در هر بار امکان‌پذیر است», «حداکثر ۴۰ درس در هر دوره امکان‌پذیر است»
  * Socket: ALL client→server events broadcast to OTHERS only (sender applies locally); board:undo broadcast even when no stroke removed (literal contract); stroke/chat sender identity always overridden from ticket
  * Socket client must connect io("/?XTransformPort=3003", { auth: { ticket } }) — verified working through Caddy
  * If Phase 2 API routes ever 500 with "reading 'upsert' of undefined" → stale dev-server Prisma client → restart `bun run dev`

---
Task ID: 6-b (completion note by lead)
Agent: lead (on behalf of frontend agent — agent hit context deadline after writing all code)
Task: Phase 2 views + realtime classroom client

Work Log:
- Frontend agent implemented ALL files before hitting the deadline: wallet-view (563), market-view (245), book-view (351), sessions-view (499), classroom-view (831), courses-view (441), course-view (568), learn-view (107), learn-player-view (293), teach-view (1624), use-classroom.ts (300) — ~5,800 lines + home-view Phase-2 promo band/stats cells + profile-view teach section
- Lead verified completeness, lint clean, and performed the full E2E verification (see Task 7)

Stage Summary:
- All 10 Phase 2 views implemented to contract with default exports matching page.tsx. No files missing.

---
Task ID: 7
Agent: lead (Z.ai Code)
Task: Phase 2 integration, end-to-end browser verification, polish, pristine re-seed

Work Log:
- Assessed 6-b agent's unfinished state: all 11 view files + home/profile edits were written; lint clean; only verification/worklog missing
- E2E verified in headless browser via the CADDY GATEWAY (localhost:81 — the real user path; direct :3000 access cannot route XTransformPort websockets, which is expected):
  * Home: Phase-2 promo band (بازارچهٔ تدریس + دوره‌های ویدیویی CTA cards), stats strip now جزوه‌ها/معلم‌ها/جلسات برگزارشده/دوره‌ها (۱۴/۶/۱/۵), nav + footer + user-menu + mobile-drawer links all live
  * Market: 6 teacher cards (ratings, session counts, «شروع از X تومان»), search + 4 sort options
  * Booking: teacher profile + slots grouped by Jalali day («فردا — چهارشنبه ۲۹ مهر»…), confirm dialog w/ wallet balance + commission note → POST /sessions → created session PTGBEX BOOKED (wallet debited 110,000, txns consistent) → toast → #/sessions
  * VIRTUAL CLASSROOM (two isolated browser sessions — student hossein + teacher montajebii, session MT4G8S): socket CONNECTED through gateway; teacher received student's REST-persisted chat + whiteboard SNAPSHOT on join (room:welcome); LIVE chat relay teacher→student (message appeared in student's browser without reload); LIVE whiteboard stroke teacher→student (canvas pixels verified via getImageData); presence avatars for both members; VLM inspection of classroom screenshot: PASS/PASS/PASS (professional layout, readable, no defects)
  * Wallet: balance hero + transaction ledger (badges, signed amounts, balanceAfter chain); deposit flow: amount chips → «درگاه پرداخت امن — پرداختیار» mock gateway dialog → پرداخت → balance +500,000 (API-verified 670,000 → 420,000 after later course buy, exact math)
  * Courses: store grid + filters; detail with locked lessons (قفل) + free-preview lesson; free preview video PLAYED (lesson-statistics.mp4, readyState>0); purchase «خرید با کیف پول» → dialog → COURSE_PURCHASE −250,000, lessons unlocked, «ادامهٔ یادگیری» state
  * Learn: 4 enrolled cards w/ progress bars; player: video + lesson sidebar + «اتمام این درس» → progress 0/5 → 1/5 (20%) API-verified; progress UI updates
  * Teach panel (as montajebii): کلاس‌ها (earnings summary, upcoming + پایان جلسه), برنامهٔ تدریس (slot create form: روز/ساعت/مدت/نرخ → created slot on «پنجشنبه ۳۰ مهر ۲۰:۰۰» + toast + appears in grouped list; delete buttons per slot), دوره‌ها (my courses + «ساخت دورهٔ جدید» wizard step-1 form verified + مدیریت dialogs)
  * Session lifecycle full loop: teacher «پایان جلسه» → SESSION_EARNING +96,000 (80% of 120,000) API-verified → student «ثبت بازخورد» 5★ dialog → myReview persisted (API-verified)
  * Profile: teach section + «رزرو کلاس خصوصی» + courses on teacher profile (initially checked wrong user id — verified against montajebii's real profile after)
  * Phase 1 regression: pamphlet detail 4 tabs OK, KaTeX renders, search works (API param is `query`; frontend maps hash `q`→`query` correctly — initial «broken search» alarm was a false positive from testing with the wrong param name)
  * Mobile 390px: market + classroom NO horizontal scroll; both browser sessions: zero page errors, zero unexpected console output
  * Static assets: /videos/*.mp4 (200, ~1-2MB) and /courses/*.png (200) served
- Restored PRISTINE seed state after testing (bun prisma/seed.ts): 7 users / 14 pamphlets / 29 open slots / 3 sessions (1 COMPLETED w/ review, 1 CANCELLED, 1 BOOKED MT4G8S tomorrow 19:00 Tehran) / 5 courses / 6 enrollments / 22 txns / wallets per seed
- bun run lint clean; dev.log clean; classroom-service (port 3003) healthy; note: 6-a had to restart `bun run dev` once due to stale in-memory Prisma client after Task 5's prisma generate (documented in 6-a entry)

Stage Summary:
- PHASE 2 COMPLETE & BROWSER-VERIFIED. OpenEdu Git is now a teaching marketplace:
  * کیف پول + درگاه پرداخت شبیه‌سازی‌شده (شارژ/برداشت/تراکنش‌ها، کمیسیون ۸۰/۲۰)
  * بازارچهٔ تدریس: اسلات‌های معلم‌ها، رزرو با پرداخت از کیف پول، لغو با قواعد بازپرداخت (کامل ≥۲ ساعت، ۵۰٪ دیرتر)
  * کلاس مجازی بلادرنگ: چت + تختهٔ سفید همکارانه + حضور اعضا (socket.io از طریق گیت‌وی) — صدا و تصویر در نسخهٔ نمایشی غیرفعال و به‌روشنی اعلام شده
  * فروشگاه دورهٔ ویدیویی: خرید مادام‌العمر، پیش‌نمایش رایگان، قفل درس‌ها (بدون نشت videoUrl)، پیشرفت یادگیری، بازخوردها
  * پنل تدریس: مدیریت اسلات، ساخت/مدیریت دوره، درآمدها
- Demo accounts (password 123456): montajebii@openedu.ir (معلم — ۷ اسلات آزاد، ۲ دوره، پنل تدریس) | hossein@openedu.ir (دانش‌آموز — کیف پول ۵۹۰٬۰۰۰، جلسهٔ فردا ۱۹:۰۰ با استاد منتجبی کد MT4G8S برای تست کلاس مجازی، ۲ دورهٔ خریده) — برای تست گفت‌وگوی زنده با هر دو وارد شوید
- Remaining known gaps (future): real Shaparak/Zarinpal integration, WebRTC video/voice + recording, HLS transcoding + signed CDN URLs, teacher KYC/e-namad legal flow, Meilisearch full-text (Phase 1+ gap), notifications
