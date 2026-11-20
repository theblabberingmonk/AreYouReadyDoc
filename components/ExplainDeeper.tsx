"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; body: string }
  | { kind: "error"; message: string; retryable: boolean };

export default function ExplainDeeper({ paperId, n }: { paperId: string; n: number }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const requestId = useRef<string | null>(null);

  const ask = async () => {
    requestId.current ??= crypto.randomUUID();
    setStatus({ kind: "loading" });
    try {
      const response = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ref: `${paperId}:${n}`, requestId: requestId.current }),
      });
      const payload = (await response.json()) as { body_md?: string; error?: string; retryable?: boolean; code?: string };
      if (response.ok && payload.body_md) {
        setStatus({ kind: "done", body: payload.body_md });
      } else {
        if (payload.code !== "busy") requestId.current = null;
        setStatus({
          kind: "error",
          message: payload.error ?? "AI is unavailable right now.",
          retryable: response.status === 409 || response.status === 502 || response.status === 503,
        });
      }
    } catch {
      setStatus({
        kind: "error",
        message: "AI is unavailable right now — check your connection.",
        retryable: true,
      });
    }
  };

  const sendFeedback = async (helpful: boolean) => {
    setFeedback(helpful ? "up" : "down");
    try {
      await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ref: `${paperId}:${n}`, helpful }),
      });
    } catch {
      /* feedback is best-effort */
    }
  };

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <div className="ai-block ai-block--signedout">
        <p>
          <strong>Want the why behind this answer?</strong> AI elaborations are
          available after sign in — the published answer above is complete on
          its own.
        </p>
        <Link href="/sign-in" className="btn btn-ghost btn-sm">
          Sign in
        </Link>
      </div>
    );
  }

  if (status.kind === "idle") {
    return (
      <div className="ai-block">
        <button type="button" className="btn btn-ghost btn-sm" onClick={ask}>
          Explain deeper with AI · 1 weekly question
        </button>
      </div>
    );
  }

  if (status.kind === "loading") {
    return (
      <div className="ai-block" aria-live="polite" aria-busy="true">
        <p className="eyebrow">AI elaboration</p>
        <div className="ai-skeleton" aria-label="Loading AI explanation">
          <span style={{ width: "92%" }} />
          <span style={{ width: "98%" }} />
          <span style={{ width: "84%" }} />
          <span style={{ width: "90%" }} />
        </div>
      </div>
    );
  }

  if (status.kind === "error") {
    return (
      <div className="ai-block">
        <p className="eyebrow">AI elaboration</p>
        <p>{status.message}</p>
        {status.retryable ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={ask}>
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="ai-block ai-block--done">
      <p className="eyebrow">
        <strong>AI elaboration</strong> · grounded in the answer above
      </p>
      <div className="prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: () => null, a: ({ children }) => <span>{children}</span> }}>{status.body}</ReactMarkdown>
      </div>
      <p className="muted ai-disclaimer">
        AI-generated elaboration for exam preparation — not clinical guidance.
      </p>
      {feedback === null ? (
        <div className="ai-feedback" role="group" aria-label="Was this elaboration helpful?">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => sendFeedback(true)} aria-label="Helpful">
            Helpful
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => sendFeedback(false)} aria-label="Not helpful">
            Not helpful
          </button>
        </div>
      ) : (
        <p className="muted" style={{ fontSize: "0.8rem" }}>
          Thanks — your feedback tunes future explanations.
        </p>
      )}
    </div>
  );
}
