# ADR-0004: Authentication via Clerk (replacing Supabase magic link)

## Status

Accepted (2026-11-19). Supersedes the "Supabase Auth magic link" choice in
[03-architecture.md](03-architecture.md) and [02-requirements.md](02-requirements.md §7).

## Context

The original plan used Supabase Auth (email magic link) for sign-in: one
vendor, native RLS integration via `auth.uid()`. The owner then chose Clerk
(app `AreYouReadyDoc`, `app_3MJVIa67A1KCHotBCA9clGwHEwz`) for login — better
prebuilt UI (sign-in/sign-up modals, `UserButton`), social providers, and no
SMTP setup for magic links.

## Decision

- **Clerk is the identity provider.** `@clerk/nextjs` (Core 3 — use `<Show>`,
  not `<SignedIn>`/`<SignedOut>`), `ClerkProvider` inside `<body>`,
  `middleware.ts` (`clerkMiddleware`, correct for Next 15), catch-all
  `/sign-in` and `/sign-up` routes. Header shows Sign in / Sign up (modal)
  when signed out, `UserButton` when signed in.
- **Supabase stays as the database** (project `DrKidSurgeon`). It no longer
  owns identities.
- **Known follow-up (Phase 2):** the schema in [04-data-model.md](04-data-model.md)
  keys user tables on `auth.users` uuids via `auth.uid()`. With Clerk there is
  no Supabase `auth.users` row, so Phase 2 sync work must first wire
  Clerk→Supabase third-party auth (Clerk JWT as the Supabase access token,
  RLS policies reading `auth.jwt()->>'sub'` as the Clerk user id, `user_id`
  columns becoming `text`). No user data exists yet, so this is a clean
  migration, not a rework — but it must land *before* the first sync code.

## Alternatives considered

- **Stay with Supabase magic link** — simplest RLS story, one vendor fewer.
  Rejected by owner preference: Clerk's UX and social logins matter more for
  resident sign-up conversion than infra minimalism.
- **Clerk + a separate user-profile DB** — unnecessary; Supabase already
  provisioned and paid for (free tier). Rejected.

## Consequences

- Positive: polished auth UX out of the box; social providers available in the
  Clerk dashboard without code; no email-deliverability work.
- Negative: two identity-adjacent vendors (Clerk for auth, Supabase for data)
  with a JWT bridge to maintain; Clerk production instance still to configure
  (dev keys in use — see Clerk deploy checklist in the `clerk-setup` skill);
  per-user costs if MAUs grow (free tier is generous for this audience).
- Obligation: `CLERK_SECRET_KEY` is server-only, like the AI key. Both
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` must be set in
  Vercel env vars before auth works in production (dev keys are local-only).
