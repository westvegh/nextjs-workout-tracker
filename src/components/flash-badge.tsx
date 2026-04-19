"use client";

/**
 * FlashBadge — transient toast fired when a set is checked off.
 * Centered overlay, 1.4s lifecycle: fade/slide in 15%, hold 70%, fade/rise
 * out 15%. Keyed on `flash.ts` so the animation restarts on each new event.
 *
 * Lifetime is owned by the caller: pass `flash=null` to unmount. Parent
 * typically clears flash after the 1.4s window via setTimeout.
 */

import { Check, Trophy } from "lucide-react";

export interface FlashState {
  text: string;
  subtext?: string;
  isPR?: boolean;
  ts: number;
}

interface FlashBadgeProps {
  flash: FlashState | null;
}

export const FLASH_DURATION_MS = 1400;

export function FlashBadge({ flash }: FlashBadgeProps) {
  if (!flash) return null;

  const Icon = flash.isPR ? Trophy : Check;
  const ringClass = flash.isPR
    ? "border-brand shadow-[0_0_60px_color-mix(in_oklch,var(--brand)_40%,transparent),0_20px_40px_rgba(0,0,0,.5)]"
    : "border-border shadow-[0_20px_40px_rgba(0,0,0,.5)]";

  return (
    <div
      key={flash.ts}
      role="status"
      aria-live="polite"
      data-testid="flash-badge"
      className={
        "flash-badge pointer-events-none fixed left-1/2 top-[40%] z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border bg-card px-4 py-3 " +
        ringClass
      }
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
        <Icon className="h-4 w-4" strokeWidth={3} />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-tight">{flash.text}</div>
        {flash.subtext ? (
          <div className="mt-0.5 text-xs text-muted-foreground">{flash.subtext}</div>
        ) : null}
      </div>
    </div>
  );
}
