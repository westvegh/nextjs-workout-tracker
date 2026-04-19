/**
 * Previous-performance lookup.
 *
 * Walks the store's recent workouts to find the most recent completed set for
 * a given exercise_id, which the logger uses to populate ghost "Last: 135 x 10"
 * placeholders.
 *
 * Works for both stores:
 *  - LocalStore: listWorkouts + getWorkout against localStorage
 *  - RemoteStore: same interface, proxies through server actions
 */

import type { WorkoutStore } from "./workout-store";

export interface PreviousPerformance {
  weight: number;
  reps: number;
  date: string;
}

/**
 * Look up the most recent completed set for an exercise.
 *
 * Strategy: sort workouts newest-first (listWorkouts already does date DESC),
 * look up each one until we find a workout_exercise with matching exercise_id
 * and at least one completed set with both weight and reps populated.
 *
 * Bounded to the most recent 20 workouts to keep this cheap even for heavy
 * users. Anyone who has trained an exercise less than every 20 workouts is
 * lifting too often.
 */
export async function getLastPerformance(
  store: WorkoutStore,
  exerciseId: string
): Promise<PreviousPerformance | null> {
  const MAX_WORKOUTS_TO_SCAN = 20;
  let list;
  try {
    list = await store.listWorkouts();
  } catch {
    return null;
  }

  const recent = list.slice(0, MAX_WORKOUTS_TO_SCAN);

  for (const summary of recent) {
    let detail;
    try {
      detail = await store.getWorkout(summary.id);
    } catch {
      continue;
    }
    if (!detail) continue;

    for (const ex of detail.exercises) {
      if (ex.exercise_id !== exerciseId) continue;
      // Walk sets in reverse set_number order so the last set we find is
      // actually the last set of that workout.
      const reversed = [...ex.sets].sort((a, b) => b.set_number - a.set_number);
      for (const s of reversed) {
        if (!s.is_completed) continue;
        if (s.weight == null || s.reps == null) continue;
        return {
          weight: s.weight,
          reps: s.reps,
          date: summary.date,
        };
      }
    }
  }

  return null;
}
