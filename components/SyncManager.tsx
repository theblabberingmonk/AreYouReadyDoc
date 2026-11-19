"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { subscribe } from "@/lib/progress";
import { pullAndMerge, pushDirty, type SyncStatus } from "@/lib/sync";

/**
 * Invisible background worker: pulls on sign-in, pushes dirty ops debounced.
 * Renders only a tiny status dot next to the auth controls.
 */
export default function SyncManager() {
  const { isSignedIn } = useAuth();
  const [status, setStatus] = useState<SyncStatus>("off");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signedIn = isSignedIn === true;

  useEffect(() => {
    if (!signedIn) {
      setStatus("off");
      return;
    }
    let cancelled = false;
    setStatus("pending");
    pullAndMerge()
      .then((ok) => {
        if (!cancelled) setStatus(ok ? "idle" : "error");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    const push = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setStatus("pending");
        pushDirty()
          .then((ok) => {
            if (!cancelled) setStatus(ok ? "idle" : "error");
          })
          .catch(() => {
            if (!cancelled) setStatus("error");
          });
      }, 1500);
    };

    const unsubscribe = subscribe(push);
    window.addEventListener("online", push);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") push();
    });
    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener("online", push);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [signedIn]);

  if (status === "off") return null;
  return (
    <span
      className={`sync-dot sync-dot--${status}`}
      role="status"
      aria-label={
        status === "pending"
          ? "Syncing"
          : status === "error"
            ? "Sync failed — your record is safe on this device and will retry"
            : "Synced"
      }
      title={
        status === "pending"
          ? "Syncing…"
          : status === "error"
            ? "Sync failed — retrying automatically"
            : "Synced across devices"
      }
    />
  );
}
