"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Check, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  finishWorkout,
  upsertSets,
  type SetInput,
} from "@/app/workouts/actions";
import { getStore } from "@/lib/workout-store";

interface SetState {
  id?: string;
  set_number: number;
  weight: string;
  weight_unit: "lbs" | "kg";
  reps: string;
  is_completed: boolean;
}

interface ExerciseState {
  id: string;
  exercise_name: string;
  muscle: string | null;
  equipment: string | null;
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

export function WorkoutLogger({ workout, isGuest = false }: WorkoutLoggerProps) {
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseState[]>(() =>
    workout.workout_exercises.map((ex) => ({
      id: ex.id,
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
      })),
    }))
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [finishing, startFinish] = useTransition();

  function updateSet(
    exerciseId: string,
    setIdx: number,
    patch: Partial<SetState>
  ) {
    setSaved(false);
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s, i) =>
                i === setIdx ? { ...s, ...patch } : s
              ),
            }
          : ex
      )
    );
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
        // redirect() inside server action throws a special error — don't trap that as failure.
        if (err instanceof Error && err.message.toLowerCase().includes("next_redirect")) {
          return;
        }
        setError(err instanceof Error ? err.message : "Finish failed");
      }
    });
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link
        href={`/workouts/${workout.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to workout
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        {workout.name || "Unnamed workout"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Log your sets. Tap done when you hit a set.
      </p>

      <div className="mt-10 space-y-6">
        {exercises.map((ex) => (
          <div key={ex.id} className="rounded-lg border bg-card">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b p-5">
              <div>
                <div className="font-medium">{ex.exercise_name}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {ex.muscle ? (
                    <Badge variant="default">{ex.muscle}</Badge>
                  ) : null}
                  {ex.equipment ? (
                    <Badge variant="outline">{ex.equipment}</Badge>
                  ) : null}
                </div>
              </div>
            </div>

            {ex.sets.length === 0 ? (
              <div className="p-5 text-center text-sm text-muted-foreground">
                No sets yet.
              </div>
            ) : (
              <ul className="divide-y">
                {ex.sets.map((s, idx) => (
                  <li
                    key={s.id ?? `new-${idx}`}
                    className="grid grid-cols-[auto_1fr_auto_1fr_auto_auto] items-center gap-2 px-4 py-3 sm:grid-cols-[auto_120px_80px_120px_auto_auto]"
                  >
                    <span className="w-8 text-sm text-muted-foreground">
                      #{s.set_number}
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min="0"
                      placeholder="Weight"
                      value={s.weight}
                      onChange={(event) =>
                        updateSet(ex.id, idx, { weight: event.target.value })
                      }
                      className="h-9"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateSet(ex.id, idx, {
                          weight_unit: s.weight_unit === "lbs" ? "kg" : "lbs",
                        })
                      }
                      className="h-9 rounded-md border border-input bg-transparent px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label="Toggle weight unit"
                    >
                      {s.weight_unit}
                    </button>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      placeholder="Reps"
                      value={s.reps}
                      onChange={(event) =>
                        updateSet(ex.id, idx, { reps: event.target.value })
                      }
                      className="h-9"
                    />
                    <Button
                      type="button"
                      variant={s.is_completed ? "default" : "outline"}
                      size="icon"
                      onClick={() =>
                        updateSet(ex.id, idx, { is_completed: !s.is_completed })
                      }
                      aria-label={s.is_completed ? "Mark incomplete" : "Mark done"}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSet(ex.id, idx)}
                      aria-label="Remove set"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t p-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addSet(ex.id)}
              >
                <Plus className="h-4 w-4" />
                Add set
              </Button>
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <p className="mt-6 text-sm text-destructive">{error}</p>
      ) : null}
      {saved ? (
        <p className="mt-6 text-sm text-muted-foreground">Saved.</p>
      ) : null}

      <div className="sticky bottom-4 mt-10 flex flex-wrap justify-end gap-3 rounded-lg border bg-background/90 p-3 backdrop-blur">
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={pending || finishing}
        >
          {pending ? "Saving..." : "Save progress"}
        </Button>
        <Button onClick={handleFinish} disabled={pending || finishing}>
          {finishing ? "Finishing..." : "Finish workout"}
        </Button>
      </div>
    </main>
  );
}
