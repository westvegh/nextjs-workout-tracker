"use client";

/**
 * RestTimerBanner — ports the React Native RestTimerBanner from the
 * workout-app. Count-up M:SS, switches to destructive color after 3 minutes
 * to nudge the user back under the bar. Dismissable via the X button.
 *
 * Anchored as a bottom bar with safe-area padding so it clears the home
 * indicator on iOS. The logger stacks this above the sticky Save / Finish
 * bar.
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const WARNING_THRESHOLD_SECONDS = 180;

interface RestTimerBannerProps {
  /** When the timer started. The banner computes elapsed live from this. */
  startedAt: number;
  onDismiss: () => void;
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function RestTimerBanner({ startedAt, onDismiss }: RestTimerBannerProps) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  );

  useEffect(() => {
    function tick() {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const isWarning = elapsed >= WARNING_THRESHOLD_SECONDS;

  return (
    <div
      role="timer"
      aria-label="Rest timer"
      className="sticky bottom-20 mt-4 flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm sm:bottom-24"
    >
      <div className="flex items-baseline gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Rest
        </span>
        <span
          className={
            "font-mono text-2xl font-bold tabular-nums " +
            (isWarning ? "text-destructive" : "text-foreground")
          }
        >
          {formatTime(elapsed)}
        </span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Dismiss rest timer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
