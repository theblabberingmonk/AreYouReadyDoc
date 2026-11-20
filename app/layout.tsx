import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Inter, Source_Serif_4 } from "next/font/google";
import PreparationTracker from "@/components/PreparationTracker";
import SiteHeader from "@/components/SiteHeader";
import PublicNav from "@/components/PublicNav";
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
    default: "AreYouReadyDoc — Your DrNB study space",
    template: "%s · AreYouReadyDoc",
  },
  description:
    "Illustrated model answers to DrNB Paediatric Surgery final theory papers, with progress tracking, mock exams and syllabus-linked revision.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/library"
          signUpFallbackRedirectUrl="/library"
          appearance={{ variables: { colorPrimary: "#20564d", colorForeground: "#253c37", colorBackground: "#ffffff", borderRadius: "0.75rem", fontFamily: "var(--font-sans), sans-serif" } }}
        >
          <PreparationTracker />
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <header className="site-header">
            <div className="shell site-header__inner">
              <Link href="/" className="wordmark">
                <span className="brand-mark" aria-hidden="true">a<span>r</span></span>
                <span className="brand-name">AreYouReady<span>Doc</span><small>DrNB Paediatric Surgery</small></span>
              </Link>
              <Suspense fallback={<PublicNav />}>
                <SiteHeader />
              </Suspense>
            </div>
          </header>

          <div id="main-content">{children}</div>

          <footer className="site-footer">
            <div className="shell">
              <div className="footer-top"><Link href="/" className="footer-brand">AreYouReadyDoc<span>A little more prepared, every day.</span></Link><nav className="site-footer__nav" aria-label="Footer"><Link href="/#features">About the study space</Link><Link href="/privacy">Privacy</Link><Link href="/sign-in">Sign in</Link></nav></div>
              <div className="footer-bottom"><p>For exam preparation only. Not clinical guidance.</p><p>Questions © National Board of Examinations. Reproduced for educational fair dealing.</p></div>
            </div>
          </footer>
        </ClerkProvider>
      </body>
    </html>
  );
}
