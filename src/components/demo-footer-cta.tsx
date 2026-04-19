"use client";

import { useCallback, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { track } from "@/lib/posthog/events";

const STORAGE_KEY = "wt_demo_footer_dismissed_v1";
const API_URL = "https://exerciseapi.dev";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  // SSR cannot know whether the visitor has dismissed; hide until hydration.
  return true;
}

export function DemoFooterCta() {
  const dismissed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const handleDismiss = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
      // Storage events don't fire in the same tab; dispatch a synthetic one.
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    } catch {
      // ignore
    }
  }, []);

  if (dismissed) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 hidden justify-center px-4 sm:flex">
      <div className="pointer-events-auto flex max-w-2xl items-center gap-3 rounded-full border bg-background/95 px-4 py-2 text-sm shadow-md backdrop-blur">
        <p className="text-muted-foreground">
          Built with{" "}
          <a
            href={API_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => track.apiKeyClicked("footer")}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            exerciseapi.dev
          </a>
          . Get an API key to build your own{" "}
          <a
            href={API_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => track.apiKeyClicked("footer")}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            &rarr;
          </a>
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
