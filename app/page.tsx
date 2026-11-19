import { getIndex, getLibrarySessions } from "@/lib/content";
import LibraryGrid from "@/components/LibraryGrid";
import OverallProgress from "@/components/OverallProgress";

export default function HomePage() {
  const index = getIndex();
  const sessions = getLibrarySessions();
  const paperTotals = Object.fromEntries(index.papers.map((p) => [p.id, p.count]));
  const paperCount = index.papers.length;

  return (
    <main>
      <section className="shell masthead">
        <p className="eyebrow">DrNB Paediatric Surgery · Final theory</p>
        <h1>The papers, answered.</h1>
        <p className="lede">
          {paperCount} papers, {index.total_questions} theory questions — each with a
          written model answer and a checked illustration. Read it like a book, mark
          what you have revised, and let the record build itself.
        </p>
        <OverallProgress
          paperTotals={paperTotals}
          totalQuestions={index.total_questions}
        />
        <p className="muted" style={{ fontSize: "0.78rem", marginTop: 10 }}>
          Your record stays in this browser. Signing in syncs it across devices.
        </p>
      </section>

      <hr className="rule" />

      <section className="shell" aria-label="Past papers">
        <LibraryGrid sessions={sessions} />
      </section>
    </main>
  );
}
