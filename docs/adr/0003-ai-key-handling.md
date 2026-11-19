# ADR-0003: AI key handling — server-side only

## Status

Accepted (2026-11-18). Provider-integration spike results to be appended as a
comment during Phase 5.

## Context

The owner holds an OpenCode Go API key and wants residents to experience AI.
On GitHub Pages (or any static host) anything shipped to the browser is public
— an embedded key would be scraped and abused within hours. The question was
whether any client-side scheme (embedded key, or BYOK where each resident
pastes their own key) is acceptable.

## Decision

1. The OpenCode Go key lives **only** in Vercel environment variables
   (`OPENCODE_GO_API_KEY`, no `NEXT_PUBLIC_` prefix) and is used only in
   server route handlers (`/api/ai/*`).
2. The browser never sees the key, a derived token, or a signed URL to the
   provider. It calls our route handler with a session cookie.
3. Abuse is bounded server-side: auth required, per-user daily quota,
   per-content shared cache, max-token caps, one in-flight request per user,
   and an `AI_ENABLED` kill switch (details in [06](../06-ai-features.md)).
4. AI is the **only** login-gated feature; all reading stays anonymous-first
   (ADR-0002).

## Alternatives considered

- **Embed key in the client** — public by view-source. Rejected outright.
- **BYOK (resident pastes their own key, stored in their browser)** — no key
  of ours exposed, but: residents shouldn't need/buy API keys; keys in
  localStorage are XSS-exposed; browser→provider CORS support uncertain;
  support burden. Rejected for v1; could be revisited as a power-user option
  behind a flag, with its own threat review.
- **Vercel AI Gateway as the provider proxy** — strong future option
  (centralized keys, spend limits, observability). Not chosen now because the
  OpenCode Go key is already paid for; the route-handler interface
  (`explain(ref)`) hides the provider, so adopting the Gateway later is a
  one-file change.
- **Supabase Edge Functions instead of Vercel route handlers** — workable;
  rejected only to keep the AI code next to the app code and content.

## Consequences

- Positive: key never exposed; quota-enforceable per user; caching makes the
  marginal cost of feature A approach zero after warm-up (≤170 uncached
  calls); provider swappable behind one interface.
- Negative: AI requires sign-in (accepted — also what makes quota fair);
  Vercel function becomes a hard dependency for AI (accepted — reading is
  unaffected when it fails).
- Obligation: if the key is ever suspected leaked, rotate it in Vercel env —
  no code change needed; verify no key material appears in build output or
  logs during Phase 5 review.
