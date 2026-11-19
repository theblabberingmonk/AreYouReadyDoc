# 06 — AI Features

Phase label: **v1.1** — the reading/progress core ships first and must stand on
its own without AI. See [ADR-0003](adr/0003-ai-key-handling.md) for the key
decision.

## Why AI here is allowed (and how it stays honest)

The product's trust comes from human-authored model answers. AI never
generates primary content; it **elaborates on the published answer** for one
resident at a time. Every AI response is labeled, disclaimered, and grounded
in our own text.

## Feature set

| # | Feature | Phase | Notes |
|---|---|---|---|
| A | **Explain deeper** — per question, streams an elaboration of the published model answer (why, not what) | v1.1 | The only AI feature in the first AI release |
| B | **Mock viva** — AI asks 3 follow-up viva questions on a revised topic, resident self-rates | v1.2 | Builds on A's plumbing |
| C | **Condense to mnemonic / table** — turns a long answer into a revision card | v1.2 | Cached aggressively; same shape every time |
| D | Free-text "ask about this topic" | deferred | Scope-control and cost risk; needs its own ADR |

## Architecture

Shipped as specified (non-streaming JSON first; streaming deferred):

```
Browser (signed-in only)
  │ POST /api/ai/explain { ref: "01:3" }
  ▼
Vercel route handler (server)
  1. auth check (Clerk session)
  2. enabled + key check (AI_ENABLED, OPENCODE_GO_API_KEY)
  3. ref validation + question load from repo content server-side
  4. cache check: ai_cache[key] → return cached body if hit (no quota spent)
  5. quota check: count(ai_usage where user, last 24h) < AI_DAILY_LIMIT
  6. call OpenCode Go /chat/completions (45s timeout), store ai_cache + ai_usage
```

- **Key handling**: `OPENCODE_GO_API_KEY` in Vercel env, server-only. Never in
  the client bundle, never logged, never in error messages.
- **Provider integration (spike 2026-11-19, done)**: OpenCode Go is
  OpenAI-compatible at `https://opencode.ai/zen/go/v1` (`POST
  /chat/completions`, Bearer key, e.g. model `deepseek-v4-pro`). The route
  calls it with plain `fetch` behind the `explain()` shape — no AI SDK
  needed. Base URL overridable via `OPENCODE_GO_BASE_URL`, model via
  `AI_MODEL`. If the provider ever moves, only `app/api/ai/explain/route.ts`
  changes.
- **Model choice**: default to the provider's mid-tier general model;
  overridable via `AI_MODEL` env. No per-request model switching by users.

## Grounding & scope control

System prompt contract (versioned in-repo, `lib/ai/prompts.ts`):

- Role: examiner-style tutor for DrNB Paediatric Surgery theory preparation.
- Ground truth: the supplied question prompt and published model answer.
  Elaborate, structure, and explain — do not contradict it; if the answer
  appears outdated, say "discuss with your faculty" rather than improvising.
- Refuse anything outside paediatric-surgery exam scope with one polite line.
- No patient-specific advice. Content is textbook-level; a standing line in
  the UI footer: *"Educational content for exam preparation — not clinical
  guidance."*
- Output: markdown, ≤ ~600 words, headings allowed, no emoji.

## Quotas, caching, cost

| Control | Value (tunable via env) | Why |
|---|---|---|
| Auth required | yes | AI is the only login-gated feature; also makes quota enforceable |
| Daily quota | `AI_DAILY_LIMIT=20` explanations/user/day | Generous for real study, caps abuse |
| Cache | per `(feature, ref, content_hash, model)`; shared across users | 170 questions × 1 feature = at most 170 uncached calls for feature A; near-zero marginal cost after warm-up |
| max_tokens | 900 | Bounded responses, bounded cost |
| Rate limit | 1 in-flight AI request per user | Prevents tap-spam |
| Kill switch | `AI_ENABLED=false` env → feature hidden site-wide | One-checkbox off |

## Failure & edge behavior

- Provider 5xx/timeout → inline "AI is unavailable right now — the published
  answer above is complete on its own." Retry button. Never a full-page error.
- Quota exceeded → calm message with reset time (not red error styling).
- Signed-out user taps Explain → gentle prompt to sign in (magic link), with
  the promise it's one email click. Reading never gated.
- Feedback: thumbs up/down on each response → `ai_usage` row; reviewed
  monthly to tune the prompt. Target ≥ 70% positive (metric in 01).
