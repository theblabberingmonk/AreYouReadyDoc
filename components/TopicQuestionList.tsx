"use client";

import Link from "next/link";
import { useStore, refOf } from "@/lib/progress";

interface TopicQuestion {
  ref: string;
  paper: string;
  n: number;
  title: string;
  context: string;
}

export default function TopicQuestionList({ questions }: { questions: TopicQuestion[] }) {
  const state = useStore();
  const revised = questions.filter((q) => {
    const [paperId, sn] = q.ref.split(":");
    return state.progress[refOf(paperId, Number(sn))]?.revised;
  }).length;

  return (
    <>
      <p className="progress-line__text" style={{ marginBottom: 18 }}>
        <strong>{revised}</strong> of {questions.length} revised in this topic
      </p>
      <ul className="saved-list">
        {questions.map((q) => {
          const [paperId, sn] = q.ref.split(":");
          const isRevised = Boolean(state.progress[refOf(paperId, Number(sn))]?.revised);
          return (
            <li key={q.ref}>
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
