"use client";

/**
 * Client-side ranked search over the pre-built /api/search.
 * Lazy-loaded on first use; no dependencies, no network beyond the authenticated index. Hand-rolled ranking beats a library here: 170 docs, three fields.
 */

export interface SearchDoc {
  ref: string;
  paper: string;
  n: number;
  title: string;
  session: string;
  track: string;
  prompt: string;
  body: string;
}

export interface SearchHit {
  doc: SearchDoc;
  score: number;
  snippet: string;
}

let cached: SearchDoc[] | null = null;
let inflight: Promise<SearchDoc[]> | null = null;

export function loadIndex(): Promise<SearchDoc[]> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = fetch("/api/search")
    .then((response) => {
      if (!response.ok) throw new Error(`search index ${response.status}`);
      return response.json();
    })
    .then((payload: { docs: SearchDoc[] }) => {
      cached = payload.docs;
      inflight = null;
      return cached;
    })
    .catch((error: unknown) => {
      inflight = null;
      throw error;
    });
  return inflight;
}

function tokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*?([^*]+)\*\*?/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\|/g, " ")
    .replace(/[-–—]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function snippetFor(doc: SearchDoc, toks: string[]): string {
  const body = stripMarkdown(doc.body);
  const lower = body.toLowerCase();
  for (const tok of toks) {
    const i = lower.indexOf(tok);
    if (i !== -1) {
      const start = Math.max(0, i - 70);
      const end = Math.min(body.length, i + 160);
      return `${start > 0 ? "… " : ""}${body.slice(start, end).trim()}${end < body.length ? " …" : ""}`;
    }
  }
  return doc.prompt.length > 170 ? `${doc.prompt.slice(0, 170).trim()} …` : doc.prompt;
}

export function searchDocs(docs: SearchDoc[], query: string, limit = 25): SearchHit[] {
  const toks = tokens(query);
  if (toks.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const doc of docs) {
    const title = doc.title.toLowerCase();
    const prompt = doc.prompt.toLowerCase();
    const body = doc.body.toLowerCase();
    let score = 0;
    for (const tok of toks) {
      if (title.includes(tok)) score += title.startsWith(tok) ? 7 : 5;
      if (prompt.includes(tok)) score += prompt.startsWith(tok) ? 4 : 3;
      if (body.includes(tok)) score += 1;
    }
    if (score > 0) hits.push({ doc, score, snippet: snippetFor(doc, toks) });
  }
  hits.sort((a, b) => b.score - a.score || a.doc.ref.localeCompare(b.doc.ref));
  return hits.slice(0, limit);
}
