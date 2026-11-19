import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell" style={{ padding: "72px 24px 96px", maxWidth: "40rem" }}>
      <p className="eyebrow">Nothing here</p>
      <h1>This page is not in the syllabus.</h1>
      <p className="lede" style={{ marginBottom: 28 }}>
        The page you asked for does not exist or has moved. The papers are all
        on the library shelf.
      </p>
      <Link href="/" className="btn">
        Back to the papers
      </Link>
    </main>
  );
}
