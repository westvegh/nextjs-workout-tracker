"use client";

/**
 * RemoteStore: client-side WorkoutStore adapter that calls server actions.
 *
 * The dispatcher (getStore) picks between LocalStore (anon) and RemoteStore
 * (signed-in) so pages don't need to branch on auth state. RemoteStore proxies
 * through server actions in src/app/workouts/actions.ts — which internally
 * instantiate SupabaseStore — so the server/client boundary stays clean.
 */

import * as actions from "@/app/workouts/actions";
import type {
  CreateWorkoutInput,
  SetInput,
  Workout,
  WorkoutStatus,
  WorkoutStore,
  WorkoutWithChildren,
} from "./workout-store";

export class RemoteStore implements WorkoutStore {
  async createWorkout(input: CreateWorkoutInput): Promise<{ id: string }> {
    const id = await actions.createWorkout(input);
    return { id };
  }

  async listWorkouts(): Promise<Array<Workout & { exercise_count: number }>> {
    return actions.listWorkouts();
  }

  async getWorkout(id: string): Promise<WorkoutWithChildren | null> {
    return actions.getWorkout(id);
  }

  async deleteWorkout(id: string): Promise<void> {
    await actions.deleteWorkoutNoRedirect(id);
  }

  async setWorkoutStatus(id: string, status: WorkoutStatus): Promise<void> {
    await actions.setWorkoutStatus(id, status);
  }

  async upsertSets(workoutId: string, sets: SetInput[]): Promise<void> {
    await actions.upsertSets(workoutId, sets);
  }
}
