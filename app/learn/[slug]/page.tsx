import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getLesson, getLessonSlugs } from "@/lib/content";
import LessonQuestionList from "@/components/LessonQuestionList";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessonSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) return { title: "Module not found" };
  return {
    title: lesson.title,
    description: `${lesson.title} — revision overview with ${lesson.count} linked DrNB past-paper questions.`,
  };
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV"];

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();

  const lessons = getLessonSlugs();
  const i = lessons.indexOf(slug);
  const prev = i > 0 ? lessons[i - 1] : null;
  const next = i < lessons.length - 1 ? lessons[i + 1] : null;

  return (
    <main className="shell lesson" style={{ padding: "44px 24px 0" }}>
      <p className="eyebrow">
        <Link href="/learn" style={{ color: "inherit" }}>
          Learn
        </Link>{" "}
        · Syllabus {ROMAN[lesson.area - 1] ?? lesson.area}
      </p>
      <h1>{lesson.title}</h1>

      <section aria-label="Objectives" className="lesson-objectives">
        <h2>By the end of this module you can</h2>
        <ul>
          {lesson.objectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      </section>

      <div className="prose lesson-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.body_md}</ReactMarkdown>
      </div>

      <section aria-label="Asked in the papers" style={{ marginTop: 40 }}>
        <div className="session__head">
          <h2>Asked in the papers</h2>
          <span>{lesson.count} linked</span>
        </div>
        <LessonQuestionList questions={lesson.question_refs} />
      </section>

      <section aria-label="Syllabus checklist" className="lesson-checklist">
        <h2>Official syllabus coverage</h2>
        <ul>
          {lesson.checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <nav className="pager" aria-label="Module navigation">
        {prev ? (
          <Link href={`/learn/${prev}`}>
            <span>Previous module</span>
            <span>Syllabus {ROMAN[lessons.indexOf(prev)]}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/learn/${next}`} className="next">
            <span>Next module</span>
            <span>Syllabus {ROMAN[lessons.indexOf(next)]}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
