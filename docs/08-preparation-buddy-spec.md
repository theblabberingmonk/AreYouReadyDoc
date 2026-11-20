# Preparation buddy — product and backend specification

Status: first implementation, 19 November 2026. Owner: AreYouReadyDoc. This specification distinguishes working foundations from future agent capabilities.

## Product goal

A personal DrNB Paediatric Surgery study workspace that knows the candidate's preparation record across sessions, helps them decide what to study next, and makes progress visible. Chat should explain progressively as tokens arrive, supported by our published answers rather than merely reproducing them.

## Release 1: implement now

### Streaming tutor

- Real provider streaming (`stream: true`), forwarded progressively to the browser, not a typewriter animation over a buffered answer.
- Protocol: NDJSON frames `meta`, `delta`, `done`, `error`. `meta` acknowledges the request. `delta` appends answer text. `done` confirms persistence and returns the turn, conversation ID and remaining allowance. An interrupted stream never becomes a completed assistant turn in browser history.
- Keep the existing shared 10-question UTC weekly quota, one generation per user, stable provider session ID, idempotent request UUID and ownership checks. Only a complete provider response saved successfully consumes an answer. Refund failed/aborted generations. A network interruption after persistence can replay the saved answer.
- Abort provider generation on browser cancellation; maximum provider duration 45 seconds. Do not forward reasoning/internal provider events or arbitrary provider errors. Secret filtering must handle credentials split across token chunks.
- Existing lexical retrieval across published questions/answers stays in place. This release does not replace it with vector search. Use source excerpts to improve explanations; do not force verbatim repetition. Future hybrid retrieval and evaluation remain separate work.

### Official syllabus

- Dedicated authenticated Syllabus tab, separate from our revision topics and lessons.
- Display the complete original NBEMS curriculum, including its syllabus, via direct access to the original official PDF (NBEMS sends X-Frame-Options: SAMEORIGIN and blocks cross-site embedded viewing); no AI rewriting or partial summary labelled “complete”. Provide Direct 6 Year and Post-MS/DNB tracks separately.
- Source index: https://nbe.edu.in/curriculum.html
- Direct 6 Year document: https://nbe.edu.in/mainpdf/curriculum/DrNB%20-%20Pediatric%20Surgery%20(6%20year).pdf (16 pages observed).
- Post-MS/DNB document: https://nbe.edu.in/mainpdf/curriculum/DrNB%20-%20Pediatric%20Surgery%20(3%20year).pdf (34 pages observed).
- Verified against the official index on 19 November 2026. Do not call the local lesson grouping a verbatim official syllabus taxonomy. Links remain official-hosted; availability and browser PDF support may vary.

### Candidate profile and plans

- Candidate-controlled target exam date, IANA time zone, available minutes for each weekday, focus areas and study goal.
- Save a rolling plan (7–84 days). All tasks stop before the target exam date. No assumed exam date: candidate enters it; it is not an official schedule assertion.
- Deterministic plan generator distributes first passes, viva practice and spaced revision within available minutes, prioritising focus areas. It uses our revision modules, not fabricated official weightings. Capacity limits are explicit; it must never schedule more minutes than the candidate supplied.
- A new plan archives the previous active plan atomically. Plan request UUIDs prevent duplicate plans on retry. Prior completion remains recorded.
- Each task has a local calendar date, type, topic/module, planned minutes, status and completion timestamp. Candidate explicitly marks completion or skips; AI cannot silently claim completion.

### Durable buddy memory

- Separate durable, structured profile/facts from conversational context. Last-six-turn history alone is not long-term memory.
- Memory is opt-in for use in AI prompts. Candidate can see, edit and delete explicitly saved facts/preferences. Default disabled. Do not automatically infer diagnoses, private life facts, exam readiness or competence from conversation.
- When enabled, retrieve only that user's bounded preparation context: profile, explicit memory facts, active-plan status and recorded revision/mock activity. Use the stored record to personalise explanations. Treat memory as untrusted data, not system instructions.
- Memory and progress are evidence of activity, not a guarantee of mastery or a pass prediction. Do not send all notes or complete personal history to the provider.

### Reminders

- Persist candidate-created in-app reminders, optionally linked to a task, with an absolute due time, IANA time zone and dismiss state. Reject cross-user task references.
- Due reminders appear when the preparation workspace is opened/refreshed. This release does not promise background browser notifications, email or push delivery while the app is closed.
- Reminder operations are not LLM questions and do not spend the weekly AI allowance.

## Backend contracts

