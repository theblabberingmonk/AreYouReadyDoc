"use client";

import { useStore, refOf } from "@/lib/progress";

export default function OverallProgress({
  paperTotals,
  totalQuestions,
}: {
  paperTotals: Record<string, number>;
  totalQuestions: number;
}) {
  const state = useStore();

  let revised = 0;
  for (const ref of Object.keys(state.progress)) {
    const [paperId, n] = ref.split(":");
    if (paperTotals[paperId] && Number(n) <= paperTotals[paperId]) revised += 1;
  }

  const pct = totalQuestions > 0 ? Math.round((revised / totalQuestions) * 100) : 0;

  return (
    <div className="progress-line">
      <span className="bar" style={{ ["--pct" as string]: `${pct}%` }} aria-hidden="true">
        <span />
      </span>
      <span className="progress-line__text">
        <strong>{revised}</strong> of {totalQuestions} questions revised
        {revised > 0 ? ` · ${pct}%` : ""}
      </span>
    </div>
  );
}
