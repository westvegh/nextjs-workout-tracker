/**
 * SupabaseStore: WorkoutStore implementation backed by Postgres via Supabase.
 *
 * All input is validated through workout-validation before hitting the DB.
 * Postgres errors are domain-ified to StoreError so column/constraint names
 * never leak to the user.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  StoreError,
  type CreateWorkoutInput,
  type SetInput,
  type Workout,
  type WorkoutStatus,
  type WorkoutStore,
  type WorkoutWithChildren,
} from "@/lib/workout-store";
import {
  ValidationError,
  validateSetInput,
  validateWorkoutInput,
} from "@/lib/workout-validation";

type SupabaseLike = Pick<SupabaseClient, "from">;

interface SupabasePostgresError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

function toStoreError(
  err: SupabasePostgresError | null | undefined,
  fallback = "server_error" as const
): StoreError {
  const message = err?.message ?? "Unknown Supabase error";
  return new StoreError(fallback, {
    message,
    cause: err ?? undefined,
  });
}

function fromValidationError(err: ValidationError): StoreError {
  return new StoreError("validation_failed", {
    message: err.message,
    userMessage: err.message,
    field: err.field,
    cause: err,
  });
}

function runValidation<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (err instanceof ValidationError) {
      throw fromValidationError(err);
    }
    throw err;
  }
}

export class SupabaseStore implements WorkoutStore {
  private readonly client: SupabaseLike;
  private readonly userId: string;

  constructor(client: SupabaseLike, userId: string) {
    this.client = client;
    this.userId = userId;
  }

  async createWorkout(input: CreateWorkoutInput): Promise<{ id: string }> {
    const normalized = runValidation(() => validateWorkoutInput(input));

    const { data: workout, error: workoutError } = await this.client
      .from("workouts")
      .insert({
        user_id: this.userId,
        date: normalized.date,
        name: normalized.name,
        status: "planned",
      })
      .select("id")
      .single();

    if (workoutError || !workout) {
      throw toStoreError(workoutError ?? { message: "Failed to create workout" });
    }

    const workoutId = (workout as { id: string }).id;

    if (normalized.exercises.length === 0) {
      return { id: workoutId };
    }

    const exerciseRows = normalized.exercises.map((ex, idx) => ({
      workout_id: workoutId,
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      muscle: ex.muscle,
      equipment: ex.equipment,
      order_index: idx,
    }));

    const { data: inserted, error: exError } = await this.client
      .from("workout_exercises")
      .insert(exerciseRows)
      .select("id, order_index");

    if (exError || !inserted) {
      throw toStoreError(exError ?? { message: "Failed to save exercises" });
    }

    // Supabase does not guarantee rows come back in insert order. Build a map
    // keyed by order_index so we can pair each inserted row with the original
    // input entry regardless of return order. The CRITICAL fix: default_sets
    // must come from normalized.exercises (the source of truth), not from
    // whatever row happens to be at the same position in `inserted`.
    const insertedRows = inserted as Array<{ id: string; order_index: number }>;
    const idByOrder = new Map<number, string>();
    for (const row of insertedRows) {
      idByOrder.set(row.order_index, row.id);
    }

    const setRows: Array<{ workout_exercise_id: string; set_number: number }> = [];
    for (let idx = 0; idx < normalized.exercises.length; idx++) {
      const insertedId = idByOrder.get(idx);
      if (!insertedId) {
        throw new StoreError("server_error", {
          message: `missing inserted row for order_index ${idx}`,
        });
      }
      const defaults = normalized.exercises[idx].default_sets;
      for (let n = 1; n <= defaults; n++) {
        setRows.push({ workout_exercise_id: insertedId, set_number: n });
      }
    }

    if (setRows.length > 0) {
      const { error: setsError } = await this.client
        .from("exercise_sets")
        .insert(setRows);
      if (setsError) {
        throw toStoreError(setsError);
      }
    }

    return { id: workoutId };
  }

  async listWorkouts(): Promise<Array<Workout & { exercise_count: number }>> {
    // Single round-trip: the nested `workout_exercises(count)` selector returns
    // the aggregate inline. No N+1.
    const { data, error } = await this.client
      .from("workouts")
      .select(
        "id, date, name, status, notes, rating, started_at, completed_at, created_at, updated_at, workout_exercises(count)"
      )
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw toStoreError(error);
    if (!data) return [];

    type RowShape = Workout & {
      workout_exercises?: Array<{ count: number }> | null;
    };

    return (data as unknown as RowShape[]).map((row) => {
      const countRows = row.workout_exercises;
      const exercise_count =
        Array.isArray(countRows) && countRows.length > 0
          ? Number(countRows[0]?.count ?? 0)
          : 0;
      const { workout_exercises, ...rest } = row;
      void workout_exercises;
      return { ...(rest as Workout), exercise_count };
    });
  }

  async getWorkout(id: string): Promise<WorkoutWithChildren | null> {
    const { data, error } = await this.client
      .from("workouts")
      .select(
        `
        id, date, name, status, notes, rating, started_at, completed_at,
        created_at, updated_at,
        workout_exercises(
          id, workout_id, exercise_id, exercise_name, muscle, equipment,
          order_index, notes,
          exercise_sets(
            id, workout_exercise_id, set_number, weight, weight_unit, reps,
            is_completed, completed_at
          )
        )
        `
      )
      .eq("id", id)
      .order("order_index", { referencedTable: "workout_exercises" })
      .order("set_number", {
        referencedTable: "workout_exercises.exercise_sets",
      })
      .maybeSingle();

    if (error) throw toStoreError(error);
    if (!data) return null;

    type RowShape = Workout & {
      workout_exercises: Array<
        WorkoutWithChildren["exercises"][number] & {
          exercise_sets: WorkoutWithChildren["exercises"][number]["sets"];
        }
      >;
    };

    const row = data as unknown as RowShape;
    const exercises = (row.workout_exercises ?? []).map((we) => {
      const { exercise_sets, ...rest } = we;
      return { ...rest, sets: exercise_sets ?? [] };
    });

    const { workout_exercises, ...base } = row;
    void workout_exercises;
    return { ...(base as Workout), exercises };
  }

  async deleteWorkout(id: string): Promise<void> {
    const { error } = await this.client.from("workouts").delete().eq("id", id);
    if (error) throw toStoreError(error);
  }

  async setWorkoutStatus(id: string, status: WorkoutStatus): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (status === "in_progress") update.started_at = new Date().toISOString();
    if (status === "completed") update.completed_at = new Date().toISOString();

    const { error } = await this.client
      .from("workouts")
      .update(update)
      .eq("id", id);
    if (error) throw toStoreError(error);
  }

  async upsertSets(_workoutId: string, sets: SetInput[]): Promise<void> {
    if (sets.length === 0) return;

    const normalized = runValidation(() => sets.map((s) => validateSetInput(s)));

    const rows = normalized.map((s) => ({
      ...(s.id ? { id: s.id } : {}),
      workout_exercise_id: s.workout_exercise_id,
      set_number: s.set_number,
      weight: s.weight,
      weight_unit: s.weight_unit,
      reps: s.reps,
      is_completed: s.is_completed,
      completed_at: s.is_completed ? new Date().toISOString() : null,
    }));

    const { error } = await this.client
      .from("exercise_sets")
      .upsert(rows, { onConflict: "id" });
    if (error) throw toStoreError(error);
  }
}
