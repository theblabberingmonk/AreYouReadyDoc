import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaper, getPaperIds, getPaperNeighbours } from "@/lib/content";
import PaperReader from "@/components/PaperReader";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPaperIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const paper = getPaper(id);
  if (!paper) return { title: "Paper not found" };
  return {
    title: paper.title,
    description: `${paper.questions.length} DrNB Paediatric Surgery questions with illustrated model answers — ${paper.title}.`,
  };
}

export default async function PaperPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const paper = getPaper(id);
  if (!paper) notFound();

  const { prev, next } = getPaperNeighbours(id);

  return (
    <main>
      <div className="shell paper-head">
        <p className="eyebrow">Past paper · {paper.session}</p>
        <h1>{paper.title}</h1>
        <div className="paper-head__meta">
          <span>{paper.questions.length} questions</span>
          <span>100 marks</span>
          <span>3 hours</span>
        </div>
      </div>

      <PaperReader paper={paper} />

      <div className="shell">
        <nav className="pager" aria-label="Paper navigation">
          {prev ? (
            <Link href={`/papers/${prev.id}`}>
              <span>Previous paper</span>
              <span>{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/papers/${next.id}`} className="next">
              <span>Next paper</span>
              <span>{next.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
        <p className="muted" style={{ fontSize: "0.76rem", paddingBottom: 40 }}>
          Source: {paper.source}. Questions © NBE, reproduced for educational fair dealing;
          answers and illustrations are original work.
        </p>
      </div>
    </main>
  );
}
