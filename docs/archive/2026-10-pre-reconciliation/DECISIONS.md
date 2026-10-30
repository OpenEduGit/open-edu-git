# 📋 DECISIONS.md – OpenEdu Git

This document records **all technical and product decisions** made for the OpenEdu Git platform. It is the single source of truth for the development team.  
Decisions are final unless explicitly revisited by the founder/core team. Any change must be documented here with a new date and rationale.

---

## 🔍 How to Use This Document

- **For developers:** Read this before writing any code. All choices here are **non‑negotiable** for the current phase.
- **For contributors:** If you disagree with a decision, open a Discussion on GitHub. We will review it and update this file if needed.
- **Status:** `✅` = decided, `⚠️` = pending confirmation, `🔄` = to be reviewed later.

---

## 1. Backend Framework

| **Decision** | Python + FastAPI |
|--------------|------------------|
| **Rationale** | FastAPI is modern, fast, async‑native, and auto‑generates OpenAPI docs. It integrates well with SQLAlchemy and Pydantic. |
| **Alternatives considered** | Django (too heavy, synchronous), Flask (lacks async/automatic docs). |
| **Status** | ✅ Confirmed. |

---

## 2. Database & ORM

| **Decision** | PostgreSQL 16 + SQLAlchemy 2.0 (async) + Alembic |
|--------------|---------------------------------------------------|
| **Rationale** | PostgreSQL is robust and supports full‑text search (pg_trgm, tsvector). SQLAlchemy is the most flexible Python ORM; Alembic is the standard for migrations. |
| **Alternatives** | Prisma (Node.js, not Python), raw SQL (harder to maintain). |
| **Status** | ✅ Confirmed. |

---

## 3. Frontend Framework

| **Decision** | Next.js (React) with TypeScript, Tailwind CSS, RTL support |
|--------------|------------------------------------------------------------|
| **Rationale** | Next.js provides server‑side rendering, good SEO, and a large ecosystem. Tailwind speeds up UI development. RTL is essential for Persian content. |
| **Alternatives** | Vue.js, SvelteKit, or plain HTML. Next.js was chosen because it aligns with the roadmap and has good community support in Iran. |
| **Status** | ✅ Confirmed. *(If you are a Python‑only developer, you will need to collaborate with a frontend developer or use a template.)* |

---

## 4. Authentication

| **Decision** | Email + password with JWT (access + refresh tokens), stored in httpOnly cookies. Google OAuth will be added later. |
|--------------|-------------------------------------------------------------------------------------------------------------------|
| **Rationale** | Simple, standard, secure. Cookies mitigate XSS risks. Refresh tokens allow long‑term sessions. |
| **Alternatives** | Session‑based (needs server storage), magic links (less common). |
| **Status** | ✅ Confirmed. |

---

## 5. File Storage

| **Decision** | MinIO (S3‑compatible) – self‑hosted in development and production (initially). |
|--------------|---------------------------------------------------------------------------------|
| **Rationale** | MinIO is open‑source, works with S3 SDKs, and can be run inside Docker. Later we can switch to a cloud S3 service if needed. |
| **Alternatives** | Local filesystem (not scalable), AWS S3 (could be used later). |
| **Status** | ✅ Confirmed. |

---

## 6. Search Engine

| **Decision** | PostgreSQL full‑text search (pg_trgm + tsvector) for MVP. |
|--------------|-----------------------------------------------------------|
| **Rationale** | Simplicity – no extra service to manage. Good enough for MVP. We will add Elasticsearch/Meilisearch in Phase 3 if needed. |
| **Alternatives** | Elasticsearch (more powerful but heavier), Meilisearch (easy but still extra dependency). |
| **Status** | ✅ Confirmed for Phase 1. |

---

## 7. Payment Gateway

| **Decision** | Zarinpal (for MVP). Webhook integration will be implemented. |
|--------------|-------------------------------------------------------------|
| **Rationale** | Zarinpal is the most popular Iranian gateway, well‑documented, and supports sandbox. |
| **Alternatives** | Saman, Mellat, etc. – can be swapped later with little effort. |
| **Status** | ✅ Confirmed. *(Payment will be implemented only in Phase 2.)* |

---

## 8. Deployment & Hosting

| **Decision** | Deploy on an Iranian VPS (ArvanCloud or Asiatech) using Docker. CI/CD via GitHub Actions. |
|--------------|------------------------------------------------------------------------------------------|
| **Rationale** | Low latency, compliance with local regulations, affordable. Docker simplifies environment consistency. |
| **Alternatives** | International cloud (DigitalOcean, AWS) – more expensive and slower. |
| **Status** | ✅ Confirmed. |

---

## 9. Testing Strategy

| **Decision** | Backend: unit + integration tests using pytest (target coverage >80%). Frontend: unit tests with Jest and E2E with Playwright for critical flows. |
|--------------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| **Rationale** | Ensures reliability and facilitates refactoring. We will run tests in CI on every push. |
| **Alternatives** | No testing (not acceptable), only manual testing (risky). |
| **Status** | ✅ Confirmed. |

---

## 10. Development Environment

