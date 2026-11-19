"use client";

import Link from "next/link";
import { useStore, refOf } from "@/lib/progress";
import type { PaperIndexEntry } from "@/lib/content";
import ProgressRing from "./ProgressRing";
import Reveal from "./Reveal";

export default function LibraryGrid({
  sessions,
}: {
  sessions: Array<{ session: string; papers: PaperIndexEntry[] }>;
}) {
  const state = useStore();

  return (
    <div className="library">
      {sessions.map(({ session, papers }) => (
        <section className="session" key={session} aria-labelledby={`s-${session}`}>
          <div className="session__head">
            <h2 id={`s-${session}`}>{session}</h2>
            <span>
              {papers.length} {papers.length === 1 ? "paper" : "papers"}
            </span>
          </div>
          <div className="paper-grid">
            {papers.map((paper, index) => {
              const revised = countPaper(state, paper);
              const done = revised === paper.count && paper.count > 0;
              return (
                <Reveal key={paper.id} delay={Math.min(index * 60, 400)}>
                  <Link
                    href={`/papers/${paper.id}`}
                    className={`paper-card${done ? " paper-card--done" : ""}`}
                    aria-label={`${paper.title}: ${revised} of ${paper.count} questions revised`}
                  >
                    <span className="paper-card__body">
                      <span className="paper-card__kicker">
                        {paper.track} · {paper.paper}
                      </span>
                      <span className="paper-card__title">{paper.session}</span>
                      <span className="paper-card__meta">
                        {done ? (
                          <span className="done">Complete · {paper.count} questions</span>
                        ) : (
                          <>
                            <span className={revised ? "done" : undefined}>{revised}</span> of{" "}
                            {paper.count} revised
                          </>
                        )}
                      </span>
                    </span>
                    <ProgressRing
                      value={revised}
                      total={paper.count}
                      label={`${paper.title}: ${revised} of ${paper.count} revised`}
                    />
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function countPaper(
  state: ReturnType<typeof useStore>,
  paper: Pick<PaperIndexEntry, "id" | "count">,
): number {
  let n = 0;
  for (let q = 1; q <= paper.count; q += 1) {
    if (state.progress[refOf(paper.id, q)]?.revised) n += 1;
  }
  return n;
}
