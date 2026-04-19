"use client";

/**
 * RestSheet — replaces the simpler RestTimerBanner for the bold logger.
 * Countdown from a configurable target (default 90s), 56px ring, ±15s/+30s
 * pills, Skip button, "Up next" label for the next incomplete set. When the
 * elapsed time passes the target, the sheet switches to destructive color
 * and shows an overrun "+mm:ss" in red (nudges the user back to the bar).
 *
 * Bottom-center on mobile. Floating bottom-right on ≥640px so it doesn't
 * obscure the sticky action bar during desktop use.
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { MiniRing } from "./mini-ring";

const WARNING_AT_SECONDS = 180;
const MIN_TARGET_SECONDS = 15;

interface RestSheetProps {
  startedAt: number;
  target: number;
  nextLabel: string | null;
  onSkip: () => void;
  onAdjust: (deltaSeconds: number) => void;
}

function formatMmSs(totalSeconds: number, signPrefix: "" | "+" = ""): string {
  const abs = Math.max(0, totalSeconds);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  return `${signPrefix}${mins}:${secs.toString().padStart(2, "0")}`;
}

export function RestSheet({
  startedAt,
  target,
  nextLabel,
  onSkip,
  onAdjust,
}: RestSheetProps) {
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

  const remaining = target - elapsed;
  const overrun = remaining < 0;
  const progress = overrun ? 1 : elapsed / target;
  const warning = elapsed >= WARNING_AT_SECONDS;
  const ringColorClass = warning || overrun ? "text-destructive" : "text-brand";
  const eyebrow = overrun ? "Overrun — break it up" : "Rest";
  const mainTime = overrun
    ? formatMmSs(-remaining, "+")
    : formatMmSs(remaining);

  return (
    <div
      role="region"
      aria-label="Rest timer"
      data-testid="rest-sheet"
      className="fixed inset-x-4 bottom-24 z-30 rounded-2xl border bg-card p-4 shadow-[0_-10px_40px_rgba(0,0,0,.4)] sm:left-auto sm:right-6 sm:bottom-24 sm:w-80"
    >
      <button
        type="button"
        onClick={onSkip}
        aria-label="Dismiss rest timer"
        data-testid="rest-sheet-dismiss"
        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-center gap-3 pr-6">
        <span className={ringColorClass + " relative shrink-0"}>
          <MiniRing size={56} stroke={4} progress={progress} />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className={
                "font-mono text-xs font-semibold tabular-nums " +
                (overrun ? "text-destructive" : "text-foreground")
              }
            >
              {mainTime}
            </span>
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={
              "text-[10px] font-semibold uppercase tracking-[0.14em] " +
              (overrun ? "text-destructive" : "text-muted-foreground")
            }
          >
            {eyebrow}
          </p>
          <p className="mt-0.5 truncate text-xs text-foreground">
            {nextLabel ? (
              <>
                Up next{" "}
                <span className="text-muted-foreground">·</span> {nextLabel}
              </>
            ) : (
              <span className="text-muted-foreground">All sets done</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="shrink-0 rounded-md border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:border-foreground hover:text-foreground"
          aria-label="Skip rest"
        >
          Skip
        </button>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5">
        <AdjustPill label="-15s" onClick={() => onAdjust(-15)} disabled={target - 15 < MIN_TARGET_SECONDS} />
        <AdjustPill label="+15s" onClick={() => onAdjust(15)} />
        <AdjustPill label="+30s" onClick={() => onAdjust(30)} />
      </div>
    </div>
  );
}

function AdjustPill({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="font-mono text-[11px] font-medium rounded-md border px-2 py-1 text-muted-foreground transition hover:border-foreground hover:text-foreground disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground"
    >
      {label}
    </button>
  );
}
