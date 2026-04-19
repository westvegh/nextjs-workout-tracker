"use client";

/**
 * ExerciseCardLogger — one card per exercise in the active-session logger.
 *
 * Bold aesthetic: 44px left gutter carrying the exercise number + mini ring
 * + done/total count. Right side carries the header (name, inline Demo pill,
 * DONE badge when complete, muscle/equipment chips), a top-right sparkline
 * of the last 7 top-set weights, a Last/PR stats row, an expandable demo
 * video panel, and the divided set list. Add-set ghost button sits at the
 * bottom.
 *
 * Demo video URL is fetched lazily on first pill click from
 * /api/exercise-detail/[id]. Result cached per-card via state.
 */

import { useState } from "react";
import { Play, Plus, Trophy } from "lucide-react";
import { MiniRing } from "./mini-ring";
import { Sparkline } from "./sparkline";
import { SetRow, type SetRowSetState } from "./set-row";
import type { ExerciseHistory } from "@/lib/exercise-history";

export interface CardExerciseState {
  id: string;
  exercise_id: string;
  exercise_name: string;
  muscle: string | null;
  equipment: string | null;
  sets: SetRowSetState[];
}

interface ExerciseCardLoggerProps {
  exercise: CardExerciseState;
  orderIndex: number;
  history: ExerciseHistory | null;
  activeSetIdx: number | null;
  onUpdateSet: (setIdx: number, patch: Partial<SetRowSetState>) => void;
  onToggleSet: (setIdx: number) => void;
  onRemoveSet: (setIdx: number) => void;
  onAddSet: () => void;
}

type DemoState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; url: string }
  | { kind: "none" }
  | { kind: "error" };

export function ExerciseCardLogger({
  exercise: ex,
  orderIndex,
  history,
  activeSetIdx,
  onUpdateSet,
  onToggleSet,
  onRemoveSet,
  onAddSet,
}: ExerciseCardLoggerProps) {
  const [demo, setDemo] = useState<DemoState>({ kind: "idle" });
  const [demoOpen, setDemoOpen] = useState(false);

  const total = ex.sets.length;
  const done = ex.sets.filter((s) => s.is_completed).length;
  const progress = total > 0 ? done / total : 0;
  const allDone = total > 0 && done === total;

  async function toggleDemo() {
    if (demoOpen) {
      setDemoOpen(false);
      return;
    }
    setDemoOpen(true);
    if (demo.kind === "idle") {
      setDemo({ kind: "loading" });
      try {
        const res = await fetch(`/api/exercise-detail/${ex.exercise_id}`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const body = (await res.json()) as { videoUrl: string | null };
        setDemo(body.videoUrl ? { kind: "ready", url: body.videoUrl } : { kind: "none" });
      } catch {
        setDemo({ kind: "error" });
      }
    }
  }

  return (
    <article
      className={
        "rounded-xl border bg-card " +
        (allDone ? "border-brand/40" : "")
      }
      data-testid="exercise-card"
    >
      <div className="flex">
        {/* Left gutter: number + ring + count */}
        <div className="flex w-11 shrink-0 flex-col items-center gap-1 border-r py-3">
          <span className="font-mono text-[13px] font-bold tabular-nums">
            {String(orderIndex + 1).padStart(2, "0")}
          </span>
          <span className={allDone ? "text-brand" : "text-muted-foreground"}>
            <MiniRing size={26} stroke={2.5} progress={progress} />
          </span>
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            {done}/{total}
          </span>
        </div>

        {/* Right: header + stats + demo + sets + add */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3 px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[15px] font-semibold leading-tight">
                  {ex.exercise_name}
                </h2>
                <button
                  type="button"
                  onClick={toggleDemo}
                  className="inline-flex shrink-0 items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-foreground hover:text-foreground"
                  aria-label={demoOpen ? "Hide demo" : "Show demo"}
                >
                  <Play className="h-2.5 w-2.5" fill="currentColor" />
                  Demo
                </button>
                {allDone ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-brand/40 bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                    Done ✓
                  </span>
                ) : null}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {ex.muscle ? (
                  <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium lowercase">
                    {ex.muscle}
                  </span>
                ) : null}
                {ex.equipment ? (
                  <span className="rounded-md border px-1.5 py-0.5 text-[11px] font-medium lowercase">
                    {ex.equipment}
                  </span>
                ) : null}
              </div>
            </div>
            {history && history.history.length >= 2 ? (
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="text-muted-foreground">
                  <Sparkline
                    values={history.history}
                    aria-label="Top-set weight last 7 workouts"
                  />
                </span>
                <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  last {history.history.length}
                </span>
              </div>
            ) : null}
          </div>

          {history && (history.last || history.pr) ? (
            <div className="grid grid-cols-2 gap-2 border-t px-3.5 py-2.5">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Last
                </div>
                <div className="mt-0.5 font-mono text-xs font-semibold tabular-nums">
                  {history.last ? `${history.last.weight} × ${history.last.reps}` : "—"}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <Trophy className="h-2.5 w-2.5" strokeWidth={2.5} /> PR
                </div>
                <div className="mt-0.5 font-mono text-xs font-semibold tabular-nums">
                  {history.pr ? `${history.pr.weight} × ${history.pr.reps}` : "—"}
                </div>
              </div>
            </div>
          ) : null}

          {demoOpen ? (
            <div className="border-t px-3.5 py-3">
              {demo.kind === "loading" ? (
                <div className="aspect-video w-full animate-pulse rounded-md bg-muted" />
              ) : demo.kind === "ready" ? (
                <video
                  src={demo.url}
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full rounded-md bg-muted"
                />
              ) : demo.kind === "none" ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Video coming soon
                </p>
              ) : demo.kind === "error" ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Couldn&rsquo;t load demo
                </p>
              ) : null}
            </div>
          ) : null}

          <ul className="divide-y border-t">
            {ex.sets.map((s, idx) => (
              <SetRow
                key={s.id ?? `new-${idx}`}
                set={s}
                setIdx={idx}
                exerciseId={ex.id}
                isActive={activeSetIdx === idx}
                ghostWeight={history?.last ? String(history.last.weight) : null}
                ghostReps={history?.last ? String(history.last.reps) : null}
                onUpdate={(patch) => onUpdateSet(idx, patch)}
                onToggle={() => onToggleSet(idx)}
                onRemove={() => onRemoveSet(idx)}
              />
            ))}
          </ul>

          <div className="border-t p-2">
            <button
              type="button"
              onClick={onAddSet}
              className="flex w-full items-center justify-center gap-1 rounded-md py-2 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add set
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
