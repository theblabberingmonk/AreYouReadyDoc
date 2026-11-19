import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Inter, Source_Serif_4 } from "next/font/google";
import SiteNav from "@/components/SiteNav";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://areyoureadydoc.vercel.app"),
  title: {
    default: "DrNB Paediatric Surgery — Past papers, answered",
    template: "%s · DrNB Paediatric Surgery",
  },
  description:
    "Illustrated model answers to DrNB Paediatric Surgery final theory papers, with progress tracking, mock exams and syllabus-linked revision.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <ClerkProvider>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <header className="site-header">
            <div className="shell site-header__inner">
              <Link href="/" className="wordmark">
                DrNB Paediatric Surgery <small>Exam prep</small>
              </Link>
              <Suspense>
                <SiteNav />
              </Suspense>
            </div>
          </header>

          <div id="main-content">{children}</div>

          <footer className="site-footer">
            <div className="shell">
              <p>
                <strong>Questions © National Board of Examinations</strong>, reproduced for
                educational fair dealing. Model answers and illustrations are original work.
              </p>
              <p>For exam preparation only — not clinical guidance.</p>
              <nav className="site-footer__nav" aria-label="Footer">
                <Link href="/">Papers</Link>
                <Link href="/privacy">Privacy</Link>
              </nav>
            </div>
          </footer>
        </ClerkProvider>
      </body>
    </html>
  );
}
