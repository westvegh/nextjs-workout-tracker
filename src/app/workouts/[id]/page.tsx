import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { DeleteWorkoutButton } from "@/components/delete-workout-button";
import { StartWorkoutButton } from "@/components/start-workout-button";

type Params = Promise<{ id: string }>;

interface SetRow {
  id: string;
  set_number: number;
  weight: number | null;
  weight_unit: string | null;
  reps: number | null;
  is_completed: boolean;
}

interface WorkoutExerciseRow {
  id: string;
  exercise_id: string;
  exercise_name: string;
  muscle: string | null;
  equipment: string | null;
  order_index: number;
  exercise_sets: SetRow[];
}

interface WorkoutRow {
  id: string;
  name: string | null;
  date: string;
  status: string | null;
  notes: string | null;
  workout_exercises: WorkoutExerciseRow[];
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function WorkoutDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in to view this workout.
        </p>
        <Button asChild className="mt-6">
          <Link href="/auth/signin">Sign in</Link>
        </Button>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("workouts")
    .select(
      `
      id, name, date, status, notes,
      workout_exercises(
        id, exercise_id, exercise_name, muscle, equipment, order_index,
        exercise_sets(id, set_number, weight, weight_unit, reps, is_completed)
      )
      `
    )
    .eq("id", id)
    .order("order_index", { referencedTable: "workout_exercises" })
    .order("set_number", {
      referencedTable: "workout_exercises.exercise_sets",
    })
    .maybeSingle();

  if (error) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error.message}
        </div>
      </main>
    );
  }

  if (!data) notFound();

  const workout = data as unknown as WorkoutRow;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link
        href="/workouts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All workouts
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {workout.name || "Unnamed workout"}
            </h1>
            <StatusBadge status={workout.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(workout.date)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {workout.status === "planned" ? (
            <StartWorkoutButton workoutId={workout.id} />
          ) : workout.status === "in_progress" ? (
            <Button asChild>
              <Link href={`/workouts/${workout.id}/log`}>Continue logging</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href={`/workouts/${workout.id}/log`}>Edit log</Link>
            </Button>
          )}
          <DeleteWorkoutButton workoutId={workout.id} />
        </div>
      </div>

      {workout.notes ? (
        <p className="mt-6 whitespace-pre-line rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          {workout.notes}
        </p>
      ) : null}

      {workout.workout_exercises.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No exercises on this workout.
          </p>
        </div>
      ) : (
        <ul className="mt-10 space-y-4">
          {workout.workout_exercises.map((ex) => (
            <li key={ex.id} className="rounded-lg border bg-card">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
                <div>
                  <Link
                    href={`/exercises/${ex.exercise_id}`}
                    className="font-medium hover:underline"
                  >
                    {ex.exercise_name}
                  </Link>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {ex.muscle ? (
                      <Badge variant="default">{ex.muscle}</Badge>
                    ) : null}
                    {ex.equipment ? (
                      <Badge variant="outline">{ex.equipment}</Badge>
                    ) : null}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {ex.exercise_sets.length} set
                  {ex.exercise_sets.length === 1 ? "" : "s"}
                </span>
              </div>
              {ex.exercise_sets.length > 0 ? (
                <ul className="divide-y">
                  {ex.exercise_sets.map((set) => (
                    <li
                      key={set.id}
                      className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                    >
                      <span className="w-10 text-muted-foreground">
                        #{set.set_number}
                      </span>
                      <span className="flex-1">
                        {set.weight != null ? (
                          <>
                            {set.weight} {set.weight_unit ?? "lbs"}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        <span className="mx-2 text-muted-foreground">×</span>
                        {set.reps ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </span>
                      {set.is_completed ? (
                        <Badge variant="success">Done</Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
