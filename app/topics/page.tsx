import type { Metadata } from "next";
import Link from "next/link";
import { getTopics } from "@/lib/content";

export const metadata: Metadata = {
  title: "Topics",
  description: "Every question across all 17 papers, grouped by clinical topic for theme-wise revision.",
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV"];

export default function TopicsPage() {
  const topics = getTopics();
  return (
    <main className="shell" style={{ padding: "44px 24px 72px" }}>
      <p className="eyebrow">Revise by theme</p>
      <h1>Topics across every paper.</h1>
      <p className="lede" style={{ marginBottom: 32 }}>
        The same question bank, reorganised the way revision actually happens —
        one theme at a time, newest papers alongside oldest.
      </p>
      <div className="paper-grid">
        {topics.map((topic) => (
          <Link key={topic.slug} href={`/topics/${topic.slug}`} className="paper-card">
            <span className="paper-card__body">
              <span className="paper-card__kicker">Syllabus {ROMAN[topic.syllabus_area - 1] ?? topic.syllabus_area}</span>
              <span className="paper-card__title">{topic.name}</span>
              <span className="paper-card__meta">
                {topic.count} {topic.count === 1 ? "question" : "questions"}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
