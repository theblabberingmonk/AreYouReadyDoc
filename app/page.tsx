import { getIndex, getLibrarySessions } from "@/lib/content";
import LibraryGrid from "@/components/LibraryGrid";
import OverallProgress from "@/components/OverallProgress";

export default function HomePage() {
  const index = getIndex();
  const sessions = getLibrarySessions();
  const paperTotals = Object.fromEntries(index.papers.map((p) => [p.id, p.count]));

  return (
    <main>
      <section className="shell masthead">
        <p className="eyebrow">DrNB Paediatric Surgery · Final theory</p>
        <h1>The papers, answered.</h1>
        <p className="lede">
          Seventeen exam sessions, {index.total_questions} long-answer questions — each with
          a written model answer and a checked illustration. Read it like a book, mark what
          you have revised, and let the record build itself.
        </p>
        <OverallProgress
          paperTotals={paperTotals}
          totalQuestions={index.total_questions}
        />
        <p className="muted" style={{ fontSize: "0.78rem", marginTop: 10 }}>
          Progress is saved in this browser. Sign-in and cross-device sync arrive with
          accounts.
        </p>
      </section>

      <hr className="rule" />

      <section className="shell" aria-label="Past papers">
        <LibraryGrid sessions={sessions} />
      </section>
    </main>
  );
}
