"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CompletionScreen } from "@/components/completion-screen";
import {
  ExerciseCardLogger,
  type CardExerciseState,
} from "@/components/exercise-card-logger";
import { FLASH_DURATION_MS, FlashBadge, type FlashState } from "@/components/flash-badge";
import { RestSheet } from "@/components/rest-sheet";
import { SessionHero } from "@/components/session-hero";
import { SessionStickyBar } from "@/components/session-sticky-bar";
import type { SetRowSetState } from "@/components/set-row";
import { getExerciseHistory, type ExerciseHistory } from "@/lib/exercise-history";
import { getStore } from "@/lib/workout-store";
import {
  finishWorkout,
  upsertSets,
  type SetInput,
} from "@/app/workouts/actions";

const DEFAULT_REST_TARGET = 90;
const ALL_DONE_DELAY_MS = 600;
const MIN_REST_TARGET = 15;

interface SetState extends SetRowSetState {
  id?: string;
}

interface ExerciseState extends CardExerciseState {
  sets: SetState[];
}

interface WorkoutLoggerProps {
  workout: {
    id: string;
    name: string | null;
    date: string;
    status: string | null;
    workout_exercises: Array<{
      id: string;
      exercise_id: string;
      exercise_name: string;
      muscle: string | null;
      equipment: string | null;
      order_index: number;
      exercise_sets: Array<{
        id: string;
        set_number: number;
        weight: number | null;
        weight_unit: string | null;
        reps: number | null;
        is_completed: boolean;
      }>;
    }>;
  };
  isGuest?: boolean;
  userId?: string | null;
}

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function isValidUnit(value: string | null | undefined): value is "lbs" | "kg" {
  return value === "lbs" || value === "kg";
}

