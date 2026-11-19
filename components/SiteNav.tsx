"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import AuthControls from "./AuthControls";
import SyncManager from "./SyncManager";

export default function SiteNav() {
  const pathname = usePathname();
  const isPapers = pathname === "/library" || pathname.startsWith("/papers");
  const isLearn = pathname.startsWith("/learn");
  const isTopics = pathname.startsWith("/topics");
  const isSearch = pathname.startsWith("/search");
  const isBookmarks = pathname.startsWith("/bookmarks");

  return (
    <nav className="site-nav" aria-label="Primary">
      <Link href="/library" aria-current={isPapers ? "page" : undefined}>
        Papers
      </Link>
      <Link href="/learn" aria-current={isLearn ? "page" : undefined}>
        Learn
      </Link>
      <Link href="/topics" aria-current={isTopics ? "page" : undefined}>
        Topics
      </Link>
      <Link href="/search" aria-current={isSearch ? "page" : undefined}>
        Search
      </Link>
      <Link href="/bookmarks" aria-current={isBookmarks ? "page" : undefined}>
        Bookmarks
      </Link>
      <Suspense>
        <SyncManager />
        <AuthControls />
      </Suspense>
    </nav>
  );
}
