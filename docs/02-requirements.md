# 02 — Requirements

Functional requirements use [EARS](https://alistairmavin.com/ears/) syntax.
Priority: **P0** = launch blocker, **P1** = v1, **P2** = v1.1+.

## 1. Paper library & reading (P0)

- The system shall present all available papers as a browsable library grouped
  by exam session (e.g. `2022-12`), showing each paper's track, paper number,
  and question count.
- The system shall display per-paper completion (n/10 revised) on each paper
  card without requiring sign-in.
- When a resident opens a paper, the system shall show all 10 questions in
  order, each with its number, topic title, marks breakdown (when present), and
  the full original prompt.
- When a resident expands a question, the system shall render the model answer
  as formatted markdown (headings, lists, tables, bold) with the checked
  illustration displayed inline where one exists.
- The system shall allow an illustration to be opened at full size and
  returned from without losing reading position.
- Where a paper's solutions are not yet published (papers 18+), the system
  shall not list the paper at all. Unpublished content must not ship in the
  bundle.

## 2. Progress tracking (P0) — see [ADR-0002](adr/0002-progress-model.md)

- The system shall provide one toggle per question: **Mark as revised** /
  **Revised ✓** (undo allowed).
- When a question is toggled, the system shall persist the state locally within
  100ms, without requiring sign-in or network.
- When all 10 questions of a paper are revised, the system shall mark the paper
  complete and surface a brief, quiet acknowledgement (no confetti; a checkmark
  and a line of text is on-brand).
- The system shall show overall progress (revised questions / total published
  questions) and per-session progress on the library page.
- The system shall preserve progress across browser sessions on the same
  device.
- When a signed-in resident uses a second device, the system shall present the
  same progress within 5 seconds of page load.

## 3. Mock-exam mode (P1)

- Where a resident starts mock mode on a paper, the system shall show only the
  10 question prompts and marks, hide all model answers, and run a
  3-hour countdown visible at all times.
- The system shall allow the resident to navigate freely between questions
  during the countdown.
- The system shall allow ending the exam early, and shall auto-end at 0:00.
- When an exam ends, the system shall enter self-review: each prompt beside its
  model answer, with an optional self-score (0–10) per question.
- When self-review is completed, the system shall record the attempt (paper,
  date, duration, optional scores) to the attempt history.
- The system shall show past attempts per paper (date, optional total score).

## 4. Topic-wise browsing (P1)

- The system shall assign every published question to at least one topic from
  the controlled taxonomy in [05-content-plan.md](05-content-plan.md).
- The system shall provide a topics index listing each topic with its question
  count and the resident's revised-count within it.
- When a resident opens a topic, the system shall list matching questions
  across all papers, each linking to its full context in the source paper.

## 5. Search (P1)

- The system shall provide instant client-side search across all question
  prompts, titles, and model answers, using a pre-built index shipped with the
  bundle.
- The system shall return usable results within 100ms of a keystroke pause on
  a mid-range phone.
- When a result is opened, the system shall deep-link to the exact question
  within its paper, scrolled into view.

## 6. Bookmarks & notes (P1)

- The system shall allow any question to be bookmarked/unbookmarked in one
  tap, anonymous or signed-in.
- The system shall provide a "Bookmarked" view listing all bookmarked
  questions grouped by paper.
- Where a resident adds a note to a question, the system shall save it
  (plain text, ≤ 2000 chars) and indicate presence of a note on the question.
- Bookmarks and notes shall follow the same storage/sync rules as progress
  (local-first, synced when signed in).

## 7. Accounts & sync (P0 plumbing, P1 UX) — see [ADR-0002](adr/0002-progress-model.md)

- The system shall offer sign-in via email magic link. No passwords.
- The system shall keep every feature except AI fully usable without sign-in.
- When a resident signs in for the first time on a device with existing local
  progress, the system shall merge local and cloud state (union of revisions;
  latest note wins) and never silently delete either.
- When signed in, the system shall sync progress/notes/bookmarks/attempts to
  the cloud within 2 seconds of change, and reconcile on reconnect.
- The system shall allow sign-out, leaving a working anonymous copy of state
  on the device.
- The system shall never require an account to read content.

## 8. Lessons (P1 content, P2 polish) — see [05-content-plan.md](05-content-plan.md)

- The system shall present lesson modules mapped 1:1 to the 14 NBE syllabus
  areas.
- Each lesson shall link to the past-paper questions that exercise it, and each
  question shall link back to its lesson(s).
- Each lesson shall carry a syllabus checklist so a resident can see coverage
  against the official curriculum.

## 9. AI assist (P2) — see [06-ai-features.md](06-ai-features.md)

- Where a signed-in resident taps "Explain deeper" on a question, the system
  shall stream an elaboration grounded in the published model answer.
- The system shall decline requests outside paediatric-surgery exam scope.
- The system shall enforce a per-user daily quota and degrade gracefully when
  the provider is unavailable.

## Non-functional requirements

| Category | Requirement |
|---|---|
| Performance | First content paint < 1.5s on 4G mid-range Android; question expand < 50ms; search < 100ms |
| Bundle | Initial JS ≤ 250KB gz; paper JSON lazy-loaded per paper |
| Availability | Reading, progress, mock exam must work offline after first load (PWA-lite: static assets + content cached) |
| Security | AI key never reaches the client (server env only); RLS on every user table; no service-role key in the browser |
| Privacy | No third-party analytics trackers in v1 (Vercel Analytics only); notes are private to the user |
| Accessibility | WCAG 2.1 AA: keyboard-navigable reading flow, ≥ 4.5:1 contrast, semantic headings |
| Data integrity | Sync must be idempotent; a sync failure must never corrupt or lose local state |
| SEO | Library/paper/lesson pages server-rendered and indexable; answers may be indexed (they are the content) |

## Acceptance criteria (critical paths)

**AC-1 Anonymous reading + progress**
> Given a first-time visitor on the library page,
> When they open a paper, expand a question, and tap "Mark as revised",
> Then the question shows Revised within 100ms, the paper card shows 1/10,
> and the state survives a hard refresh with no account created.

**AC-2 Paper completion**
> Given a resident has revised 9 of 10 questions on a paper,
> When they revise the tenth,
> Then the paper shows complete and overall progress increments by one
> question, on both library and paper pages, without a reload.

**AC-3 First sign-in merge**
> Given an anonymous resident with 40 revised questions and 3 notes who signs
> in for the first time,
> When the magic-link session is established,
> Then all 40 revisions and 3 notes appear in the cloud, and opening the site
> on a second device shows the same 40 revisions and 3 notes within 5 seconds.

**AC-4 Mock exam**
> Given a resident starts mock mode at 14:00,
> When the countdown reaches 0:00 (or they end early),
> Then answers unlock for self-review, and the attempt appears in the paper's
> attempt history after scoring.

**AC-5 Search deep-link**
> Given a resident searching "long gap oesophageal atresia",
> When they open a result,
> Then they land on the exact question in the correct paper with the answer
> expanded, even if that paper was not previously visited.

**AC-6 AI quota**
> Given a signed-in resident who has used the daily AI quota,
> When they tap "Explain deeper",
> Then they see a calm quota message and the published model answer remains
> fully available.

## Error handling

| Case | Behavior |
|---|---|
| Paper JSON fails to load | Inline retry panel; library remains usable |
| Sync fails (offline) | Queue locally, retry on reconnect; small "sync pending" indicator, never blocking |
| Sync conflict (two devices) | Union of revisions; latest note by `updated_at` wins; no user prompt needed |
| Magic link expired | Clear message + one-tap resend |
| AI provider 5xx/timeout | Friendly inline error; reading unaffected; retry button |
| AI quota exceeded | Quota message with reset time; no error styling (it's expected, not a failure) |
| localStorage full/blocked | Site remains read-only usable; banner explains progress can't be saved locally |
| Corrupt local state | Detect schema version mismatch, back up to `*.backup` key, start clean |

## Implementation TODO

See [07-implementation-plan.md](07-implementation-plan.md) — phases and
checklists live there, not here.