export function WorkoutLogger({
  workout,
  isGuest = false,
  userId = null,
}: WorkoutLoggerProps) {
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseState[]>(() =>
    workout.workout_exercises.map((ex) => ({
      id: ex.id,
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      muscle: ex.muscle,
      equipment: ex.equipment,
      sets: ex.exercise_sets.map((s) => ({
        id: s.id,
        set_number: s.set_number,
        weight: s.weight != null ? String(s.weight) : "",
        weight_unit: isValidUnit(s.weight_unit) ? s.weight_unit : "lbs",
        reps: s.reps != null ? String(s.reps) : "",
        is_completed: s.is_completed,
        pr: false,
      })),
    }))
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [finishing, startFinish] = useTransition();
  const [histories, setHistories] = useState<Record<string, ExerciseHistory | null>>({});
  const [restStartedAt, setRestStartedAt] = useState<number | null>(null);
  const [restTarget, setRestTarget] = useState<number>(DEFAULT_REST_TARGET);
  const [flash, setFlash] = useState<FlashState | null>(null);
  const [finished, setFinished] = useState(false);
  // Captured when the logger transitions to `finished=true`. Used only by the
  // completion screen's "Duration" stat — reading Date.now() during render
  // violates React 19's purity rule.
  const [finishedAt, setFinishedAt] = useState<number | null>(null);

  // Session clock starts the moment the logger mounts. Client-side only (the
  // workout schema doesn't carry started_at yet). useState initializer is the
  // React-19-blessed way to capture a stable one-time timestamp — refs aren't
  // allowed in render, and a constant would reset on every navigation.
  const [startedAt] = useState<number>(() => Date.now());

  // One-shot fetch of per-exercise history for Last/PR/sparkline. Uses the
  // same store the logger writes against, so guest mode reads localStorage
  // and signed-in mode hits the remote store.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const store = await getStore(isGuest ? null : userId);
        const unique = Array.from(
          new Set(
            workout.workout_exercises.map((e) => e.exercise_id).filter(Boolean)
          )
        );
        const results: Record<string, ExerciseHistory | null> = {};
        for (const exId of unique) {
          if (cancelled) return;
          results[exId] = await getExerciseHistory(store, exId);
        }
        if (cancelled) return;
        setHistories(results);
      } catch {
        // Silent: history is a nice-to-have.
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout.id]);

  // Auto-clear the flash badge after its visual lifecycle. The badge's CSS
  // animation leaves it at opacity 0; removing the state frees the live region.
  useEffect(() => {
    if (!flash) return;
    const handle = window.setTimeout(() => setFlash(null), FLASH_DURATION_MS);
    return () => window.clearTimeout(handle);
  }, [flash]);

  // When every set is complete, transition to the completion screen after a
  // beat so the user sees the final check animate + flash before the page
  // changes shape. Don't re-fire once the completion screen is showing.
  useEffect(() => {
    if (finished) return;
    const total = exercises.reduce((n, ex) => n + ex.sets.length, 0);
    const done = exercises.reduce(
      (n, ex) => n + ex.sets.filter((s) => s.is_completed).length,
      0
    );
    if (total > 0 && done === total) {
      const handle = window.setTimeout(() => {
        setRestStartedAt(null);
        setFinishedAt(Date.now());
        setFinished(true);
      }, ALL_DONE_DELAY_MS);
      return () => window.clearTimeout(handle);
    }
  }, [exercises, finished]);

  // Derived: ordered list of (exerciseId, setIdx) for the first incomplete
  // set globally, and the label for the one after it (used by RestSheet).
  const derived = useMemo(() => {
    let activeExerciseId: string | null = null;
    let activeSetIdx: number | null = null;
    let nextLabel: string | null = null;
    let total = 0;
    let done = 0;
    let volume = 0;
    let newPRs = 0;
    const flat: Array<{ exerciseId: string; setIdx: number; setNumber: number; exerciseName: string }> = [];
    for (const ex of exercises) {
      for (let i = 0; i < ex.sets.length; i++) {
        total++;
        const s = ex.sets[i];
        if (s.is_completed) {
          done++;
          const w = Number(s.weight) || 0;
          const r = Number(s.reps) || 0;
          volume += w * r;
          if (s.pr) newPRs++;
        }
        flat.push({
          exerciseId: ex.id,
          setIdx: i,
          setNumber: s.set_number,
          exerciseName: ex.exercise_name,
        });
      }
    }
    for (let i = 0; i < flat.length; i++) {
      const ex = exercises.find((e) => e.id === flat[i].exerciseId)!;
      const s = ex.sets[flat[i].setIdx];
      if (!s.is_completed && activeExerciseId === null) {
        activeExerciseId = flat[i].exerciseId;
        activeSetIdx = flat[i].setIdx;
        if (i + 1 < flat.length) {
          nextLabel = `${flat[i + 1].exerciseName} · Set ${flat[i + 1].setNumber}`;
        }
        break;
      }
    }
    return { activeExerciseId, activeSetIdx, nextLabel, total, done, volume, newPRs };
  }, [exercises]);

  function updateSet(exerciseId: string, setIdx: number, patch: Partial<SetState>) {
    setSaved(false);
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, i) => {
            if (i !== setIdx) return s;
            // Starting a new set (first keystroke in an empty weight) cancels
            // the rest timer — user is back at the bar.
            if (
              patch.weight !== undefined &&
              s.weight.trim() === "" &&
              patch.weight.trim() !== "" &&
              !s.is_completed
            ) {
              setRestStartedAt(null);
            }
            return { ...s, ...patch };
          }),
        };
      })
    );
  }

  function toggleComplete(exerciseId: string, setIdx: number) {
    setSaved(false);
    // Compute wasPR + flash details BEFORE setExercises so the closure-
    // captured values are stable. React StrictMode double-invokes the updater
    // callback; reading these inside that callback is unreliable.
    const ex = exercises.find((e) => e.id === exerciseId);
    if (!ex) return;
    const s = ex.sets[setIdx];
    if (!s) return;
    const willBeCompleted = !s.is_completed;
    const history = histories[ex.exercise_id] ?? null;

    let autoWeight = s.weight;
    let autoReps = s.reps;
    if (willBeCompleted && history?.last) {
      if (autoWeight.trim() === "") autoWeight = String(history.last.weight);
      if (autoReps.trim() === "") autoReps = String(history.last.reps);
    }

    let wasPR = false;
    if (willBeCompleted) {
      const w = Number(autoWeight) || 0;
      const r = Number(autoReps) || 0;
      if (history?.pr) {
        wasPR = w * r > history.pr.weight * history.pr.reps;
      } else {
        wasPR = w > 0 && r > 0;
      }
    }

    setExercises((prev) =>
      prev.map((exItem) => {
        if (exItem.id !== exerciseId) return exItem;
        return {
          ...exItem,
          sets: exItem.sets.map((setItem, i) => {
            if (i !== setIdx) return setItem;
            return {
              ...setItem,
              is_completed: willBeCompleted,
              weight: willBeCompleted ? autoWeight : setItem.weight,
              reps: willBeCompleted ? autoReps : setItem.reps,
              pr: willBeCompleted ? wasPR : false,
            };
          }),
        };
      })
    );

    if (willBeCompleted) {
      queueMicrotask(() => {
        setRestStartedAt(Date.now());
        setRestTarget(DEFAULT_REST_TARGET);
        setFlash({
          text: wasPR ? "New PR logged" : "Set logged",
          subtext: `Rest · ${DEFAULT_REST_TARGET}s`,
          isPR: wasPR,
          ts: Date.now(),
        });
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate(wasPR ? [20, 40, 30] : 30);
          } catch {
            // Some browsers gate vibrate behind a user gesture signal; ignore.
          }
        }
      });
    }
  }

  function addSet(exerciseId: string) {
    setSaved(false);
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: [
                ...ex.sets,
                {
                  set_number: (ex.sets.at(-1)?.set_number ?? 0) + 1,
                  weight: "",
                  weight_unit: ex.sets.at(-1)?.weight_unit ?? "lbs",
                  reps: "",
                  is_completed: false,
                  pr: false,
                },
              ],
            }
          : ex
      )
    );
  }

  function removeSet(exerciseId: string, setIdx: number) {
    setSaved(false);
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets
                .filter((_, i) => i !== setIdx)
                .map((s, i) => ({ ...s, set_number: i + 1 })),
            }
          : ex
      )
    );
  }

  function buildPayload(): SetInput[] {
    const payload: SetInput[] = [];
    for (const ex of exercises) {
      for (const s of ex.sets) {
        payload.push({
          id: s.id,
          workout_exercise_id: ex.id,
          set_number: s.set_number,
          weight: toNumber(s.weight),
          weight_unit: s.weight_unit,
          reps: toNumber(s.reps) !== null ? Math.trunc(toNumber(s.reps)!) : null,
          is_completed: s.is_completed,
        });
      }
    }
    return payload;
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        if (isGuest) {
          const store = await getStore(null);
          await store.upsertSets(workout.id, buildPayload());
        } else {
          await upsertSets(workout.id, buildPayload());
        }
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  function handleFinish() {
    setError(null);
    startFinish(async () => {
      try {
        if (isGuest) {
          const store = await getStore(null);
          await store.upsertSets(workout.id, buildPayload());
          await store.setWorkoutStatus(workout.id, "completed");
          router.push(`/workouts/${workout.id}`);
          router.refresh();
        } else {
          await upsertSets(workout.id, buildPayload());
          await finishWorkout(workout.id);
        }
      } catch (err) {
        if (err instanceof Error && err.message.toLowerCase().includes("next_redirect")) {
          return;
        }
        setError(err instanceof Error ? err.message : "Finish failed");
      }
    });
  }

  function adjustRest(deltaSeconds: number) {
    setRestTarget((target) => Math.max(MIN_REST_TARGET, target + deltaSeconds));
  }

  const workoutName = workout.name || "Unnamed workout";
  const durationMinutes =
    finishedAt != null
      ? Math.max(0, Math.floor((finishedAt - startedAt) / 60000))
      : 0;

  if (finished) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 sm:px-6">
        <CompletionScreen
          workoutName={workoutName}
          durationMinutes={durationMinutes}
          totalVolume={derived.volume}
          setsDone={derived.done}
          newPRs={derived.newPRs}
          exercises={exercises.map((ex) => ({
            id: ex.id,
            name: ex.exercise_name,
            sets: ex.sets
              .filter((s) => s.is_completed)
              .map((s) => ({
                weight: s.weight || "0",
                reps: s.reps || "0",
                weight_unit: s.weight_unit,
              })),
            volume: ex.sets
              .filter((s) => s.is_completed)
              .reduce(
                (sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0),
                0
              ),
          }))}
          onFinish={handleFinish}
          finishing={finishing}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-32 sm:px-6">
      <SessionStickyBar
        startedAt={startedAt}
        workoutName={workoutName}
        done={derived.done}
        total={derived.total}
      />
      <SessionHero
        workoutId={workout.id}
        workoutName={workoutName}
        date={workout.date}
        setsDone={derived.done}
        setsTotal={derived.total}
        volume={derived.volume}
      />

      <div className="mt-6 space-y-3">
        {exercises.map((ex, i) => (
          <ExerciseCardLogger
            key={ex.id}
            exercise={ex}
            orderIndex={i}
            history={histories[ex.exercise_id] ?? null}
            activeSetIdx={
              derived.activeExerciseId === ex.id ? derived.activeSetIdx : null
            }
            onUpdateSet={(setIdx, patch) => updateSet(ex.id, setIdx, patch)}
            onToggleSet={(setIdx) => toggleComplete(ex.id, setIdx)}
            onRemoveSet={(setIdx) => removeSet(ex.id, setIdx)}
            onAddSet={() => addSet(ex.id)}
          />
        ))}
      </div>

      {error ? (
        <p className="mt-6 text-sm text-destructive">{error}</p>
      ) : null}
      {saved ? (
        <p className="mt-6 text-sm text-muted-foreground">Saved.</p>
      ) : null}

      {restStartedAt !== null ? (
        <RestSheet
          startedAt={restStartedAt}
          target={restTarget}
          nextLabel={derived.nextLabel}
          onSkip={() => setRestStartedAt(null)}
          onAdjust={adjustRest}
        />
      ) : null}

      <FlashBadge flash={flash} />

      <div className="fixed inset-x-4 bottom-4 z-10 mx-auto flex max-w-2xl flex-wrap justify-end gap-3 rounded-xl border bg-background/90 p-3 backdrop-blur sm:inset-x-6">
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={pending || finishing}
        >
          {pending ? "Saving..." : "Save progress"}
        </Button>
        <Button
          onClick={handleFinish}
          disabled={pending || finishing}
          className="bg-brand text-brand-foreground hover:brightness-110"
        >
          {finishing ? "Finishing..." : "Finish workout"}
        </Button>
      </div>
    </main>
  );
}
