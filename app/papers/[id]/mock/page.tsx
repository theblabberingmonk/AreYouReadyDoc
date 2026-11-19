import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaper } from "@/lib/content";
import MockSession from "@/components/MockSession";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  await auth.protect();
  const { id } = await params;
  const paper = getPaper(id);
  if (!paper) return { title: "Mock exam not found" };
  return {
    title: `Mock exam · ${paper.title}`,
    description: `Sit ${paper.title} under timed conditions: 10 questions, 3 hours, prompts only.`,
  };
}

export default async function MockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await auth.protect();
  const { id } = await params;
  const paper = getPaper(id);
  if (!paper) notFound();

  // Prompts only — answers stay on the server until self-review.
  const prompts = paper.questions.map((q) => ({
    n: q.n,
    title: q.title,
    marks: q.marks,
    prompt: q.prompt,
  }));

  return (
    <main className="shell" style={{ padding: "44px 24px 72px" }}>
      <p className="eyebrow">
        <Link href={`/papers/${paper.id}`} style={{ color: "inherit" }}>
          {paper.title}
        </Link>{" "}
        · Mock exam
      </p>
      <MockSession paperId={paper.id} paperTitle={paper.title} prompts={prompts} />
    </main>
  );
}
