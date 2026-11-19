"use client";

import { useSyncExternalStore } from "react";

/**
 * Local-first progress store (see docs/04-data-model.md §3).
 * Anonymous state lives in one versioned localStorage key. Phase 2 adds the
 * Supabase sync layer on top of exactly this store — the UI never talks to
 * the network directly.
 */

export const STORAGE_KEY = "drnb.state.v1";

export type QuestionRef = `${string}:${number}`; // "01:3"

export interface ProgressEntry {
  revised: boolean;
  revised_at: string;
}

export type Rating = "again" | "hard" | "good" | "easy";

export const RATINGS: Array<{ value: Rating; label: string }> = [
  { value: "again", label: "Again" },
  { value: "hard", label: "Hard" },
  { value: "good", label: "Good" },
  { value: "easy", label: "Easy" },
];

export interface Attempt {
  paper_id: string;
  started_at: string;
  ended_at: string | null;
  ratings?: Record<string, Rating>;
}

export interface StateV1 {
  version: 1;
  progress: Record<string, ProgressEntry>;
  bookmarks: Record<string, { created_at: string }>;
  notes: Record<string, { body: string; updated_at: string }>;
  attempts: Attempt[];
  sync: { dirty: string[]; last_synced_at: string | null };
}

export const EMPTY_STATE: StateV1 = Object.freeze({
  version: 1,
  progress: {},
  bookmarks: {},
  notes: {},
  attempts: [],
  sync: { dirty: [], last_synced_at: null },
}) as StateV1;

export const refOf = (paperId: string, n: number): QuestionRef =>
  `${paperId}:${n}`;

let state: StateV1 = EMPTY_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function parse(raw: string | null): StateV1 {
  if (!raw) return EMPTY_STATE;
  try {
    const value = JSON.parse(raw) as Partial<StateV1>;
    if (value?.version !== 1) throw new Error("schema mismatch");
    return {
      version: 1,
      progress: value.progress ?? {},
      bookmarks: value.bookmarks ?? {},
      notes: value.notes ?? {},
      attempts: value.attempts ?? [],
      sync: value.sync ?? { dirty: [], last_synced_at: null },
    };
  } catch {
    // Corrupt or future schema: preserve for forensics, start clean.
    try {
      if (raw) window.localStorage.setItem(`${STORAGE_KEY}.backup`, raw);
    } catch {
      /* storage may be full or blocked */
    }
    return EMPTY_STATE;
  }
}

export function ensureHydrated(): StateV1 {
  if (!isBrowser()) return EMPTY_STATE;
  if (!hydrated) {
    state = parse(window.localStorage.getItem(STORAGE_KEY));
    hydrated = true;
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY) {
        state = parse(event.newValue);
        emit();
      }
    });
  }
  return state;
}

function emit() {
  for (const listener of listeners) listener();
}

export function getState(): StateV1 {
  return ensureHydrated();
}

export function subscribe(listener: () => void): () => void {
  ensureHydrated();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commit(next: StateV1) {
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota/blocked — UI stays usable, state lives for this session */
  }
  emit();
}

export function toggleRevised(paperId: string, n: number) {
  ensureHydrated();
  const ref = refOf(paperId, n);
  const existing = state.progress[ref];
  const progress = { ...state.progress };

  if (existing?.revised) {
    delete progress[ref];
  } else {
    progress[ref] = { revised: true, revised_at: new Date().toISOString() };
  }

  commit({
    ...state,
    progress,
    sync: {
      ...state.sync,
      dirty: [...new Set([...state.sync.dirty, `progress:${ref}`])],
    },
  });
}

export function isRevised(paperId: string, n: number): boolean {
  return Boolean(getState().progress[refOf(paperId, n)]?.revised);
}

/** Count revised questions for one paper (0..10). */
export function countRevised(paperId: string, total: number): number {
  const progress = getState().progress;
  let count = 0;
  for (let n = 1; n <= total; n += 1) {
    if (progress[refOf(paperId, n)]?.revised) count += 1;
  }
  return count;
}

/** Count revised questions across all published papers. */
export function countRevisedAll(paperTotals: Record<string, number>): number {
  const progress = getState().progress;
  let count = 0;
  for (const ref of Object.keys(progress)) {
    const [paperId, n] = ref.split(":");
    if (paperTotals[paperId] && Number(n) <= paperTotals[paperId]) count += 1;
  }
  return count;
}

export function toggleBookmark(paperId: string, n: number) {
  ensureHydrated();
  const ref = refOf(paperId, n);
  const bookmarks = { ...state.bookmarks };
  const dirty = new Set(state.sync.dirty);

  if (bookmarks[ref]) {
    delete bookmarks[ref];
    dirty.add(`unbookmark:${ref}`);
    dirty.delete(`bookmark:${ref}`);
  } else {
    bookmarks[ref] = { created_at: new Date().toISOString() };
    dirty.add(`bookmark:${ref}`);
    dirty.delete(`unbookmark:${ref}`);
  }

  commit({ ...state, bookmarks, sync: { ...state.sync, dirty: [...dirty] } });
}

export function saveNote(paperId: string, n: number, body: string) {
  ensureHydrated();
  const ref = refOf(paperId, n);
  const trimmed = body.trim().slice(0, 2000);
  const notes = { ...state.notes };

  if (!trimmed) {
    delete notes[ref];
  } else {
    notes[ref] = { body: trimmed, updated_at: new Date().toISOString() };
  }

  commit({
    ...state,
    notes,
    sync: {
      ...state.sync,
      dirty: [...new Set([...state.sync.dirty, `note:${ref}`])],
    },
  });
}

export function addAttempt(attempt: Attempt) {
  ensureHydrated();
  commit({
    ...state,
    attempts: [...state.attempts, attempt],
    sync: {
      ...state.sync,
      dirty: [...state.sync.dirty, `attempt:${state.attempts.length}`],
    },
  });
}

/** Latest Again/Hard/Good/Easy rating per question ref, newest attempt wins. */
export function latestRatings(): Record<string, Rating> {
  const out: Record<string, Rating> = {};
  for (const attempt of getState().attempts) {
    if (!attempt.ratings) continue;
    for (const [n, rating] of Object.entries(attempt.ratings)) {
      out[`${attempt.paper_id}:${n}`] = rating;
    }
  }
  return out;
}

/** Replace local user state wholesale (used after server merge/pull). */
export function replaceUserState(next: {
  progress: StateV1["progress"];
  bookmarks: StateV1["bookmarks"];
  notes: StateV1["notes"];
  attempts: Attempt[];
}) {
  ensureHydrated();
  commit({ ...state, ...next, sync: { dirty: [], last_synced_at: new Date().toISOString() } });
}

export function markSynced() {
  ensureHydrated();
  commit({ ...state, sync: { dirty: [], last_synced_at: new Date().toISOString() } });
}

export function useStore(): StateV1 {
  return useSyncExternalStore(subscribe, getState, () => EMPTY_STATE);
}
