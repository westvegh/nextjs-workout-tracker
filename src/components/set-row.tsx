"use client";

/**
 * SetRow — one row of weight/reps input + unit chip + check button. Extracted
 * from the old inline grid in workout-logger.tsx. Handles:
 *  - Ghost placeholder (italic muted previous-session weight/reps)
 *  - Accent left-border when this is the active set
 *  - Strike-through + tinted bg + PR pill when completed
 *  - Check-button pop animation (400ms) on the edge of completion
 *
 * Kept wrapped in SwipeDeleteRow so mobile swipe-left-to-delete still works.
 */

import { Check, Trophy } from "lucide-react";
import { SwipeDeleteRow } from "./swipe-delete-row";

export interface SetRowSetState {
  id?: string;
  set_number: number;
  weight: string;
  weight_unit: "lbs" | "kg";
  reps: string;
  is_completed: boolean;
  pr?: boolean;
}

interface SetRowProps {
  set: SetRowSetState;
  setIdx: number;
  exerciseId: string;
  isActive: boolean;
  ghostWeight: string | null;
  ghostReps: string | null;
  onUpdate: (patch: Partial<SetRowSetState>) => void;
  onToggle: () => void;
  onRemove: () => void;
}

export function SetRow({
  set,
  setIdx,
  exerciseId,
  isActive,
  ghostWeight,
  ghostReps,
  onUpdate,
  onToggle,
  onRemove,
}: SetRowProps) {
  const weightPlaceholder = ghostWeight ?? "Weight";
  const repsPlaceholder = ghostReps ?? "Reps";
  const emptyWeight = set.weight.trim() === "";
  const emptyReps = set.reps.trim() === "";

  const rowBg = set.is_completed
    ? "bg-brand/5"
    : isActive
    ? "bg-card/60"
    : "";
  const leftAccent = isActive && !set.is_completed
    ? "shadow-[inset_3px_0_0_0_var(--brand)]"
    : "";
  const textStrike = set.is_completed ? "opacity-55 line-through" : "";

  return (
    <li data-set-row={`${exerciseId}:${setIdx}`}>
      <SwipeDeleteRow onDelete={onRemove}>
        <div
          className={
            "grid grid-cols-[28px_1fr_44px_1fr_auto] items-center gap-2 px-3 py-3 sm:py-3.5 " +
            rowBg +
            " " +
            leftAccent
          }
        >
          <span
            className={
              "font-mono text-[11px] font-semibold text-muted-foreground tabular-nums " +
              textStrike
            }
          >
            {String(set.set_number).padStart(2, "0")}
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            placeholder={weightPlaceholder}
            value={set.weight}
            aria-label={`Weight, set ${set.set_number}`}
            onClick={() => {
              if (emptyWeight && ghostWeight) onUpdate({ weight: ghostWeight });
            }}
            onChange={(e) => onUpdate({ weight: e.target.value })}
            disabled={set.is_completed}
            className={
              "h-12 w-full rounded-md border bg-transparent text-center font-mono text-[20px] font-semibold tracking-tight transition focus:outline-none focus:border-foreground focus:bg-card sm:h-[52px] sm:text-[22px] " +
              (emptyWeight ? "placeholder:italic placeholder:text-muted-foreground/60 " : "") +
              (set.is_completed ? "opacity-55" : "")
            }
          />
          <button
            type="button"
            onClick={() =>
              onUpdate({ weight_unit: set.weight_unit === "lbs" ? "kg" : "lbs" })
            }
            disabled={set.is_completed}
            aria-label="Toggle weight unit"
            className="h-12 rounded-md border text-[12px] font-medium text-muted-foreground transition hover:border-foreground hover:text-foreground sm:h-[52px]"
          >
            {set.weight_unit}
          </button>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            placeholder={repsPlaceholder}
            value={set.reps}
            aria-label={`Reps, set ${set.set_number}`}
            onClick={() => {
              if (emptyReps && ghostReps) onUpdate({ reps: ghostReps });
            }}
            onChange={(e) => onUpdate({ reps: e.target.value })}
            disabled={set.is_completed}
            className={
              "h-12 w-full rounded-md border bg-transparent text-center font-mono text-[20px] font-semibold tracking-tight transition focus:outline-none focus:border-foreground focus:bg-card sm:h-[52px] sm:text-[22px] " +
              (emptyReps ? "placeholder:italic placeholder:text-muted-foreground/60 " : "") +
              (set.is_completed ? "opacity-55" : "")
            }
          />
          {/*
           * key={is_completed} forces React to remount the button on every
           * toggle, which restarts the CSS animation — so `check-pop` plays
           * once when a set transitions to done, without needing useEffect
           * + setState (which the React 19 lint rule forbids in effects).
           */}
          <button
            key={String(set.is_completed)}
            type="button"
            onClick={onToggle}
            aria-label={set.is_completed ? "Mark incomplete" : "Mark done"}
            aria-pressed={set.is_completed}
            className={
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-md border transition sm:h-[52px] sm:w-[52px] " +
              (set.is_completed
                ? "border-brand bg-brand text-brand-foreground check-pop"
                : "text-muted-foreground hover:border-foreground hover:text-foreground")
            }
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>
        {set.is_completed && set.pr ? (
          <div className="-mt-1 flex justify-end px-3 pb-2">
            <span className="inline-flex items-center gap-1 rounded-md border border-brand/40 bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
              <Trophy className="h-3 w-3" strokeWidth={2.5} />
              New PR
            </span>
          </div>
        ) : null}
      </SwipeDeleteRow>
    </li>
  );
}
