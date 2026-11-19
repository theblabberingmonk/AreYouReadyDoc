# 07 — Implementation Plan

Order is deliberate: **reading value first, plumbing before polish, AI last.**
Each phase is deployable and leaves the site better than before.

## Phase 0 — Groundwork ✅ done 2026-11-19 — Groundwork (0.5 day)

- [ ] Re-authorize Vercel team access (`theblabberingmonks-projects`) — currently 403 via MCP; use Vercel CLI login if faster
- [ ] Fix paper-10 titles upstream in the workspace (missing `### title` headings in answers.md)
- [ ] Re-run `python3 ../export_site_data.py` → confirm 17 papers + `data/index.json` + all images
- [ ] Convert scaffold to TypeScript strict (`tsconfig`, rename `.jsx`→`.tsx`, drop hello-world)
- [ ] Connect GitHub repo to Vercel project; confirm preview deploy on PR
- [ ] Supabase: run the schema + RLS from [04-data-model.md](04-data-model.md) as migration `0001_init`
- [ ] `.env.local` with the four env vars (names in 03); add `.env*.local` to `.gitignore`

## Phase 1 — Reading core ✅ done 2026-11-19 — Reading core (the product's heart)

- [ ] Design tokens + base CSS per "clinical calm" (01): serif body, warm paper, teal accent; light/dark
- [ ] Typed content loaders with zod validation (`lib/content/`)
- [ ] Library page (`/`) grouped by session, per-paper progress rings, overall progress header
- [ ] Paper page (`/papers/[id]`): RSC shell, question accordions, markdown rendering (`remark-gfm`, raw HTML off), inline WebP illustrations with zoom, SVG figures
- [ ] `lib/progress/` local store (`drnb.state.v1`) with zod migration + backup-on-corrupt
- [ ] Mark-as-revised toggle + per-paper completion state + quiet completion acknowledgement
- [ ] Mobile-first pass: reading on a 360px phone must be excellent
- [ ] **Ship checkpoint**: anonymous, full reading + progress. Already a good product.

## Phase 2 — Accounts & sync ✅ done 2026-11-19 (server paths live; signed-in E2E needs prod keys) — Accounts & sync

> **Prerequisite (ADR-0004):** wire Clerk JWT → Supabase before any sync code:
> configure Clerk as a Supabase third-party auth provider, change `user_id`
> columns from `uuid references auth.users` to `text` (Clerk user id), and
> rewrite RLS policies to compare against `auth.jwt()->>'sub'`. Schema in §2
> above is the Supabase-Auth shape; update it in the same migration.

- [ ] Clerk production instance configured; production keys in Vercel env vars

- [ ] `POST /api/sync` (batched, idempotent upserts, Clerk-authenticated user only)
- [ ] First-sign-in merge (union revisions/bookmarks, latest-note wins) + steady-state push/pull
- [ ] Sync status dot (idle / pending / error), never a spinner
- [ ] Bookmarks (toggle + `/bookmarks` view) and notes (per-question, 2000 chars)
- [ ] Sign-out leaves anonymous local copy; AC-3 passes on two real devices

## Phase 3 — Exam tools ✅ done 2026-11-19 (mock + topics + search; global ⌘K palette deferred) — Exam tools

- [ ] Mock mode `/papers/[id]/mock`: prompts-only, 3h countdown, free navigation, early/auto end
- [ ] Self-review screen (prompt ‖ answer, optional 0–10 self-score) → `exam_attempts`
- [ ] Attempt history per paper
- [ ] Export script v2: topic tagging (`topics[]`, `topics.json`) + build `search-index.json`
- [ ] Topics index + topic pages (cross-paper question lists)
- [ ] Command-K search palette + `/search` with FlexSearch, deep-links to question anchors (AC-5)

## Phase 4 — Lessons ✅ done 2026-11-19 — Lessons

- [ ] Lesson JSON schema + loaders; author the 14 modules from existing answers (05)
- [ ] Lessons index mapped to syllabus areas with coverage checklist
- [ ] Bidirectional links: lesson ↔ its questions
- [ ] Syllabus coverage view ("what the exam can ask vs what you've revised")

## Phase 5 — AI v1.1 ✅ built 2026-11-19 (live provider test needs OPENCODE_GO_API_KEY + AI_ENABLED=true) — AI v1.1

- [ ] **Spike**: confirm OpenCode Go API surface (base URL, auth, models, streaming, OpenAI-compat) → record findings in ADR-0003 comments
- [ ] `POST /api/ai/explain`: auth → quota → cache → provider stream; `ai_usage` + `ai_cache`
- [ ] System prompt v1 in `lib/ai/prompts.ts` (grounding + scope guard, per 06)
- [ ] "Explain deeper" button on questions (signed-in only), streamed markdown, labeled + disclaimer
- [ ] Thumbs feedback; quota-exceeded and provider-down UX
- [ ] `AI_ENABLED` kill switch verified

## Explicitly not scheduled

Forum, MCQs, payments, native app, free-text AI chat (needs own ADR), realtime
collaboration. See non-goals in [01](01-product-spec.md).

## Definition of done (any phase)

- [ ] Acceptance criteria in 02 for touched features pass on desktop + phone
- [ ] No `NEXT_PUBLIC_` secret; RLS verified with a second test account
- [ ] Docs updated in the same PR if behavior deviates
- [ ] Lighthouse: performance ≥ 90, accessibility ≥ 95 on `/` and a paper page