`GET /api/preparation` returns the current user's profile, explicit memories, active plan/tasks and upcoming/due in-app reminders. No public caching.

`POST /api/preparation` accepts a strict discriminated action:

| Action | Payload | Effect |
|---|---|---|
| save_profile | profile | Validate time zone, date, weekday capacity; upsert own profile |
| create_plan | requestId, startDate, days | Generate deterministic tasks; archive old plan and insert new tasks transactionally |
| update_task | id, status | Own task only; update completion time |
| save_memory | key, value | Upsert explicitly entered preparation fact (up to 20/user) |
| delete_memory | id | Remove own memory |
| add_reminder | title, dueAt, taskId? | Create own in-app reminder |
| dismiss_reminder | id | Dismiss own reminder |

Every endpoint derives the owner from Clerk. Neither user IDs nor arbitrary provider messages/tools are accepted from the client. New tables have RLS, no anonymous/authenticated role grants and service-role-only access. Parent/child records use owner-aware composite foreign keys. Transactions lock per candidate where needed.

## Release 2: adaptive preparation agent

1. Dashboard for syllabus coverage, weak areas, upcoming tasks and achievable weekly workload.
2. Reviewed plan proposals based on progress, self-rated confidence and assessment results; show changes before applying them. Preserve completed tasks when replanning.
3. Explicit study events (attempts, review sessions, confidence, time spent) and explainable spaced repetition. Event IDs make sync idempotent.
4. Buddy can propose facts to remember, but candidate approves durable memory writes. Provide provenance, timestamps, correction and “forget” controls.
5. Scheduled delivery worker/outbox with deduplication, retries, time-zone/DST handling, quiet hours, per-channel opt-in/unsubscribe and observable delivery state. Choose and configure an email/push service before claiming delivery.
6. Calendar export, timetable exceptions/on-call days, revision streaks, accessible mobile views and progress export/deletion.
7. Agent actions use a narrow server tool allowlist: propose plan, read own preparation, create an explicitly requested reminder. No direct SQL, arbitrary URLs, autonomous messages or cross-user data.

## Acceptance and evaluation

- Stream parser handles fragmented network chunks, CRLF, Unicode, empty events, provider failures, truncated streams and cancellation. First deltas arrive before provider completion; final persistence happens once.
- Quota tests still pass; concurrent requests and chat deletion cannot bypass allowance.
- Profile and all plan/memory/reminder operations enforce Clerk ownership. Anonymous routes return 401. Composite constraints reject foreign-owned task links.
- Planner respects zero-availability days, daily minutes, target date and deterministic output. No false precision about exam likelihood/weighting.
- Memory opt-out produces no personal prompt context. Deleting memory removes it from subsequent context.
- Original syllabus PDF stays separate from app-authored topic summaries.
- Failure UX preserves the draft and distinguishes an interrupted partial answer from a saved complete answer.
- Release notes state which agent and notification features are implemented versus planned. Measure time to first visible token, completion latency, generation failures, quota rejects, saved-plan adherence and reminder delivery only once external delivery exists.


## Expanded database and candidate metrics scope — 19 November 2026

Persist the published question/answer corpus and revision-module texts in `study_content` with content hashes and provenance. Repository JSON remains the reproducible import source and current retrieval fallback; this does not change the RAG ranking in this release. Keep candidate records separate from shared content. Store complete chat texts in existing conversation/answer records, not duplicated inside analytics.

Maintain append-only `study_events` for route and question views, foreground active-app time, revision marks/clears, bookmarks, note changes, mock attempts, saved AI answers, plan creation and task transitions. Server-side triggers record committed state changes. Browser batches carry UUIDs so retries deduplicate. Browser events are candidate activity signals, not trusted exam performance. Reject arbitrary event types and payloads. No raw keystrokes, passwords, tokens or patient records in analytics.

Expose candidate-only metrics: published questions available, current revised-question coverage, active plan task completion, planned/completed study minutes, active foreground app time over 28 days, daily activity, unique questions viewed, revision events, mock attempts and self-rating distribution, bookmarks/notes and AI answers. Show recent activity with timestamps. Clearly distinguish active-app time from measured study time, revised status from mastery, task minutes from actual time spent, and self-ratings from an examiner score. Use aggregate SQL queries, not a truncated client-side event list, for totals.

Keep original record and event timestamps; never fabricate historical telemetry before tracking began. Candidate memory opt-out disables personal prompt context without deleting preparation records. Candidate-initiated deletion must remove memory content, while de-identified usage counts needed for quota remain separate. A complete account export/deletion flow remains a subsequent milestone; do not claim it exists yet.
