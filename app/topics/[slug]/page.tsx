import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopic, getTopicSlugs, getIndex } from "@/lib/content";
import TopicQuestionList from "@/components/TopicQuestionList";

export const dynamicParams = false;

export function generateStaticParams() {
  return getTopicSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) return { title: "Topic not found" };
  return {
    title: topic.name,
    description: `${topic.count} DrNB Paediatric Surgery questions on ${topic.name}, drawn from every paper.`,
  };
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV"];

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();

  const sessions = new Map(getIndex().papers.map((p) => [p.id, `${p.session} · ${p.track} · ${p.paper}`]));

  return (
    <main className="shell" style={{ padding: "44px 24px 72px", maxWidth: "56rem" }}>
      <p className="eyebrow">
        <Link href="/topics" style={{ color: "inherit" }}>
          Topics
        </Link>{" "}
        · Syllabus {ROMAN[topic.syllabus_area - 1] ?? topic.syllabus_area}
      </p>
      <h1>{topic.name}</h1>
      <p className="lede" style={{ marginBottom: 28 }}>
        {topic.count} {topic.count === 1 ? "question" : "questions"} across the
        papers. Each link opens the question in full context.
      </p>
      <TopicQuestionList
        questions={topic.questions.map((q) => ({
          ref: `${q.paper}:${q.n}`,
          paper: q.paper,
          n: q.n,
          title: q.title,
          context: sessions.get(q.paper) ?? q.paper,
        }))}
      />
    </main>
  );
}
