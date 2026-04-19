"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type {
  CreateWorkoutInput,
  SetInput,
  Workout,
  WorkoutStatus,
  WorkoutWithChildren,
} from "@/lib/workout-store";
import { SupabaseStore } from "@/lib/workout-store-supabase";

// Re-export the input types so existing callers keep working without import changes.
export type {
  CreateWorkoutInput,
  PendingExercise,
  SetInput,
} from "@/lib/workout-store";

async function getStore(): Promise<SupabaseStore> {
  const client = await createClient();
  const { data } = await client.auth.getUser();
  if (!data.user) {
    throw new Error("Not authenticated");
  }
  return new SupabaseStore(client, data.user.id);
}

export async function createWorkout(input: CreateWorkoutInput): Promise<string> {
  const store = await getStore();
  const { id } = await store.createWorkout(input);
  revalidatePath("/workouts");
  return id;
}

export async function listWorkouts(): Promise<
  Array<Workout & { exercise_count: number }>
> {
  const store = await getStore();
  return store.listWorkouts();
}

export async function getWorkout(
  id: string
): Promise<WorkoutWithChildren | null> {
  const store = await getStore();
  return store.getWorkout(id);
}

export async function deleteWorkout(id: string): Promise<void> {
  const store = await getStore();
  await store.deleteWorkout(id);
  revalidatePath("/workouts");
  redirect("/workouts");
}

// Variant that doesn't redirect — for client-side callers that want to handle
// navigation themselves (e.g., client components driven by the RemoteStore).
export async function deleteWorkoutNoRedirect(id: string): Promise<void> {
  const store = await getStore();
  await store.deleteWorkout(id);
  revalidatePath("/workouts");
}

export async function setWorkoutStatus(
  id: string,
  status: WorkoutStatus
): Promise<void> {
  const store = await getStore();
  await store.setWorkoutStatus(id, status);
  revalidatePath(`/workouts/${id}`);
}

export async function upsertSets(
  workoutId: string,
  sets: SetInput[]
): Promise<void> {
  const store = await getStore();
  await store.upsertSets(workoutId, sets);
  revalidatePath(`/workouts/${workoutId}`);
  revalidatePath(`/workouts/${workoutId}/log`);
}

export async function finishWorkout(id: string): Promise<void> {
  await setWorkoutStatus(id, "completed");
  redirect(`/workouts/${id}`);
}

// Client-caller-friendly finish: stamp status without the server redirect.
export async function finishWorkoutNoRedirect(id: string): Promise<void> {
  await setWorkoutStatus(id, "completed");
}
