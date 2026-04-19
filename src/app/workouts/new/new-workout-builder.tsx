"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ExercisePickerDialog,
  type PickerResult,
} from "@/components/exercise-picker-dialog";
import type { PendingExercise } from "@/app/workouts/actions";
import { Badge } from "@/components/badge";
import { createClient } from "@/lib/supabase/client";
import { getStore } from "@/lib/workout-store";

interface RowState extends PendingExercise {
  localId: string;
  videoUrl?: string | null;
}

function today(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rowFromPicker(picker: PickerResult, defaultSets: number): RowState {
  return {
    localId: crypto.randomUUID(),
    exercise_id: picker.id,
    exercise_name: picker.name,
    muscle: picker.muscle,
    equipment: picker.equipment,
    default_sets: defaultSets,
    videoUrl: picker.videoUrl ?? null,
  };
}

interface NewWorkoutBuilderProps {
  prefill: PickerResult | null;
}

const QUICK_TEMPLATES: Array<{ label: string; sets: number }> = [
  { label: "3 x 10", sets: 3 },
  { label: "5 x 5", sets: 5 },
  { label: "4 x 8", sets: 4 },
];

interface SortableRowProps {
  row: RowState;
  index: number;
  onRemove: (localId: string) => void;
  onSetsChange: (localId: string, value: number) => void;
}

function SortableRow({ row, index, onRemove, onSetsChange }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.localId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-11 w-8 touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={`Drag to reorder ${row.exercise_name}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-6 text-right text-sm text-muted-foreground">
        {index + 1}
      </span>
      <div
        className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-muted"
        aria-hidden
      >
        {row.videoUrl ? (
          <video
            src={row.videoUrl}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {row.exercise_name.slice(0, 2)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{row.exercise_name}</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {row.muscle ? <Badge variant="default">{row.muscle}</Badge> : null}
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
            onSetsChange(row.localId, Number(event.target.value))
          }
          className="h-8 w-16"
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(row.localId)}
        aria-label="Remove"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

export function NewWorkoutBuilder({ prefill }: NewWorkoutBuilderProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState(today());
  // Default-sets value for the NEXT added exercise. Quick-template chips set
  // this; 3 is the sane default that matches the original behavior.
  const [defaultSets, setDefaultSets] = useState(3);
  const [rows, setRows] = useState<RowState[]>(
    prefill ? [rowFromPicker(prefill, 3)] : []
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [userId, setUserId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const hasEnv =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!hasEnv) return;
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setUserId(data.user?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setUserId(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function addExercise(picker: PickerResult) {
    setRows((prev) => [...prev, rowFromPicker(picker, defaultSets)]);
  }

  function removeRow(localId: string) {
    setRows((prev) => prev.filter((r) => r.localId !== localId));
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRows((prev) => {
      const from = prev.findIndex((r) => r.localId === active.id);
      const to = prev.findIndex((r) => r.localId === over.id);
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to);
    });
  }

  const totalSets = rows.reduce((sum, r) => sum + r.default_sets, 0);

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
        const store = await getStore(userId);
        const { id } = await store.createWorkout({ name, date, exercises });
        router.push(`/workouts/${id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
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
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Exercises
          </h2>
          <p
            className="font-mono text-xs text-muted-foreground"
            aria-live="polite"
          >
            {rows.length} {rows.length === 1 ? "exercise" : "exercises"} &middot;{" "}
            {totalSets} {totalSets === 1 ? "set" : "sets"}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Next:</span>
          {QUICK_TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setDefaultSets(t.sets)}
              aria-pressed={defaultSets === t.sets}
              className={
                "h-8 rounded-md border px-3 text-xs font-medium transition-colors " +
                (defaultSets === t.sets
                  ? "border-foreground bg-foreground text-background"
                  : "border-input bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground")
              }
            >
              {t.label}
            </button>
          ))}
          <div className="flex items-center gap-1">
            <Label
              htmlFor="custom-default-sets"
              className="text-xs text-muted-foreground"
            >
              Custom
            </Label>
            <Input
              id="custom-default-sets"
              type="number"
              min={1}
              max={20}
              value={defaultSets}
              onChange={(event) =>
                setDefaultSets(
                  Math.max(1, Math.min(20, Number(event.target.value) || 1))
                )
              }
              className="h-8 w-14"
              aria-label="Custom default sets"
            />
          </div>
          <div className="ml-auto">
            <ExercisePickerDialog onAdd={addExercise} />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No exercises yet. Add one to get started.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rows.map((r) => r.localId)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="mt-4 divide-y rounded-lg border bg-card">
                {rows.map((row, idx) => (
                  <SortableRow
                    key={row.localId}
                    row={row}
                    index={idx}
                    onRemove={removeRow}
                    onSetsChange={updateSets}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
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
