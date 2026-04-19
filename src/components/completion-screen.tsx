"use client";

/**
 * CompletionScreen — renders in place of the logger when every set of every
 * exercise is complete. Summarizes the session and provides two exits:
 * "Log another" (→ /workouts/new) and "Back to workouts" (runs the finish
 * server action and redirects to the workouts list).
 *
 * Keeps all derived numbers (duration, volume, sets done, new PRs, per-
 * exercise summary) as simple props — logger computes them.
 */

import Link from "next/link";

export interface CompletionExerciseSummary {
  id: string;
  name: string;
  sets: Array<{ weight: string; reps: string; weight_unit: "lbs" | "kg" }>;
  volume: number;
}

interface CompletionScreenProps {
  workoutName: string;
  durationMinutes: number;
  totalVolume: number;
  setsDone: number;
  newPRs: number;
  exercises: CompletionExerciseSummary[];
  onFinish: () => void;
  finishing: boolean;
}

function StatBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
      <span
        className={
          "font-mono text-2xl font-bold tracking-tight tabular-nums " +
          (accent ? "text-brand" : "")
        }
      >
        {value}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function CompletionScreen({
  workoutName,
  durationMinutes,
  totalVolume,
  setsDone,
  newPRs,
  exercises,
  onFinish,
  finishing,
}: CompletionScreenProps) {
  return (
    <div data-testid="completion-screen" className="pt-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
        Workout complete
      </p>
      <h1 className="mt-2 text-[32px] font-bold leading-[1.05] tracking-tight">
        Nice work. That&rsquo;s a wrap.
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{workoutName}</p>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <StatBlock label="Duration" value={`${durationMinutes}m`} />
        <StatBlock label="Volume" value={totalVolume.toLocaleString()} />
        <StatBlock label="Sets done" value={String(setsDone)} />
        <StatBlock label="New PRs" value={String(newPRs)} accent={newPRs > 0} />
      </div>

      <section className="mt-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Exercise breakdown
        </h2>
        <ul className="mt-3 divide-y rounded-lg border bg-card">
          {exercises.map((ex) => (
            <li key={ex.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{ex.name}</div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground tabular-nums">
                  {ex.sets
                    .map((s) => `${s.weight}×${s.reps}`)
                    .join(" · ")}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-xs font-semibold tabular-nums">
                  {ex.volume.toLocaleString()}
                </div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                  Volume
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/workouts/new"
          className="rounded-md border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-card"
        >
          Log another
        </Link>
        <button
          type="button"
          onClick={onFinish}
          disabled={finishing}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:brightness-110 disabled:opacity-60"
        >
          {finishing ? "Finishing…" : "Back to workouts"}
        </button>
      </div>
    </div>
  );
}
