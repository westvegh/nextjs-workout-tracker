"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ExercisePickerDialog,
  type PickerResult,
} from "@/components/exercise-picker-dialog";
import { createWorkout, type PendingExercise } from "@/app/workouts/actions";
import { Badge } from "@/components/badge";

interface RowState extends PendingExercise {
  localId: string;
}

function today(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rowFromPicker(picker: PickerResult): RowState {
  return {
    localId: crypto.randomUUID(),
    exercise_id: picker.id,
    exercise_name: picker.name,
    muscle: picker.muscle,
    equipment: picker.equipment,
    default_sets: 3,
  };
}

interface NewWorkoutBuilderProps {
  prefill: PickerResult | null;
}

export function NewWorkoutBuilder({ prefill }: NewWorkoutBuilderProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState<RowState[]>(
    prefill ? [rowFromPicker(prefill)] : []
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addExercise(picker: PickerResult) {
    setRows((prev) => [...prev, rowFromPicker(picker)]);
  }

  function removeRow(localId: string) {
    setRows((prev) => prev.filter((r) => r.localId !== localId));
  }

  function moveRow(localId: string, direction: -1 | 1) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.localId === localId);
      if (idx < 0) return prev;
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function updateSets(localId: string, value: number) {
    setRows((prev) =>
      prev.map((r) =>
        r.localId === localId
          ? { ...r, default_sets: Math.max(1, Math.min(20, value)) }
          : r
      )
    );
  }

  function handleSave() {
    setError(null);
    if (rows.length === 0) {
      setError("Add at least one exercise.");
      return;
    }

    startTransition(async () => {
      try {
        const exercises: PendingExercise[] = rows.map((row) => ({
          exercise_id: row.exercise_id,
          exercise_name: row.exercise_name,
          muscle: row.muscle,
          equipment: row.equipment,
          default_sets: row.default_sets,
        }));
        const id = await createWorkout({ name, date, exercises });
        router.push(`/workouts/${id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">New workout</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Build a plan, then log sets when you&apos;re training.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_180px]">
        <div className="space-y-2">
          <Label htmlFor="workout-name">Name</Label>
          <Input
            id="workout-name"
            type="text"
            placeholder="Push day"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workout-date">Date</Label>
          <Input
            id="workout-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Exercises
          </h2>
          <ExercisePickerDialog onAdd={addExercise} />
        </div>

        {rows.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No exercises yet. Add one to get started.
            </p>
          </div>
        ) : (
          <ol className="mt-4 divide-y rounded-lg border bg-card">
            {rows.map((row, idx) => (
              <li
                key={row.localId}
                className="flex items-center gap-3 p-4"
              >
                <span className="w-6 text-right text-sm text-muted-foreground">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {row.exercise_name}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {row.muscle ? (
                      <Badge variant="default">{row.muscle}</Badge>
                    ) : null}
                    {row.equipment ? (
                      <Badge variant="outline">{row.equipment}</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor={`sets-${row.localId}`}
                    className="text-xs text-muted-foreground"
                  >
                    Sets
                  </Label>
                  <Input
                    id={`sets-${row.localId}`}
                    type="number"
                    min={1}
                    max={20}
                    value={row.default_sets}
                    onChange={(event) =>
                      updateSets(row.localId, Number(event.target.value))
                    }
                    className="h-8 w-16"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => moveRow(row.localId, -1)}
                    disabled={idx === 0}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => moveRow(row.localId, 1)}
                    disabled={idx === rows.length - 1}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row.localId)}
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {error ? (
        <p className="mt-6 text-sm text-destructive">{error}</p>
      ) : null}

      <div className="mt-8 flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/workouts")}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save workout"}
        </Button>
      </div>
    </main>
  );
}