| **Decision** | Docker Compose (as defined in `docker-compose.yml`) with services: PostgreSQL, MinIO, Redis, backend (FastAPI), frontend (Next.js). |
|--------------|--------------------------------------------------------------------------------------------------------------------------------------|
| **Rationale** | One‑command setup for all developers, matches production environment, easy onboarding. |
| **Alternatives** | Manual installation of each service – error‑prone and slow. |
| **Status** | ✅ Confirmed. |

---

## 11. Package Management & Dependencies

| **Decision** | Python: use `requirements.txt` with `pip` (and optionally `pip-tools`). Node.js: use `npm` with `package-lock.json`. |
|--------------|---------------------------------------------------------------------------------------------------------------------|
| **Rationale** | Simple, industry‑standard. Poetry is overkill for now. |
| **Alternatives** | Poetry, pipenv. We may adopt Poetry later if dependency management becomes complex. |
| **Status** | ✅ Confirmed. |

---

## 12. Code Quality & Linting

| **Decision** | Python: use `ruff` for linting + formatting. JavaScript/TypeScript: use `prettier` and `eslint`. Pre‑commit hooks will be set up. |
|--------------|----------------------------------------------------------------------------------------------------------------------------------|
| **Rationale** | Ruff is extremely fast and replaces flake8, black, isort. Pre‑commit ensures consistent style across all commits. |
| **Alternatives** | Black + flake8 (slower), no linting (bad practice). |
| **Status** | ✅ Confirmed. |

---

## 13. Documentation & API Spec

| **Decision** | FastAPI auto‑generates OpenAPI (Swagger) at `/docs`. We will also write a user guide (`docs/guides/`) for end‑users. |
|--------------|----------------------------------------------------------------------------------------------------------------------|
| **Rationale** | Swagger is automatically updated with code, reduces manual work. User guides help teachers and students. |
| **Alternatives** | Postman/Insomnia collections (manual sync). |
| **Status** | ✅ Confirmed. |

---

## 14. Team & Roles

| **Decision** | Founder (Mohammadreza Montajebi) will lead backend development. Frontend and DevOps help will be sought from community volunteers or hired freelancers. |
|--------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Rationale** | The founder is a Python developer, so backend is the natural starting point. Frontend requires React expertise, so we will recruit. |
| **Alternatives** | Use a low‑code frontend or a simple HTML+HTMX approach – but that would deviate from the roadmap. |
| **Status** | ✅ Confirmed. *(We are open to frontend contributors joining the team.)* |

---

## 15. MVP Scope

| **Decision** | Phase 1 only: pamphlet hub with upload, search, view, rating, comments, fork/merge. No online classes, no payments, no AI. |
|--------------|-----------------------------------------------------------------------------------------------------------------------------|
| **Rationale** | Build a solid foundation, validate the core idea with real users, and then add monetization features. |
| **Alternatives** | Include payments in MVP (too complex, distracts from core value). |
| **Status** | ✅ Confirmed. |

---

## 16. Version Control & Branching Strategy

| **Decision** | GitFlow – `main` (production), `develop` (integration), and feature branches (`feature/*`). Pull requests required. |
|--------------|---------------------------------------------------------------------------------------------------------------------|
| **Rationale** | Clean history, safe releases, easy rollbacks. |
| **Alternatives** | GitHub Flow (simpler but less structured for a team). |
| **Status** | ✅ Confirmed. |

---

## 17. API Versioning

| **Decision** | Use `/api/v1/` prefix. |
|--------------|------------------------|
| **Rationale** | Allows future breaking changes without breaking old clients. |
| **Status** | ✅ Confirmed. |

---

## 18. Internationalization (i18n)

| **Decision** | The UI will be Persian (RTL) only for MVP. The code will be structured to allow later addition of English or other languages. |
|--------------|-----------------------------------------------------------------------------------------------------------------------------|
| **Rationale** | Focus on the primary audience. i18n libraries (react‑i18next) can be added later. |
| **Status** | ✅ Confirmed. |

---

## 19. Monitoring & Logging

| **Decision** | Use Sentry for error tracking, and Prometheus + Grafana for server metrics (to be added in Phase 2). |
|--------------|-----------------------------------------------------------------------------------------------------|
| **Rationale** | Proactive detection of issues. For MVP, we will start with simple logging to stdout and use Sentry for errors. |
| **Status** | ✅ Confirmed. *(Prometheus/Grafana will be set up later.)* |

---

## 20. License Enforcement

| **Decision** | Code is AGPLv3, content is CC BY-SA 4.0. We will include license headers in all source files and add a NOTICE file. |
|--------------|---------------------------------------------------------------------------------------------------------------------|
| **Rationale** | Legal compliance. AGPLv3 ensures that any public service using our code must share modifications. CC BY‑SA protects content authors. |
| **Status** | ✅ Confirmed. |

---

## 📌 How to Change a Decision

1. Open a new **Discussion** on GitHub with the `decision-change` tag.
2. Clearly state the decision to change, the rationale, and the impact.
3. The founder (or core team) will review it and, if accepted, update this file and create an issue to implement the change.

---

## 🗓️ Review Schedule

This document will be reviewed:

- After each major phase (Phase 1, Phase 2, etc.)
- When a critical technical limitation is discovered.
- At the request of any core team member.

---

**Last updated:** 2026‑06‑19  
**Owner:** Mohammadreza Montajebi (Founder)
