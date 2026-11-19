# Documentation — DrNB Paediatric Surgery Exam Prep Platform

Working title: **DrKidSurgeon** (matches the Supabase project name; rename before launch if desired).

These documents are the single source of truth for what we are building and why.
Read them in order. When code and docs disagree, the docs win until the code is
updated — update the docs in the same PR as any deviation.

| Doc | Purpose |
|---|---|
| [01-product-spec.md](01-product-spec.md) | Vision, users, scope, non-goals, design language, success metrics |
| [02-requirements.md](02-requirements.md) | Functional requirements (EARS), non-functionals, acceptance criteria, error handling |
| [03-architecture.md](03-architecture.md) | System design, tech stack, deployment, security model, risks |
| [04-data-model.md](04-data-model.md) | Content schemas (papers/lessons JSON) and Supabase schema with RLS |
| [05-content-plan.md](05-content-plan.md) | NBE syllabus mapping, lessons structure, topic taxonomy, content pipeline |
| [06-ai-features.md](06-ai-features.md) | AI feature specs, key handling, guardrails, cost controls |
| [07-implementation-plan.md](07-implementation-plan.md) | Phased delivery plan with TODO checklists |
| [adr/](adr/) | Architecture Decision Records — why key choices were made |

## ADR index

| ADR | Decision | Status |
|---|---|---|
| [0001](adr/0001-full-stack-platform.md) | Full-stack platform: Next.js on Vercel + Supabase (supersedes static-only plan) | Accepted |
| [0002](adr/0002-progress-model.md) | Self-marked "revised" progress, anonymous-first with account sync | Accepted |
| [0003](adr/0003-ai-key-handling.md) | AI key server-side only; no embedded keys, no BYOK in v1 | Accepted |
| [0004](adr/0004-clerk-auth.md) | Authentication via Clerk; Supabase stays as database (supersedes Supabase magic link) | Accepted |

## Ground facts these docs are built on

- **Content**: 17 complete solved papers (papers 01–17 in the workspace `solution/`
  pipeline), ~170 long-answer questions, one checked illustration per question,
  20 shared SVG figures. Exported into this repo as `data/papers/*.json` +
  `public/assets/img/**` + `public/assets/figures/**` by `../export_site_data.py`
  (lives **outside** this repo on purpose).
- **Exam format**: each NBE theory paper = 10 questions × 10 marks = 100 marks,
  3 hours. Confirmed against the exported data.
- **Syllabus**: NBE "Competency Based Training Programme in DNB–Paediatric
  Surgery" — 14 syllabus areas, summarized in [05-content-plan.md](05-content-plan.md).
- **Infra**: Supabase project `DrKidSurgeon` (ref `rbbmkgyjvajglyjmxvrc`,
  Postgres 17, us-west-2). Vercel team `theblabberingmonks-projects`
  (MCP access needs re-authorization before deploy).
- **AI**: OpenCode Go API key, held server-side only.
