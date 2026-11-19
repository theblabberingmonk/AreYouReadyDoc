# 01 — Product Specification

## Vision

A calm, rigorous web companion for residents preparing for the **DrNB Paediatric
Surgery final examination** — the past papers, the model answers, the syllabus,
and a personal record of what you have actually revised. Fast, quiet, honest.

Not a question-bank clone. Not AI slop. A tool a paediatric surgeon would
respect: precise content, serious typography, zero noise.

## Target users

| User | Context | Need |
|---|---|---|
| DrNB resident (3-year, post-MS/DNB Gen Surgery) | Final theory exam in 3–12 months | Structured revision of past papers, syllabus coverage, progress tracking |
| Direct 6-year (post-MBBS) resident | Part 1 / Part 2 finals | Same as above, longer runway |
| Recent graduate / fellow | Refreshing core knowledge | Topic-wise reading |

Users are time-poor, mobile-heavy (reading between cases, on call), and
skeptical of gimmicks.

## Scope (v1)

1. **Past papers** — the 17 solved papers (≈170 questions) with model answers
   and checked illustrations, readable end-to-end.
2. **Progress** — self-marked "revised" per question (see
   [ADR-0002](adr/0002-progress-model.md)); per-paper and overall completion.
3. **Mock-exam mode** — 3-hour timed run of a paper, prompts only, self-review
   against model answers afterwards.
4. **Topic-wise browsing** — cross-paper index by clinical topic.
5. **Search** — instant client-side search across all prompts and answers.
6. **Bookmarks + notes** — star questions; short personal notes.
7. **Accounts** — optional sign-in (magic link); progress syncs across devices.
   The site works fully without an account.
8. **Lessons** — syllabus-mapped revision modules derived from the existing
   model answers (see [05-content-plan.md](05-content-plan.md)).
9. **AI assist (v1.1)** — "Explain deeper" on any question, grounded in the
   published model answer (see [06-ai-features.md](06-ai-features.md)).

## Non-goals (v1)

- No MCQs, auto-grading, or negative marking — DrNB theory is long-answer.
- No PDF hosting of original NBE papers (copyright; see risks in
  [03-architecture.md](03-architecture.md)).
- No discussion forum, comments, or social features.
- No native mobile app; the web app must be excellent on mobile.
- No payment/subscription gating in v1.
- No AI-generated primary content — AI only elaborates on human-authored
  answers. Trust in the content is the product.

## Design language — "clinical calm"

The anti-AI-slop contract. Every PR is reviewed against this list.

- **Typography first.** A real serif for reading (e.g. Source Serif 4 /
  Newsreader), a quiet sans for UI (Inter). 18–20px body, 1.6 line height,
  65–75ch measure. Headings earn their place.
- **Restrained palette.** Ink on warm paper (e.g. `#1a2b2a` on `#faf9f6`),
  one accent (deep teal), one semantic red/green for progress states.
  No gradients, no purple, no neon.
- **No AI-slop tells.** No "✨" bullets, no glassmorphism, no hero with a
  floating 3D blob, no stock-photo doctors, no "Supercharge your prep with
  AI!!" copy. Copy is written like a colleague wrote it. Concrete rules are
  enforced from the vendored skills in [`docs/design/`](design/README.md);
  deliberate deviations from those skills are listed there.
- **Content is the interface.** Questions and answers occupy 90% of the
  screen. Chrome (nav, progress) recedes.
- **Motion is information.** Transitions 150–250ms, ease-out, only to
  preserve object constancy (accordion open, checkmark on mark-revised).
  No parallax, no scroll-jacking.
- **Illustrations are first-class.** The checked per-question images and SVG
  figures are displayed inline, zoomable, with captions.
- **Dark mode optional**, system-respecting, same restraint (warm dark, not
  pure black).

## Success metrics

| Metric | Target (3 months post-launch) |
|---|---|
| Returning residents (weekly active / monthly active) | > 40% |
| Median questions marked revised per active user | > 30 |
| Users completing ≥ 1 full paper (10/10 revised) | > 50 users |
| Mock exams started → finished | > 60% finish rate |
| AI "explain deeper" satisfaction (thumbs-up rate) | > 70% |
| First content paint on 4G mobile | < 1.5s |

## Naming

"DrKidSurgeon" is the infra working name. Public name TBD before launch —
candidates should read as serious and specific (e.g. *DrNB Paed Surg Prep*,
*The Paediatric Surgery Papers*). Decision deferred; not architecture-blocking.
