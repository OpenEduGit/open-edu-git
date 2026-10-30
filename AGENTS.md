<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project decisions — read before proposing changes

Read `docs/DECISIONS.md` and `docs/adr/` **before proposing any technical change.**

- The implemented stack (Next.js 16 + Prisma + SQLite + HMAC sessions + socket.io mini-service) intentionally diverges from the archived planning docs in `docs/archive/` — that divergence is documented, not accidental.
- When in doubt about stack choices, see the ADRs — **do not silently diverge.** To change a decision, write a new ADR (`docs/adr/NNNN-…`) and mark the old one SUPERSEDED.
- Documentation map for agents: `docs/README.md` (index), `docs/ARCHITECTURE.md` (as-built), `docs/DEVELOPMENT.md` (setup + the SQLite path gotcha), `docs/GIT-STRATEGY.md` (branches/commits).
