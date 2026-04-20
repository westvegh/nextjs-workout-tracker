"use client";

import { useEffect, useState } from "react";
import { MiniRing } from "./mini-ring";

/**
 * Sticky bar anchored below the app nav. 40px tall, backdrop-blurred. Shows
 * elapsed session time, workout name, and a done/total progress indicator
 * with a 2px brand bar underneath. Nav is 56px tall so `top-14` slots this
 * immediately below it.
 *
 * Elapsed time ticks client-side from the `startedAt` prop so the server
 * doesn't need to send down a running clock. The parent initializes
 * startedAt once on mount.
 */

interface SessionStickyBarProps {
  startedAt: number;
  workoutName: string;
  done: number;
  total: number;
}

function formatElapsed(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    return `${hrs}:${(mins % 60).toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function SessionStickyBar({
  startedAt,
  workoutName,
  done,
  total,
}: SessionStickyBarProps) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  );

  useEffect(() => {
    function tick() {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }
    tick();
    const handle = window.setInterval(tick, 1000);
    return () => window.clearInterval(handle);
  }, [startedAt]);

  const progress = total > 0 ? done / total : 0;

  return (
    <div
      className="sticky top-14 z-20 -mx-4 border-b bg-background/85 backdrop-blur-md sm:-mx-6"
      data-testid="session-sticky-bar"
    >
      <div className="mx-auto flex h-10 max-w-2xl items-center gap-3 px-4 sm:px-6">
        <span className="font-mono text-xs font-medium text-muted-foreground tabular-nums">
          {formatElapsed(elapsed)}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium">
          {workoutName}
        </span>
        <span className="font-mono text-[11px] font-medium text-muted-foreground tabular-nums">
          {done}/{total}
        </span>
        <span className="text-brand" aria-label={`${done} of ${total} sets done`}>
          <MiniRing size={18} stroke={2} progress={progress} />
        </span>
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
        <div className="h-0.5 w-full bg-muted">
          <div
            className="h-full bg-brand transition-[width] duration-400"
            style={{ width: `${progress * 100}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
