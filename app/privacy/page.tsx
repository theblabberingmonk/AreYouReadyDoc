import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Plain English privacy note: what this site stores, where it lives, and what never leaves your device.",
};

export default function PrivacyPage() {
  return (
    <main className="shell" style={{ padding: "48px 24px 72px", maxWidth: "44rem" }}>
      <p className="eyebrow">Privacy</p>
      <h1>What we keep, in plain English.</h1>
      <div className="prose" style={{ marginTop: 20 }}>
        <h2>Your revision record</h2>
        <p>
          Questions you mark as revised, bookmarks and notes are stored{" "}
          <strong>in your own browser</strong> (local storage). Your account is required to access the study material; when signed in,
          these changes are also sent to our database so your record follows you across devices.
        </p>
        <h2>If you sign in</h2>
        <p>
          Sign-in is handled by Clerk. Your revision record is then synced to
          our database (Supabase) so it follows you across devices. We store
          only what the site needs to function: your account identifier, your
          revision marks, bookmarks, notes and mock exam attempts.
        </p>
        <h2>AI study chat</h2>
        <p>When you use Ask AI or Explain deeper, your question, relevant published
          study excerpts and recent conversation history are sent to our AI provider,
          OpenCode. The selected MiMo Flash model currently lists no training on
          requests and zero data retention at the model provider. We save your chat
          messages and answers in Supabase under your account so you can reopen them.
          Please do not enter patient identifiers or confidential clinical information.</p>
        <p>You can delete a conversation from Ask AI. This removes its message
          content; minimal usage records remain to enforce the weekly allowance.
          Provider processing is governed by its own terms and privacy policy.</p>
        <h2>What we never do</h2>
        <ul>
          <li>No advertising trackers. Ever.</li>
          <li>We never sell personal data — we do not use your study activity for advertising.</li>
          <li>Notes you write are private to your account.</li>
        </ul>
        <h2>Analytics</h2>
        <p>
          We use privacy respecting, cookie free page analytics (Vercel
          Analytics) to see which papers get read. That is all.
        </p>
      </div>
    </main>
  );
}
