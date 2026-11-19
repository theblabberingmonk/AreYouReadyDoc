"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStore, addAttempt, RATINGS, type Rating } from "@/lib/progress";

export const EXAM_SECONDS = 3 * 60 * 60;
const MOCK_KEY = "drnb.mock.v1";

interface Prompt {
  n: number;
  title: string;
  marks: string;
  prompt: string;
}

interface Answer extends Prompt {
  body_md: string;
}

function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${h}:${pad(m)}:${pad(s)}`;
}

function loadResume(paperId: string): number | null {
  try {
    const raw = window.localStorage.getItem(MOCK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { paperId: string; startedAt: number };
    if (parsed.paperId !== paperId) return null;
    const elapsed = Math.floor((Date.now() - parsed.startedAt) / 1000);
    if (elapsed >= EXAM_SECONDS) return null;
    return parsed.startedAt;
  } catch {
    return null;
  }
}

export default function MockSession({
  paperId,
  paperTitle,
  prompts,
}: {
  paperId: string;
  paperTitle: string;
  prompts: Prompt[];
}) {
  const state = useStore();
  const [phase, setPhase] = useState<"intro" | "running" | "review">("intro");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [current, setCurrent] = useState(1);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [answers, setAnswers] = useState<Answer[] | null>(null);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [saved, setSaved] = useState(false);

  const remaining = startedAt === null ? EXAM_SECONDS : EXAM_SECONDS - Math.floor((now - startedAt) / 1000);

  const endExam = useCallback(() => {
    try {
      window.localStorage.removeItem(MOCK_KEY);
    } catch {
      /* ignore */
    }
    setPhase("review");
    setConfirmEnd(false);
  }, []);

  useEffect(() => {
    if (phase !== "running") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "running" && remaining <= 0) endExam();
  }, [phase, remaining, endExam]);

  const begin = useCallback(() => {
    const at = Date.now();
    try {
      window.localStorage.setItem(MOCK_KEY, JSON.stringify({ paperId, startedAt: at }));
    } catch {
      /* private mode — exam still runs */
    }
    setStartedAt(at);
    setNow(at);
    setCurrent(1);
    setConfirmEnd(false);
    setPhase("running");
  }, [paperId]);

  const resume = useCallback(() => {
    const at = loadResume(paperId);
    if (at === null) {
      begin();
      return;
    }
    setStartedAt(at);
    setNow(Date.now());
    setPhase("running");
  }, [paperId, begin]);

  const hasResume = useMemo(() => {
    if (typeof window === "undefined") return false;
    return loadResume(paperId) !== null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperId, phase]);

  useEffect(() => {
    if (phase !== "review" || answers !== null) return;
    fetch(`/api/papers/${paperId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (payload?.paper?.questions) setAnswers(payload.paper.questions);
      })
      .catch(() => {
        /* review shows prompts with a retry */
      });
  }, [phase, answers, paperId]);

  const saveAttempt = useCallback(() => {
    if (startedAt === null || saved) return;
    addAttempt({
      paper_id: paperId,
      started_at: new Date(startedAt).toISOString(),
      ended_at: new Date().toISOString(),
      ratings,
    });
    setSaved(true);
  }, [startedAt, saved, paperId, ratings]);

  const history = useMemo(
    () => state.attempts.filter((a) => a.paper_id === paperId).slice().reverse(),
    [state.attempts, paperId],
  );

  if (phase === "intro") {
    return (
      <div style={{ maxWidth: "44rem" }}>
        <h1>Mock exam</h1>
        <p className="lede" style={{ marginBottom: 20 }}>
          {paperTitle}. Ten questions, three hours, prompts only — exactly like
          the hall. When time ends, the model answers unlock for self review.
        </p>
        <div className="mock-rules">
          <ul>
            <li>Write your answers on paper before looking at anything here.</li>
            <li>You can move between questions freely until time runs out.</li>
            <li>Ending early is allowed. Refreshing resumes the clock.</li>
          </ul>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
          <button type="button" className="btn" onClick={begin}>
            Begin 3 hour exam
          </button>
          {hasResume ? (
            <button type="button" className="btn btn-ghost" onClick={resume}>
              Resume in progress exam
            </button>
          ) : null}
        </div>
        {history.length > 0 ? <AttemptHistory history={history} /> : null}
      </div>
    );
  }

  if (phase === "running") {
    const question = prompts.find((q) => q.n === current) ?? prompts[0];
    const urgent = remaining < 15 * 60;
    return (
      <>
        <div className="mock-toolbar">
          <div className="shell mock-toolbar__inner">
            <span className={`mock-clock${urgent ? " mock-clock--urgent" : ""}`} role="timer" aria-live="off">
              {formatClock(remaining)}
            </span>
            <span className="mock-dots" role="tablist" aria-label="Questions">
              {prompts.map((q) => (
                <button
                  key={q.n}
                  type="button"
                  role="tab"
                  aria-selected={q.n === current}
                  aria-label={`Question ${q.n}`}
                  className={`mock-dot${q.n === current ? " mock-dot--active" : ""}`}
                  onClick={() => setCurrent(q.n)}
                >
                  {q.n}
                </button>
              ))}
            </span>
            {confirmEnd ? (
              <span className="mock-end">
                <span className="muted" style={{ fontSize: "0.8rem" }}>End and review?</span>
                <button type="button" className="btn btn-sm" onClick={endExam}>
                  Yes, end exam
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmEnd(false)}>
                  Keep writing
                </button>
              </span>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmEnd(true)}>
                End exam
              </button>
            )}
          </div>
        </div>
        <div className="shell" style={{ maxWidth: "44rem" }}>
          <p className="eyebrow" style={{ marginTop: 32 }}>
            Question {question.n} of {prompts.length}
            {question.marks ? ` · [${question.marks}]` : ""}
          </p>
          <h1 style={{ fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)" }}>{question.title}</h1>
          <p className="prompt">{question.prompt}</p>
          <div className="mock-pager">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={current <= 1}
              onClick={() => setCurrent((c) => Math.max(1, c - 1))}
            >
              ← Previous
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={current >= prompts.length}
              onClick={() => setCurrent((c) => Math.min(prompts.length, c + 1))}
            >
              Next →
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={{ maxWidth: "48rem" }}>
      <h1>Self review</h1>
      <p className="lede" style={{ marginBottom: 8 }}>
        Compare what you wrote against the model answers. Rate each question
        honestly — Again and Hard join your review queue.
      </p>
      {answers === null ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p className="empty-state__title">Answers did not load.</p>
          <p>Your attempt is safe. Check your connection and retry.</p>
          <button type="button" className="btn" style={{ marginTop: 12 }} onClick={() => window.location.reload()}>
            Retry loading answers
          </button>
        </div>
      ) : (
        <>
          <ol className="mock-review">
            {answers.map((answer) => (
              <li key={answer.n} className="mock-review__item">
                <h2>
                  {answer.n}. {answer.title}
                </h2>
                <p className="prompt">{answer.prompt}</p>
                <div className="prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer.body_md}</ReactMarkdown>
                </div>
                <div className="mock-rate" role="group" aria-label={`Rate question ${answer.n}`}>
                  {RATINGS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      className={`mock-rate__btn${ratings[String(answer.n)] === value ? " mock-rate__btn--active" : ""}`}
                      aria-pressed={ratings[String(answer.n)] === value}
                      onClick={() =>
                        setRatings((prev) => ({ ...prev, [String(answer.n)]: value }))
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <div className="mock-save">
            {saved ? (
              <p>
                <span className="pill pill--done">Attempt saved</span>{" "}
                <Link href={`/papers/${paperId}`} style={{ color: "var(--accent-ink)", fontWeight: 600 }}>
                  Back to the paper →
                </Link>
              </p>
            ) : (
              <button type="button" className="btn" onClick={saveAttempt}>
                Save attempt with ratings
              </button>
            )}
          </div>
        </>
      )}
      {history.length > 0 ? <AttemptHistory history={history} /> : null}
    </div>
  );
}

function AttemptHistory({
  history,
}: {
  history: Array<{ paper_id: string; started_at: string; ended_at: string | null; ratings?: Record<string, string> }>;
}) {
  return (
    <section aria-label="Past attempts" style={{ marginTop: 40 }}>
      <div className="session__head">
        <h2>Past attempts</h2>
        <span>{history.length}</span>
      </div>
      <ul className="saved-list">
        {history.map((attempt) => {
          const ratings = attempt.ratings ?? {};
          const again = Object.values(ratings).filter((r) => r === "again" || r === "hard").length;
          const mins = attempt.ended_at
            ? Math.max(1, Math.round((new Date(attempt.ended_at).getTime() - new Date(attempt.started_at).getTime()) / 60000))
            : null;
          return (
            <li key={`${attempt.paper_id}-${attempt.started_at}`}>
              <span className="saved-static">
                <span className="saved-list__title">
                {new Date(attempt.started_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span className="saved-list__meta">
                {mins !== null ? `${mins} min · ` : ""}
                {Object.keys(ratings).length > 0
                  ? `${Object.keys(ratings).length} rated${again > 0 ? `, ${again} need review` : ", all solid"}`
                  : "no ratings"}
              </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
