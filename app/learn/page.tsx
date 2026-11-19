import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";
import { getLessonsIndex } from "@/lib/content";

export const metadata: Metadata = {
  title: "Learn",
  description:
    "Fourteen syllabus-mapped revision modules for DrNB Paediatric Surgery — core overviews linked to the past-paper questions that examine them.",
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV"];

export default async function LearnPage() {
  await auth.protect();
  const lessons = getLessonsIndex();
  return (
    <main className="shell" style={{ padding: "44px 24px 72px" }}>
      <p className="eyebrow">Learn the syllabus</p>
      <h1>Fourteen modules, zero gaps.</h1>
      <p className="lede" style={{ marginBottom: 32 }}>
        Each module covers one area of the NBE syllabus the way the exam asks
        it — then points you to the exact past questions that prove it.
      </p>
      <div className="paper-grid">
        {lessons.map((lesson) => (
          <Link key={lesson.slug} href={`/learn/${lesson.slug}`} className="paper-card">
            <span className="paper-card__body">
              <span className="paper-card__kicker">Syllabus {ROMAN[lesson.area - 1] ?? lesson.area}</span>
              <span className="paper-card__title">{lesson.title}</span>
              <span className="paper-card__meta">
                {lesson.count} {lesson.count === 1 ? "linked question" : "linked questions"}
              </span>
            </span>
          </Link>
        ))}
      </div>
      <p className="muted" style={{ fontSize: "0.78rem", marginTop: 28, maxWidth: "62ch" }}>
        Syllabus areas follow the NBE Competency Based Training Programme in
        DNB–Paediatric Surgery. Overviews are original revision notes; linked
        model answers carry the full detail.
      </p>
    </main>
  );
}
