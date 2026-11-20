"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { consumeChat } from "@/lib/ai/client-stream";
import type { Conversation, Quota, Turn } from "@/lib/ai/contracts";

type State = { conversations: Conversation[]; quota?: Quota; enabled: boolean };
export default function StudyChat() {
  const [state, setState] = useState<State>({ conversations: [], enabled: false });
  const [conversation, setConversation] = useState<string>();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [partial, setPartial] = useState("");
  const [interrupted, setInterrupted] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const abort = useRef<AbortController | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const retry = useRef<{ id: string; text: string; conversationId?: string } | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  async function refresh() {
    const response = await fetch("/api/ai/chat", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Unable to load study chat.");
    setState(data);
  }
  useEffect(() => { let active = true; (async () => {
    try {
      const response = await fetch("/api/ai/chat", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load study chat.");
      if (active) setState(data);
    } catch(e) { if (active) setError(e instanceof Error ? e.message : "Unable to connect."); }
    finally { if (active) setLoading(false); }
  })(); return () => { active = false; }; }, []);
  useEffect(() => { if (pinned.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [turns, pending, partial]);
  useEffect(() => () => abort.current?.abort(), []);

  async function open(id: string) {
    if (inFlight.current) return;
    inFlight.current = true; setLoading(true); setError(""); setConfirmDelete(false);
    try {
      const response = await fetch(`/api/ai/chat?conversationId=${id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setConversation(id); setTurns(data.turns); setDraft(""); setPartial(""); setInterrupted(false); retry.current = null;
      setState(s => ({ ...s, quota: data.quota, enabled: data.enabled }));
    } catch(e) { setError(e instanceof Error ? e.message : "Unable to load conversation."); }
    finally { inFlight.current = false; setLoading(false); }
  }
  function newChat() {
    if (inFlight.current) return;
    setConversation(undefined); setTurns([]); setDraft(""); setError(""); setConfirmDelete(false); setPartial(""); setInterrupted(false); retry.current = null;
  }
  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || inFlight.current || !state.enabled || state.quota?.remaining === 0) return;
    const attempt = retry.current?.text === text && retry.current.conversationId === conversation ? retry.current : { id: crypto.randomUUID(), text, conversationId: conversation };
    retry.current = attempt;
    inFlight.current = true; setBusy(true); setPending(text); setPartial(""); setInterrupted(false); setError(""); pinned.current = true;
    abort.current = new AbortController();
    try {
      const response = await fetch("/api/ai/chat", { signal: abort.current.signal, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: attempt.id, conversationId: attempt.conversationId, message: text }) });
      if (!response.ok) {
        const data = await response.json();
        if (data.code !== "busy") retry.current = null;
        throw new Error(data.error ?? "Unable to answer. Please try again.");
      }
      if (!response.body) throw new Error("Missing chat response.");
      await consumeChat(response.body, event => {
        if (event.type === "delta") setPartial(p => p + event.text);
        if (event.type === "error") {
          if (event.code !== "busy" && event.code !== "interrupted") retry.current = null;
          throw new Error(event.error);
        }
        if (event.type === "done") {
          setConversation(event.conversationId); setPending("");
          if (event.turn) setTurns(ts => ts.some(t => t.id === event.turn.id) ? ts : [...ts, event.turn]);
          setState(s => ({ ...s, quota: event.quota })); setDraft(""); setPartial(""); setInterrupted(false); retry.current = null;
        }
      });
      try { await refresh(); } catch { /* Reply remains usable if list refresh fails. */ }
    } catch(e) { setInterrupted(true); setError(e instanceof Error && e.name !== "AbortError" ? e.message : "Answer stopped. Partial text is not a saved answer; you can retry."); }
    finally { inFlight.current = false; setBusy(false); setPending(""); }
  }
  async function remove() {
    if (!conversation || inFlight.current) return;
    inFlight.current = true; setDeleting(true); setError("");
    try {
      const response = await fetch("/api/ai/chat", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: conversation }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setConversation(undefined); setTurns([]); setDraft(""); setConfirmDelete(false); setPartial(""); setInterrupted(false); retry.current = null;
      await refresh();
    } catch(e) { setError(e instanceof Error ? e.message : "Unable to delete."); }
    finally { inFlight.current = false; setDeleting(false); }
  }
  const unavailable = loading || busy || deleting || !state.enabled || state.quota?.remaining === 0;
  return <>
    <div className="chat-heading"><div><p className="eyebrow">Your revision companion</p><h1>Let’s work it through.</h1><p className="muted">A clearer explanation. A sharper viva answer. One question at a time.</p></div>
      <div className="chat-allowance" aria-live="polite"><strong>{state.quota ? `${state.quota.remaining} / 10` : "—"}</strong><span>questions left this week</span><small>Resets Monday · 00:00 UTC</small></div>
    </div>
    <div className="chat-layout">
      <aside className="chat-sidebar"><button className="btn btn-primary" disabled={busy || loading || deleting} onClick={newChat}>+ New conversation</button><p className="eyebrow">Your conversations</p>
        <nav aria-label="Saved conversations">{state.conversations.map(c => <button key={c.id} disabled={busy || loading || deleting} aria-current={conversation === c.id ? "page" : undefined} onClick={() => open(c.id)}>{c.title}</button>)}</nav>
        {!state.conversations.length && <p className="muted">Your conversations will be saved here, just for you.</p>}
        <p className="chat-sidebar-note">Chat and “Explain deeper” share your 10 weekly questions. Each follow-up uses one question.</p>
      </aside>
      <section className="chat-panel" aria-label="Study conversation" aria-busy={busy || loading}>
        <div className="chat-toolbar"><span>{conversation ? "Study conversation" : "A fresh page"}</span>{conversation && <button className="btn btn-ghost btn-sm" disabled={busy || loading || deleting} onClick={() => setConfirmDelete(!confirmDelete)}>Delete conversation</button>}</div>
        {confirmDelete && <div className="chat-notice"><p>Delete these messages? Your weekly question count will stay the same.</p><button className="btn btn-ghost btn-sm" disabled={deleting} onClick={remove}>{deleting ? "Deleting…" : "Delete messages"}</button><button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Keep conversation</button></div>}
        <div className="chat-transcript" ref={scroll} onScroll={() => { const el = scroll.current; if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }} role="log" aria-label="Messages" aria-live="off">
          {loading ? <p className="muted">Loading your study space…</p> : !turns.length && !pending ? <div className="chat-welcome"><span className="chat-symbol" aria-hidden="true">✳</span><h2>What would you like<br/>to understand better?</h2><p>Ask about a concept, compare two conditions, or practise an answer for your viva.</p><div className="chat-starters">{["Compare gastroschisis and omphalocele", "Quiz me on posterior urethral valves", "Explain the embryology of malrotation"].map(text => <button key={text} disabled={unavailable} onClick={() => setDraft(text)}>{text}<span aria-hidden="true">↗</span></button>)}</div></div> : null}
          {turns.map(t => <div key={t.id} className="chat-turn"><div className="chat-user"><span>You</span><p>{t.prompt}</p></div><div className="chat-answer"><p className="eyebrow">Study tutor · AI-generated</p><div className="prose"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: () => null, a: ({ children }) => <span>{children}</span> }}>{t.reply}</ReactMarkdown></div>{t.sources?.length > 0 && <div className="chat-sources"><span>Related published answers</span>{t.sources.map(s => <Link key={s.ref} href={s.href}>{s.title} ↗</Link>)}</div>}</div></div>)}
          {pending && <div className="chat-turn"><div className="chat-user"><span>You</span><p>{pending}</p></div><div className="chat-answer"><p className="eyebrow">Study tutor · {partial ? "Writing your answer" : "Thinking"}<span className="chat-typing" aria-hidden="true"> ●</span></p>{partial ? <div className="prose"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: () => null, a: ({ children }) => <span>{children}</span> }}>{partial}</ReactMarkdown><span className="chat-caret" aria-hidden="true"/></div> : <p className="muted">Working through your question…</p>}<button type="button" className="btn btn-ghost btn-sm" onClick={() => abort.current?.abort()}>Stop generating</button></div></div>}<div ref={end}/>
        </div>
        {interrupted && partial && <div className="chat-interrupted"><p className="eyebrow">Interrupted · partial answer, not saved</p><div className="prose"><ReactMarkdown components={{ img: () => null, a: ({ children }) => <span>{children}</span> }}>{partial}</ReactMarkdown></div></div>}
        <span className="sr-only" role="status">{busy ? "Answer is streaming. You can stop generation." : ""}</span>
        {error && <div className="chat-notice" role="alert">{error}{!state.quota && <button className="btn btn-ghost btn-sm" onClick={() => { setError(""); refresh().catch(() => setError("Unable to connect. Please try again.")); }}>Try again</button>}</div>}
        {!loading && !state.enabled && !error && <p className="chat-notice">Study chat is being set up. Your published answers are ready in the library.</p>}
        {state.quota?.remaining === 0 && <p className="chat-notice">You’ve used this week’s 10 questions. Your allowance resets {new Date(state.quota.resetsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.</p>}
        <form className="chat-composer" onSubmit={send}><label className="sr-only" htmlFor="chat-message">Your paediatric surgery question</label><textarea id="chat-message" placeholder="Ask a paediatric surgery question…" rows={3} maxLength={3000} value={draft} disabled={loading || busy || deleting} onChange={e => setDraft(e.target.value)}/><div><small>{draft.length.toLocaleString()} / 3,000</small><button className="btn btn-primary" disabled={unavailable || !draft.trim()}>{busy ? "Thinking…" : "Ask question ↗"}</button></div></form>
        <p className="chat-footnote">For exam preparation, not patient care. AI can make mistakes; check the published references. Messages are saved to your account and sent to our AI provider. Please omit patient details.</p>
      </section>
    </div>
  </>;
}
