import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import type { Metadata } from "next";
export const metadata:Metadata={title:"Official NBEMS syllabus"};
const documents={
  six:{title:"Direct 6 Year",pages:16,url:"https://nbe.edu.in/mainpdf/curriculum/DrNB%20-%20Pediatric%20Surgery%20(6%20year).pdf"},
  three:{title:"Post-MS/DNB · 3 Year",pages:34,url:"https://nbe.edu.in/mainpdf/curriculum/DrNB%20-%20Pediatric%20Surgery%20(3%20year).pdf"},
};
export default async function SyllabusPage({searchParams}:{searchParams:Promise<{track?:string}>}) {
  await auth.protect();
  const track=(await searchParams).track==="three"?"three":"six";
  const document=documents[track];
  return <main className="shell syllabus-page"><p className="eyebrow">The official curriculum</p><h1>Your syllabus.<br/>Straight from NBEMS.</h1><p className="muted">The complete original curriculum, including the syllabus, training requirements and reading list. Wording and page order are preserved in the official PDF below.</p>
    <nav className="syllabus-tabs" aria-label="Curriculum track">{Object.entries(documents).map(([key,d])=><Link key={key} href={`/syllabus?track=${key}`} aria-current={track===key?"page":undefined}>{d.title}</Link>)}</nav>
    <div className="syllabus-source"><p><strong>DrNB Paediatric Surgery · {document.title}</strong><br/><span className="muted">{document.pages} pages · Source: NBEMS · Link verified 19 November 2026</span></p><a className="btn btn-primary" href={document.url} target="_blank" rel="noopener noreferrer">Open official PDF ↗</a></div>
    <div className="syllabus-document"><span className="eyebrow">Original NBEMS document</span><h2>Every page. The original wording.</h2><p>NBEMS restricts embedded viewing on other websites. Open the complete curriculum directly on its official website to read, search or download all {document.pages} pages.</p><a className="btn btn-primary" href={document.url} target="_blank" rel="noopener noreferrer">Read the complete syllabus ↗</a></div>
    <p className="muted">The official document opens in a new tab. <a href="https://nbe.edu.in/curriculum.html" target="_blank" rel="noopener noreferrer">View the NBEMS curriculum directory ↗</a></p>
  </main>;
}
