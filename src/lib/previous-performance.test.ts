import { describe, expect, it } from "vitest";
import { getLastPerformance } from "./previous-performance";
import type {
  ExerciseSet,
  Workout,
  WorkoutExercise,
  WorkoutStore,
  WorkoutWithChildren,
} from "./workout-store";

function workout(
  id: string,
  date: string,
  exercises: Array<{
    exerciseId: string;
    sets: Array<Partial<ExerciseSet> & { set_number: number }>;
  }>
): WorkoutWithChildren {
  const w: Workout = {
    id,
    date,
    name: null,
    status: "completed",
    notes: null,
    rating: null,
    started_at: null,
    completed_at: null,
    created_at: date,
    updated_at: date,
  };
  return {
    ...w,
    exercises: exercises.map((ex, i) => {
      const we: WorkoutExercise & { sets: ExerciseSet[] } = {
        id: `${id}-ex-${i}`,
        workout_id: id,
        exercise_id: ex.exerciseId,
        exercise_name: "x",
        muscle: null,
        equipment: null,
        order_index: i,
        notes: null,
        sets: ex.sets.map((s, j) => ({
          id: `${id}-ex-${i}-set-${j}`,
          workout_exercise_id: `${id}-ex-${i}`,
          set_number: s.set_number,
          weight: s.weight ?? null,
          weight_unit: (s.weight_unit ?? "lbs") as "lbs" | "kg",
          reps: s.reps ?? null,
          is_completed: s.is_completed ?? false,
          completed_at: null,
        })),
      };
      return we;
    }),
  };
}

function makeStore(workouts: WorkoutWithChildren[]): WorkoutStore {
  return {
    async createWorkout() {
      throw new Error("not used");
    },
    async listWorkouts() {
      return [...workouts]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((w) => ({ ...w, exercise_count: w.exercises.length }));
    },
    async getWorkout(id: string) {
      return workouts.find((w) => w.id === id) ?? null;
    },
    async deleteWorkout() {},
    async setWorkoutStatus() {},
    async upsertSets() {},
  };
}

describe("getLastPerformance", () => {
  it("returns null when the store has no workouts", async () => {
    const store = makeStore([]);
    expect(await getLastPerformance(store, "ex-1")).toBeNull();
  });

  it("returns null when the exercise has never been used", async () => {
    const store = makeStore([
      workout("w1", "2026-04-01", [
        {
          exerciseId: "bench",
          sets: [
            { set_number: 1, weight: 135, reps: 10, is_completed: true },
          ],
        },
      ]),
    ]);
    expect(await getLastPerformance(store, "squat")).toBeNull();
  });

  it("returns the last completed set of the most recent matching workout", async () => {
    const store = makeStore([
      workout("w-old", "2026-03-01", [
        {
          exerciseId: "bench",
          sets: [
            { set_number: 1, weight: 100, reps: 10, is_completed: true },
            { set_number: 2, weight: 105, reps: 10, is_completed: true },
          ],
        },
      ]),
      workout("w-recent", "2026-04-01", [
        {
          exerciseId: "bench",
          sets: [
            { set_number: 1, weight: 135, reps: 10, is_completed: true },
            { set_number: 2, weight: 140, reps: 8, is_completed: true },
          ],
        },
      ]),
    ]);
    const result = await getLastPerformance(store, "bench");
    expect(result).toEqual({ weight: 140, reps: 8, date: "2026-04-01" });
  });

  it("skips incomplete sets", async () => {
    const store = makeStore([
      workout("w-recent", "2026-04-01", [
        {
          exerciseId: "bench",
          sets: [
            { set_number: 1, weight: 135, reps: 10, is_completed: true },
            { set_number: 2, weight: 140, reps: null, is_completed: false },
          ],
        },
      ]),
    ]);
    const result = await getLastPerformance(store, "bench");
    expect(result).toEqual({ weight: 135, reps: 10, date: "2026-04-01" });
  });

  it("skips sets missing weight or reps even if completed", async () => {
    const store = makeStore([
      workout("w-recent", "2026-04-01", [
        {
          exerciseId: "bench",
          sets: [
            { set_number: 1, weight: 135, reps: 10, is_completed: true },
            { set_number: 2, weight: null, reps: 8, is_completed: true },
          ],
        },
      ]),
    ]);
    const result = await getLastPerformance(store, "bench");
    expect(result).toEqual({ weight: 135, reps: 10, date: "2026-04-01" });
  });

  it("returns null when the store's listWorkouts throws", async () => {
    const store: WorkoutStore = {
      async createWorkout() {
        throw new Error("nope");
      },
      async listWorkouts() {
        throw new Error("boom");
      },
      async getWorkout() {
        return null;
      },
      async deleteWorkout() {},
      async setWorkoutStatus() {},
      async upsertSets() {},
    };
    expect(await getLastPerformance(store, "x")).toBeNull();
  });
});
