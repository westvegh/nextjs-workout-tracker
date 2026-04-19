"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getStore, type WorkoutWithChildren } from "@/lib/workout-store";
import { WorkoutLogger } from "./workout-logger";

type Params = Promise<{ id: string }>;

export default function WorkoutLogPage({ params }: { params: Params }) {
  const { id } = use(params);

  const hasSupabaseEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const [authLoaded, setAuthLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [workout, setWorkout] = useState<WorkoutWithChildren | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv) {
      setUserId(null);
      setAuthLoaded(true);
      return;
    }
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled) return;
        setUserId(data.user?.id ?? null);
        setAuthLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setUserId(null);
        setAuthLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hasSupabaseEnv]);

  useEffect(() => {
    if (!authLoaded) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const store = await getStore(userId);
        const row = await store.getWorkout(id);
        if (cancelled) return;
        setWorkout(row);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load workout");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoaded, userId, id]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-24 text-center text-sm text-muted-foreground">
        Loading workout…
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error}
        </div>
      </main>
    );
  }

  if (!workout) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Workout not found</h1>
        <p className="mt-2 text-muted-foreground">
          That workout doesn&apos;t exist on this device.
        </p>
        <Button asChild className="mt-6">
          <Link href="/workouts">All workouts</Link>
        </Button>
      </main>
    );
  }

  if (workout.exercises.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Nothing to log</h1>
        <p className="mt-2 text-muted-foreground">
          This workout has no exercises.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href={`/workouts/${workout.id}`}>Back to workout</Link>
        </Button>
      </main>
    );
  }

  // The WorkoutLogger is already a client component; it takes the
  // ex-Supabase selection shape. Map our WorkoutWithChildren into that
  // shape (the two shapes differ only in nesting names: exercise_sets
  // vs sets).
  const workoutForLogger = {
    id: workout.id,
    name: workout.name,
    date: workout.date,
    status: workout.status,
    workout_exercises: workout.exercises.map((ex) => ({
      id: ex.id,
      exercise_name: ex.exercise_name,
      muscle: ex.muscle,
      equipment: ex.equipment,
      order_index: ex.order_index,
      exercise_sets: ex.sets.map((s) => ({
        id: s.id,
        set_number: s.set_number,
        weight: s.weight,
        weight_unit: s.weight_unit,
        reps: s.reps,
        is_completed: s.is_completed,
      })),
    })),
  };

  return <WorkoutLogger workout={workoutForLogger} isGuest={!userId} />;
}
