"use client";

import Link from "next/link";
import { useStore, latestRatings, type Rating } from "@/lib/progress";

interface PaperInfo {
  id: string;
  title: string;
  questions: Array<{ n: number; title: string }>;
}

const RATING_LABEL: Record<Rating, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

export default function BookmarksView({ papers }: { papers: PaperInfo[] }) {
  const state = useStore();
  const byPaper = new Map(papers.map((p) => [p.id, p]));

  const bookmarked = Object.keys(state.bookmarks)
    .map((ref) => {
      const [paperId, sn] = ref.split(":");
      const paper = byPaper.get(paperId);
      const question = paper?.questions.find((q) => q.n === Number(sn));
      if (!paper || !question) return null;
      return { ref, paperId, n: Number(sn), paperTitle: paper.title, title: question.title };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.ref.localeCompare(b.ref));

  const ratings = latestRatings();
  const reviewQueue = Object.entries(ratings)
    .filter(([, rating]) => rating === "again" || rating === "hard")
    .map(([ref, rating]) => {
      const [paperId, sn] = ref.split(":");
      const paper = byPaper.get(paperId);
      const question = paper?.questions.find((q) => q.n === Number(sn));
      if (!paper || !question) return null;
      return { ref, paperId, n: Number(sn), paperTitle: paper.title, title: question.title, rating };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => (a.rating === b.rating ? a.ref.localeCompare(b.ref) : a.rating === "again" ? -1 : 1));

  return (
    <>
      <section aria-labelledby="review-again" style={{ marginBottom: 40 }}>
        <div className="session__head">
          <h2 id="review-again">Review again</h2>
          <span>{reviewQueue.length === 0 ? "queue clear" : `${reviewQueue.length} waiting`}</span>
        </div>
        {reviewQueue.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__title">Nothing waiting for a second pass.</p>
            <p>
              Questions you rate Again or Hard after a mock exam will queue up
              here, hardest first.
            </p>
          </div>
        ) : (
          <ul className="saved-list">
            {reviewQueue.map((item) => (
              <li key={item.ref}>
                <Link href={`/papers/${item.paperId}#q${item.n}`}>
                  <span className={`pill ${item.rating === "again" ? "pill--marks" : ""}`}>
                    {RATING_LABEL[item.rating]}
                  </span>
                  <span className="saved-list__title">{item.title}</span>
                  <span className="saved-list__meta">{item.paperTitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="bookmarked">
        <div className="session__head">
          <h2 id="bookmarked">Bookmarked</h2>
          <span>{bookmarked.length === 0 ? "none yet" : `${bookmarked.length} saved`}</span>
        </div>
        {bookmarked.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__title">No bookmarks yet.</p>
            <p>
              While reading a paper, tap the ☆ beside any question to keep it
              here for a quick revisit before the exam.
            </p>
            <Link href="/" className="btn" style={{ marginTop: 12 }}>
              Browse the papers
            </Link>
          </div>
        ) : (
          <ul className="saved-list">
            {bookmarked.map((item) => (
              <li key={item.ref}>
                <Link href={`/papers/${item.paperId}#q${item.n}`}>
                  <span className="saved-list__title">{item.title}</span>
                  <span className="saved-list__meta">{item.paperTitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
