"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface PendingExercise {
  exercise_id: string;
  exercise_name: string;
  muscle: string | null;
  equipment: string | null;
  default_sets: number;
}

export interface CreateWorkoutInput {
  name: string;
  date: string; // YYYY-MM-DD
  exercises: PendingExercise[];
}

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    throw new Error("Not authenticated");
  }
  return data.user.id;
}

export async function createWorkout(input: CreateWorkoutInput): Promise<string> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      date: input.date,
      name: input.name.trim() || null,
      status: "planned",
    })
    .select("id")
    .single();

  if (workoutError || !workout) {
    throw new Error(workoutError?.message ?? "Failed to create workout");
  }

  if (input.exercises.length > 0) {
    const exerciseRows = input.exercises.map((ex, idx) => ({
      workout_id: workout.id,
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      muscle: ex.muscle,
      equipment: ex.equipment,
      order_index: idx,
    }));

    const { data: inserted, error: exError } = await supabase
      .from("workout_exercises")
      .insert(exerciseRows)
      .select("id, order_index");

    if (exError || !inserted) {
      throw new Error(exError?.message ?? "Failed to save exercises");
    }

    // Seed default_sets placeholder sets per exercise so the logger has rows to show.
    const setRows: Array<{
      workout_exercise_id: string;
      set_number: number;
    }> = [];
    for (const we of inserted) {
      const defaults = input.exercises[we.order_index]?.default_sets ?? 3;
      for (let n = 1; n <= defaults; n++) {
        setRows.push({ workout_exercise_id: we.id, set_number: n });
      }
    }
    if (setRows.length > 0) {
      const { error: setsError } = await supabase
        .from("exercise_sets")
        .insert(setRows);
      if (setsError) throw new Error(setsError.message);
    }
  }

  revalidatePath("/workouts");
  return workout.id;
}

export async function deleteWorkout(id: string): Promise<void> {
  const supabase = await createClient();
  await requireUserId();

  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/workouts");
  redirect("/workouts");
}

export async function setWorkoutStatus(
  id: string,
  status: "planned" | "in_progress" | "completed"
): Promise<void> {
  const supabase = await createClient();
  await requireUserId();

  const update: Record<string, unknown> = { status };
  if (status === "in_progress") update.started_at = new Date().toISOString();
  if (status === "completed") update.completed_at = new Date().toISOString();

  const { error } = await supabase.from("workouts").update(update).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/workouts/${id}`);
}

export interface SetInput {
  id?: string;
  workout_exercise_id: string;
  set_number: number;
  weight: number | null;
  weight_unit: "lbs" | "kg";
  reps: number | null;
  is_completed: boolean;
}

export async function upsertSets(
  workoutId: string,
  sets: SetInput[]
): Promise<void> {
  const supabase = await createClient();
  await requireUserId();

  const rows = sets.map((s) => ({
    ...(s.id ? { id: s.id } : {}),
    workout_exercise_id: s.workout_exercise_id,
    set_number: s.set_number,
    weight: s.weight,
    weight_unit: s.weight_unit,
    reps: s.reps,
    is_completed: s.is_completed,
    completed_at: s.is_completed ? new Date().toISOString() : null,
  }));

  // Upsert by primary key where id is present; insert otherwise. Do both in one batch.
  if (rows.length > 0) {
    const { error } = await supabase
      .from("exercise_sets")
      .upsert(rows, { onConflict: "id" });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/workouts/${workoutId}`);
  revalidatePath(`/workouts/${workoutId}/log`);
}

export async function finishWorkout(id: string): Promise<void> {
  await setWorkoutStatus(id, "completed");
  redirect(`/workouts/${id}`);
}
