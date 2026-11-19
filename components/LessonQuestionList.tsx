"use client";

import Link from "next/link";
import { useStore, refOf } from "@/lib/progress";

interface LessonRef {
  paper: string;
  n: number;
  title: string;
  context: string;
}

export default function LessonQuestionList({ questions }: { questions: LessonRef[] }) {
  const state = useStore();
  const revised = questions.filter((q) =>
    state.progress[refOf(q.paper, q.n)]?.revised,
  ).length;

  if (questions.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state__title">No past question maps here yet.</p>
        <p>
          This area has not appeared directly in the solved papers — which makes
          it high yield for a future sitting. Learn the overview above cold.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="progress-line__text" style={{ marginBottom: 18 }}>
        <strong>{revised}</strong> of {questions.length} revised here
      </p>
      <ul className="saved-list">
        {questions.map((q) => {
          const isRevised = Boolean(state.progress[refOf(q.paper, q.n)]?.revised);
          return (
            <li key={`${q.paper}:${q.n}`}>
              <Link href={`/papers/${q.paper}#q${q.n}`}>
                {isRevised ? <span className="pill pill--done">Revised</span> : null}
                <span className="saved-list__title">{q.title}</span>
                <span className="saved-list__meta">{q.context}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
