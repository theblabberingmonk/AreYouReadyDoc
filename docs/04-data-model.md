# 04 — Data Model

Two kinds of data, two homes:

1. **Content** — papers, lessons, topics, search index. Public, read-only,
   lives in this repo as JSON, produced by the export script, shipped as
   static assets.
2. **User state** — progress, notes, bookmarks, attempts, AI usage. Private,
   lives in Supabase Postgres behind RLS, mirrored in localStorage for
   anonymous users and offline use.

## 1. Content schemas (repo `data/`)

### `data/index.json` — library manifest

```ts
interface PaperIndexEntry {
  id: string;            // "01".."17" (zero-padded, stable forever)
  session: string;       // "2022-12"
  track: string;         // "DrNB" | "Part 1" | "Part 2 Final" | "Direct 6 Years Part 1" | ...
  paper: string;         // "Paper 2"
  title: string;         // "2022-12 · DrNB · Paper 2"
  count: number;         // 10
  questions: Array<{ n: number; title: string; marks: string }>;
}
interface ContentIndex {
  papers: PaperIndexEntry[];
  total_questions: number;   // ~170 at 17 papers
  updated: string;           // export script version tag
}
```

### `data/papers/NN.json` — one paper

```ts
interface Question {
  n: number;             // 1..10
  title: string;         // topic title, e.g. "Choledochal cyst and bilirubin metabolism"
  marks: string;         // "3+3+4" or ""
  prompt: string;        // original NBE question text, flattened to one paragraph
  body_md: string;       // model answer, markdown (GFM), may reference assets/figures/*.svg
  has_image: boolean;    // illustration exists at /assets/img/NN/qNN.webp
  topics: string[];      // ADD: slugs from the controlled taxonomy (see 05)
}
interface Paper {
  id: string; session: string; track: string; paper: string;
  title: string; source: string;   // original PDF filename, attribution only
  questions: Question[];
}
```

### `data/topics.json` and `data/lessons/*.json` (new — export script v2)

```ts
interface Topic { slug: string; name: string; syllabus_area: number; question_refs: Array<{ paper: string; n: number }>; }
interface Lesson {
  slug: string;                 // "v-neonatal-surgery"
  syllabus_area: number;        // roman numeral index 1..14 of NBE syllabus
  title: string;
  objectives: string[];         // 3–6 bullets, exam-worded
  body_md: string;              // curated from model answers + editorial stitching
  question_refs: Array<{ paper: string; n: number }>;
  checklist: string[];          // official syllabus bullet coverage
}
```

### `data/search-index.json`

FlexSearch `Document` index, built by the export script over
`title + prompt + body_md` of every question, id = `paperId:n`. Shipped as a
static asset, loaded on first search focus.

### Asset conventions

| Asset | URL | File location |
|---|---|---|
| Question illustration | `/assets/img/{paperId}/q{n:02d}.webp` | `public/assets/img/…` — ≤1200px WebP q78, one per question |
| Shared SVG figure | `/assets/figures/{name}.svg` | `public/assets/figures/…` — rendered inline in markdown |
| Original PDFs | **never in repo** | copyright + weight |

## 2. Supabase schema (project `DrKidSurgeon`)

Every table has `user_id uuid references auth.users` and RLS enabled with the
same two policies (select/insert/update/delete own rows). Shown once:

```sql
alter table public.question_progress enable row level security;
create policy "own rows" on public.question_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- repeat the same policy shape for: bookmarks, notes, exam_attempts, ai_usage
```

### `question_progress`

```sql
create table public.question_progress (
  user_id    uuid        not null references auth.users on delete cascade,
  paper_id   text        not null,            -- "01"
  question_n smallint    not null,            -- 1..10
  revised    boolean     not null default true,
  revised_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, paper_id, question_n)
);
```

### `bookmarks`

```sql
create table public.bookmarks (
  user_id    uuid not null references auth.users on delete cascade,
  paper_id   text not null,
  question_n smallint not null,
  created_at timestamptz not null default now(),
  primary key (user_id, paper_id, question_n)
);
```

### `notes`

```sql
create table public.notes (
  user_id    uuid not null references auth.users on delete cascade,
  paper_id   text not null,
  question_n smallint not null,
  body       text not null check (char_length(body) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, paper_id, question_n)
);
```

### `exam_attempts`

```sql
create table public.exam_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  paper_id     text not null,
  started_at   timestamptz not null,
  ended_at     timestamptz,
  self_scores  jsonb,          -- {"1": 7, "2": 8, ...} marks out of 10, optional
  created_at   timestamptz not null default now()
);
create index on public.exam_attempts (user_id, paper_id, created_at desc);
```

### `ai_usage` and `ai_cache` (AI phase — see 06)

```sql
create table public.ai_usage (          -- quota bookkeeping, written via service role
  user_id    uuid not null references auth.users on delete cascade,
  feature    text not null,             -- "explain"
  ref        text not null,             -- "01:3"
  created_at timestamptz not null default now()
);
create index on public.ai_usage (user_id, created_at desc);

create table public.ai_cache (          -- shared across users; NOT user-owned
  key        text primary key,          -- sha256(feature + ref + content_hash + model)
  body_md    text not null,
  created_at timestamptz not null default now()
);
-- ai_cache: no RLS read restriction on content (it's derived from public content),
-- but reads go through the route handler, not the client.
```

No `profiles` table in v1 — `auth.users` email is enough. Add one the day we
need display names.

## 3. localStorage schema (anonymous + offline mirror)

Single key, versioned, zod-validated on read:

```
drnb.state.v1 = {
  version: 1,
  progress:   { "01:3": { revised: true,  revised_at: "2026-11-18T09:00:00Z" } },
  bookmarks:  { "01:3": { created_at: "..." } },
  notes:      { "01:3": { body: "...", updated_at: "..." } },
  attempts:   [ { paper_id, started_at, ended_at, self_scores } ],  // unsigned only
  sync:       { dirty: ["progress:01:3", ...], last_synced_at: "..." }
}
```

- Ref format everywhere (local, cloud, URLs, AI cache): `"{paperId}:{n}"`.
- On schema-version bump: migrate in place; on parse failure: copy to
  `drnb.state.v1.backup` and start clean (see error table in 02).
- Storage budget: 170 refs × ~120 bytes ≈ 20KB. Trivial.

## 4. Sync semantics

- **Transport**: `POST /api/sync` with `{ ops: SyncOp[] }`, server applies
  upserts idempotently. `SyncOp = { kind, ref, payload, client_updated_at }`.
- **Merge on first sign-in**: upload full local state; server unions progress
  and bookmarks (OR of `revised`/existence), notes resolved by latest
  `updated_at`; then client pulls the merged truth.
- **Steady state**: local write → mark dirty → debounce 1.5s → push → pull
  changes since `last_synced_at` on focus/interval while signed in.
- **Attempts**: local-only until signed in; uploaded as new rows (append-only,
  no conflict possible).
- **Never** block a UI toggle on sync. Sync is a background promise with a
  tiny status dot, not a spinner.
