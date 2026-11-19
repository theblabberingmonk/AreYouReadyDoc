"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import AuthControls from "./AuthControls";
import SyncManager from "./SyncManager";

export default function SiteNav() {
  const pathname = usePathname();
  const isPapers = pathname === "/" || pathname.startsWith("/papers");
  const isBookmarks = pathname.startsWith("/bookmarks");

  return (
    <nav className="site-nav" aria-label="Primary">
      <Link href="/" aria-current={isPapers ? "page" : undefined}>
        Papers
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
