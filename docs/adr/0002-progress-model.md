# ADR-0002: Progress model — self-marked "revised", anonymous-first

## Status

Accepted (2026-11-18).

## Context

DrNB theory papers are long-answer questions (10 × 10 marks), not MCQs — no
auto-grading is possible. Progress therefore must mean something a resident
declares about their own work. We also want first-time visitors to get value
in seconds, without an account wall.

## Decision

1. **One toggle per question: "Mark as revised" / "Revised ✓"** (undo allowed).
   Paper complete = 10/10. Overall progress = revised / total published.
2. **Anonymous-first**: full reading + progress with no account, stored in
   localStorage (`drnb.state.v1`).
3. **Optional sign-in** (magic link) adds cloud sync: first sign-in merges
   local ↔ cloud (union of revisions, latest note wins), then steady-state
   background sync. Only the AI feature requires sign-in.

## Alternatives considered

- **Two-step funnel (Attempted → Revised)** — richer analytics, but doubles
  taps per question and adds a state residents must manage. Rejected for v1;
  the schema (`revised` boolean) can grow an `attempted` column later without
  migration pain.
- **Confidence rating (Again / Shaky / Confident, SRS-lite)** — most learning
  science value, but implies a scheduling algorithm, review queues, and real
  UI complexity. Deferred; if adopted later it becomes a new field, not a
  rework.
- **Account-required from first visit** — cleanest sync story, worst first-run
  experience; loses the "feeling of achievement" for drive-by users. Rejected.
- **localStorage only, no accounts** — the original static plan; fails
  cross-device and loses progress on browser reset. Superseded with ADR-0001.

## Consequences

- Positive: zero-friction start; honest metric (residents won't fake a
  self-toggle — it's for them); trivially small data (170 refs ≈ 20KB);
  sync merges are conflict-light (union + latest-wins).
- Negative: "revised" is self-reported — no correctness signal (accepted;
  mock-exam self-scores add a soft signal without grading pretence);
  anonymous state can be lost on storage clear — the UI says so once, gently,
  next to the sign-in nudge.
