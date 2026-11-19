"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadIndex, searchDocs, type SearchHit } from "@/lib/search";

export default function SearchView() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement !== inputRef.current) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      loadIndex()
        .then((docs) => {
          if (!cancelled) {
            setHits(searchDocs(docs, trimmed));
            setFailed(false);
          }
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div>
      <div className="search-box" role="search">
        <input
          ref={inputRef}
          type="search"
          className="search-box__field"
          placeholder="Try “long gap oesophageal atresia”…"
          aria-label="Search all questions and answers"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
        <span className="search-box__hint" aria-hidden="true">
          /
        </span>
      </div>

      {failed ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p className="empty-state__title">Search did not load.</p>
          <p>Check your connection and try again — the papers below still read fine.</p>
          <Link href="/library" className="btn" style={{ marginTop: 12 }}>
            Browse the papers
          </Link>
        </div>
      ) : hits === null ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p className="empty-state__title">Search 170 questions and answers.</p>
          <p>
            Type at least two letters. Results link straight to the question in
            its paper — or <Link href="/topics" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>browse by topic</Link> instead.
          </p>
        </div>
      ) : hits.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p className="empty-state__title">No matches for “{query.trim()}”.</p>
          <p>Try fewer words, or a spelling from the question itself — “oesophageal”, “hypospadias”, “Wilms”.</p>
        </div>
      ) : (
        <>
          <p className="muted" style={{ fontSize: "0.8rem", margin: "18px 0 12px" }}>
            {hits.length} {hits.length === 1 ? "match" : "matches"}
          </p>
          <ul className="saved-list">
            {hits.map(({ doc, snippet }) => (
              <li key={doc.ref}>
                <Link href={`/papers/${doc.paper}#q${doc.n}`}>
                  <span className="saved-list__title">{doc.title}</span>
                  <span className="saved-list__meta">
                    {doc.session} · {doc.track} · Q{doc.n}
                  </span>
                  <span className="search-snippet">{snippet}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
