"use client";

/**
 * Background sync engine. Local-first: every toggle works offline and marks
 * the op dirty; when signed in, dirty ops push (debounced) and server state
 * pulls/merges. Sync never blocks the UI and never deletes local data.
 */

import {
  getState,
  markSynced,
  replaceUserState,
  type Attempt,
  type StateV1,
} from "./progress";

export type SyncStatus = "idle" | "pending" | "error" | "off";

interface ServerState {
  progress: Array<{ ref: string; revised: boolean; revised_at: string | null }>;
  bookmarks: Array<{ ref: string; created_at: string }>;
  notes: Array<{ ref: string; body: string; updated_at: string }>;
  attempts: Attempt[];
}

type Op =
  | { kind: "progress"; ref: string; revised: boolean }
  | { kind: "bookmark"; ref: string }
  | { kind: "unbookmark"; ref: string }
  | { kind: "note"; ref: string; body: string }
  | { kind: "attempt"; paper_id: string; started_at: string; ended_at: string | null; ratings?: Record<string, string> };

function opsFromDirty(dirty: string[], state: StateV1): Op[] {
  const ops: Op[] = [];
  for (const key of dirty) {
    const colon = key.indexOf(":");
    if (colon === -1) continue;
    const kind = key.slice(0, colon);
    const ref = key.slice(colon + 1);

    if (kind === "progress") {
      const entry = state.progress[ref];
      ops.push({ kind: "progress", ref, revised: Boolean(entry?.revised) });
    } else if (kind === "bookmark" || kind === "unbookmark") {
      ops.push({ kind, ref });
    } else if (kind === "note") {
      ops.push({ kind: "note", ref, body: state.notes[ref]?.body ?? "" });
    } else if (kind === "attempt") {
      const attempt = state.attempts[Number(ref)];
      if (attempt) {
        ops.push({
          kind: "attempt",
          paper_id: attempt.paper_id,
          started_at: attempt.started_at,
          ended_at: attempt.ended_at,
          ratings: attempt.ratings,
        });
      }
    }
  }
  return ops;
}

/** Union merge: server ∪ local. Notes resolve by latest updated_at. */
function merge(local: StateV1, server: ServerState): Pick<StateV1, "progress" | "bookmarks" | "notes" | "attempts"> {
  const progress = { ...local.progress };
  for (const row of server.progress) {
    if (row.revised && !progress[row.ref]) {
      progress[row.ref] = { revised: true, revised_at: row.revised_at ?? new Date().toISOString() };
    }
  }

  const bookmarks = { ...local.bookmarks };
  for (const row of server.bookmarks) {
    if (!bookmarks[row.ref]) bookmarks[row.ref] = { created_at: row.created_at };
  }

  const notes = { ...local.notes };
  for (const row of server.notes) {
    const mine = notes[row.ref];
    if (!mine || new Date(row.updated_at) > new Date(mine.updated_at)) {
      notes[row.ref] = { body: row.body, updated_at: row.updated_at };
    }
  }

  // Attempts are append-only: dedupe by (paper_id, started_at).
  const seen = new Set(local.attempts.map((a) => `${a.paper_id}|${a.started_at}`));
  const attempts = [...local.attempts];
  for (const row of server.attempts) {
    if (!seen.has(`${row.paper_id}|${row.started_at}`)) attempts.push(row);
  }
  attempts.sort((a, b) => a.started_at.localeCompare(b.started_at));

  return { progress, bookmarks, notes, attempts };
}

export async function pushDirty(): Promise<boolean> {
  const state = getState();
  if (state.sync.dirty.length === 0) return true;
  const ops = opsFromDirty(state.sync.dirty, state);
  if (ops.length === 0) {
    markSynced();
    return true;
  }
  const response = await fetch("/api/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ops }),
  });
  if (!response.ok) return false;
  const payload = (await response.json()) as { state?: ServerState };
  if (payload.state) {
    replaceUserState(merge(getState(), payload.state));
  } else {
    markSynced();
  }
  return true;
}

export async function pullAndMerge(): Promise<boolean> {
  const response = await fetch("/api/sync", { method: "GET" });
  if (!response.ok) return false;
  const payload = (await response.json()) as { state?: ServerState };
  if (!payload.state) return false;
  replaceUserState(merge(getState(), payload.state));
  return true;
}
