# ADR-0001: Full-stack platform — Next.js on Vercel + Supabase

## Status

Accepted (2026-11-18). **Supersedes the earlier static-only GitHub Pages plan**,
which was made before Vercel/Supabase access existed.

## Context

The site began as a static GitHub Pages idea: no backend, progress in
localStorage, no AI (an API key in a static bundle is public by view-source).
The product scope then grew: accounts with cross-device progress, and AI
features that require a server-held key. GitHub Pages serves only static files
— it can never hold a secret or run server logic, so the new scope forces a
platform decision.

## Decision

- **Next.js 15 on Vercel (Hobby)** — same repo, git-push deploys, route
  handlers for the AI proxy and sync endpoint.
- **Supabase (`DrKidSurgeon`)** — Auth (magic link) + Postgres with RLS for all
  user state.
- Reading path stays **local-first**: content is build-time static and works
  offline; the backend only carries private user state and AI.

## Alternatives considered

- **Stay static on GitHub Pages** — free and simple, but: no secrets possible
  (AI dead on arrival), no server-side auth, progress trapped per-device.
  Rejected by the new scope.
- **Static site + BYOK (users paste their own AI keys)** — keeps Pages hosting,
  but pushes cost and key-hygiene onto residents, uncertain browser→provider
  CORS, and a confusing UX. Rejected.
- **GitHub Pages + external BaaS for everything (Supabase + a serverless AI
  function elsewhere)** — two hosting providers to reason about for zero gain.
  Rejected.
- **Full Vercel stack incl. Vercel Postgres/Neon via Marketplace** — viable,
  but Supabase is already provisioned with Auth included; one service covers
  auth + DB. Rejected as redundant, not wrong.
- **Cloudflare Pages/Workers, Netlify** — fine platforms; Vercel's Next.js
  integration and the existing team access tip it. Rejected on switching cost.

## Consequences

- Positive: server-held AI key (secure), real accounts, cross-device sync,
  preview deploys per PR, zero server ops, $0 at current scale.
- Negative: no longer "pure static" — two managed dependencies (Vercel,
  Supabase) and their outages now matter (mitigated: reading is local-first);
  Hobby-tier limits (bandwidth, function concurrency) — upgrade is $20/mo if
  ever hit; Supabase DB in us-west-2 adds sync latency for Indian users —
  sync is async and non-blocking, so acceptable (revisit if write UX suffers).
- Neutral: GitHub remains the source of truth; Vercel deploys from it. GitHub
  Pages is simply never enabled.
