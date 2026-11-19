import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { getIndex, getLibrarySessions } from "@/lib/content";
import LibraryGrid from "@/components/LibraryGrid";
import OverallProgress from "@/components/OverallProgress";

export default async function LibraryPage() {
  await auth.protect();
  const index = getIndex();
  const sessions = getLibrarySessions();
  const paperTotals = Object.fromEntries(index.papers.map((p) => [p.id, p.count]));
  const paperCount = index.papers.length;

  return (
    <main>
      <section className="shell workspace-head">
        <p className="eyebrow">Your study workspace</p>
        <div className="workspace-heading">
          <div><h1>Make today count.</h1>
          <p className="lede">Choose a paper, revisit a topic, or pick up where you left off.</p></div>
          <Link className="btn btn-primary" href="/bookmarks">Your saved questions <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="workspace-summary">
          <div><strong>{paperCount}</strong><span>Past papers</span></div>
          <div><strong>{index.total_questions}</strong><span>Model answers</span></div>
          <div className="workspace-progress"><span>Your revision progress</span>
          <OverallProgress paperTotals={paperTotals} totalQuestions={index.total_questions} /></div>
        </div>
        <nav className="study-shortcuts" aria-label="Study shortcuts">
          <Link href="/learn"><span>01</span> Learn by syllabus <span aria-hidden="true">↗</span></Link>
          <Link href="/topics"><span>02</span> Revise by topic <span aria-hidden="true">↗</span></Link>
          <Link href="/search"><span>03</span> Find a question <span aria-hidden="true">↗</span></Link>
        </nav>
      </section>

      <hr className="rule" />

      <section className="shell" aria-label="Past papers">
        <LibraryGrid sessions={sessions} />
      </section>
    </main>
  );
}
