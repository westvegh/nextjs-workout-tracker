import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { WorkoutLogger } from "./workout-logger";

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
  workout_exercises: WorkoutExerciseRow[];
}

export default async function WorkoutLogPage({
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
    redirect("/auth/signin");
  }

  const { data, error } = await supabase
    .from("workouts")
    .select(
      `
      id, name, date, status,
      workout_exercises(
        id, exercise_name, muscle, equipment, order_index,
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

  if (workout.workout_exercises.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Nothing to log
        </h1>
        <p className="mt-2 text-muted-foreground">
          This workout has no exercises.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href={`/workouts/${workout.id}`}>Back to workout</Link>
        </Button>
      </main>
    );
  }

  return <WorkoutLogger workout={workout} />;
}
