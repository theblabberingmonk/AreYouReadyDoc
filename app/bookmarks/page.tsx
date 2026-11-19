import type { Metadata } from "next";
import { getIndex } from "@/lib/content";
import BookmarksView from "@/components/BookmarksView";

export const metadata: Metadata = {
  title: "Bookmarks",
  description: "Your bookmarked questions and the review queue — Again and Hard ratings first.",
};

export default function BookmarksPage() {
  const index = getIndex();
  const papers = index.papers.map((p) => ({
    id: p.id,
    title: p.title,
    questions: p.questions.map((q) => ({ n: q.n, title: q.title })),
  }));
  return (
    <main className="shell" style={{ padding: "44px 24px 72px", maxWidth: "56rem" }}>
      <p className="eyebrow">Your shelf</p>
      <h1>Bookmarks and review.</h1>
      <p className="lede" style={{ marginBottom: 32 }}>
        Star a question while reading and it waits for you here. Questions you
        rated Again or Hard in a mock exam queue up for a second pass.
      </p>
      <BookmarksView papers={papers} />
    </main>
  );
}
