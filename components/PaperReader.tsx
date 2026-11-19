"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Paper, Question } from "@/lib/content";
import { useStore, toggleRevised, refOf } from "@/lib/progress";

const ASSET_PREFIX = "assets/";

function assetUrl(src: string | undefined): string {
  if (!src) return "";
  return src.startsWith(ASSET_PREFIX) ? `/${src}` : src;
}

function AnswerMarkdown({ md }: { md: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noreferrer noopener">
            {children}
          </a>
        ),
        img: ({ src, alt }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(typeof src === "string" ? src : undefined)} alt={alt ?? ""} loading="lazy" />
        ),
        table: ({ children }) => (
          <div className="table-wrap">
            <table>{children}</table>
          </div>
        ),
      }}
    >
      {md}
    </ReactMarkdown>
  );
}

function Figure({
  paperId,
  question,
  onZoom,
}: {
  paperId: string;
  question: Question;
  onZoom: (src: string, alt: string) => void;
}) {
  const src = `/assets/img/${paperId}/q${String(question.n).padStart(2, "0")}.webp`;
  const alt = `Illustration for question ${question.n}: ${question.title}`;
  return (
    <figure className="figure">
      <button
        type="button"
        className="figure__btn"
        onClick={() => onZoom(src, alt)}
        aria-label={`Enlarge illustration for question ${question.n}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" />
      </button>
      <figcaption>
        <span>Figure · Question {question.n}</span>
        <span>Click to enlarge</span>
      </figcaption>
    </figure>
  );
}

export default function PaperReader({ paper }: { paper: Paper }) {
  const state = useStore();
  const total = paper.questions.length;

  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);

  // Deep links: /papers/01#q3 opens and focuses that question.
  useEffect(() => {
    const match = /^#q(\d+)$/.exec(window.location.hash);
    if (!match) return;
    const n = Number(match[1]);
    if (!paper.questions.some((q) => q.n === n)) return;
    setOpen((prev) => new Set(prev).add(n));
    requestAnimationFrame(() => {
      document.getElementById(`q${n}`)?.scrollIntoView({ block: "start" });
    });
  }, [paper.questions]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoom(null);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [zoom]);

  const revisedCount = useMemo(() => {
    let count = 0;
    for (let n = 1; n <= total; n += 1) {
      if (state.progress[refOf(paper.id, n)]?.revised) count += 1;
    }
    return count;
  }, [state.progress, paper.id, total]);

  const toggle = useCallback((n: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }, []);

  const allOpen = open.size === total;
  const pct = total > 0 ? Math.round((revisedCount / total) * 100) : 0;
  const fill = total > 0 ? revisedCount / total : 0;

  return (
    <>
      <div className="paper-toolbar">
        <div className="shell paper-toolbar__inner">
          <span className="progress-line__text">
            <strong>{revisedCount}</strong> of {total} revised
            {revisedCount === total && total > 0 ? " · paper complete" : ""}
          </span>
          <span className="bar" style={{ ["--fill" as string]: fill }} aria-hidden="true">
            <span />
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              setOpen(allOpen ? new Set() : new Set(paper.questions.map((q) => q.n)))
            }
          >
            {allOpen ? "Collapse all" : "Expand all answers"}
          </button>
        </div>
      </div>

      <div className="shell">
        <ol className="questions">
          {paper.questions.map((question) => {
            const isOpen = open.has(question.n);
            const revised = Boolean(state.progress[refOf(paper.id, question.n)]?.revised);
            return (
              <li className="question" id={`q${question.n}`} key={question.n}>
                <div className="question__head">
                  <button
                    type="button"
                    className="question__main"
                    aria-expanded={isOpen}
                    aria-controls={`q${question.n}-body`}
                    onClick={() => toggle(question.n)}
                  >
                    <span className="question__num">{String(question.n).padStart(2, "0")}</span>
                    <span>
                      <span className="question__title">{question.title}</span>
                      <span className="question__sub">
                        {question.marks ? (
                          <span className="pill pill--marks">[{question.marks}]</span>
                        ) : null}
                        {question.has_image ? <span className="pill">Illustration</span> : null}
                        {revised ? <span className="pill pill--done">Revised</span> : null}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="revised-toggle"
                    aria-pressed={revised}
                    aria-label={`${revised ? "Unmark" : "Mark"} question ${question.n} as revised`}
                    onClick={() => toggleRevised(paper.id, question.n)}
                  >
                    <span className="dot" aria-hidden="true">
                      {revised ? "✓" : ""}
                    </span>
                    {revised ? "Revised" : "Mark revised"}
                  </button>
                </div>

                {isOpen ? (
                  <div className="question__body" id={`q${question.n}-body`}>
                    {question.prompt ? <p className="prompt">{question.prompt}</p> : null}
                    <div className="prose">
                      <AnswerMarkdown md={question.body_md} />
                    </div>
                    {question.has_image ? (
                      <Figure paperId={paper.id} question={question} onZoom={(src, alt) => setZoom({ src, alt })} />
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      {zoom ? (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Illustration"
          onClick={() => setZoom(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.src} alt={zoom.alt} />
        </div>
      ) : null}
    </>
  );
}
