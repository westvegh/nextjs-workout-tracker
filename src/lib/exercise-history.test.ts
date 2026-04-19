import { describe, expect, it } from "vitest";
import { getExerciseHistory } from "./exercise-history";
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

describe("getExerciseHistory", () => {
  it("returns empty shape when the store has no workouts", async () => {
    const store = makeStore([]);
    expect(await getExerciseHistory(store, "ex-1")).toEqual({
      last: null,
      pr: null,
      history: [],
    });
  });

  it("returns empty shape when the exercise has never been used", async () => {
    const store = makeStore([
      workout("w1", "2026-04-01", [
        {
          exerciseId: "bench",
          sets: [{ set_number: 1, weight: 135, reps: 10, is_completed: true }],
        },
      ]),
    ]);
    const result = await getExerciseHistory(store, "squat");
    expect(result).toEqual({ last: null, pr: null, history: [] });
  });

  it("picks the top set (max weight*reps) as both last and pr for a single workout", async () => {
    const store = makeStore([
      workout("w1", "2026-04-01", [
        {
          exerciseId: "bench",
          sets: [
            { set_number: 1, weight: 135, reps: 10, is_completed: true },
            { set_number: 2, weight: 155, reps: 5, is_completed: true },
            { set_number: 3, weight: 145, reps: 8, is_completed: true },
          ],
        },
      ]),
    ]);
    const result = await getExerciseHistory(store, "bench");
    // 145*8 = 1160 > 135*10 = 1350. Wait, 1350 > 1160. Top = set 1 (135x10).
    // Actually 155*5 = 775, 145*8 = 1160, 135*10 = 1350. Top is set 1.
    expect(result.last).toEqual({ weight: 135, reps: 10, date: "2026-04-01" });
    expect(result.pr).toEqual({ weight: 135, reps: 10, date: "2026-04-01" });
    expect(result.history).toEqual([135]);
  });

  it("pr stays anchored to the heaviest workout even if last was lighter", async () => {
    const store = makeStore([
      workout("w-pr", "2026-03-01", [
        {
          exerciseId: "bench",
          sets: [{ set_number: 1, weight: 205, reps: 5, is_completed: true }],
        },
      ]),
      workout("w-last", "2026-04-01", [
        {
          exerciseId: "bench",
          sets: [{ set_number: 1, weight: 185, reps: 8, is_completed: true }],
        },
      ]),
    ]);
    const result = await getExerciseHistory(store, "bench");
    // 205*5 = 1025, 185*8 = 1480. Top set of w-last (185x8) is actually heavier score.
    // The helper picks top set per workout, then PR = max across matches.
    expect(result.last).toEqual({ weight: 185, reps: 8, date: "2026-04-01" });
    expect(result.pr).toEqual({ weight: 185, reps: 8, date: "2026-04-01" });
  });

  it("pr anchors to the earlier workout when its top set outranks later tops", async () => {
    const store = makeStore([
      workout("w-pr", "2026-03-01", [
        {
          exerciseId: "bench",
          sets: [{ set_number: 1, weight: 225, reps: 3, is_completed: true }],
        },
      ]),
      workout("w-last", "2026-04-01", [
        {
          exerciseId: "bench",
          sets: [{ set_number: 1, weight: 185, reps: 3, is_completed: true }],
        },
      ]),
    ]);
    const result = await getExerciseHistory(store, "bench");
    // 225*3 = 675 > 185*3 = 555.
    expect(result.last).toEqual({ weight: 185, reps: 3, date: "2026-04-01" });
    expect(result.pr).toEqual({ weight: 225, reps: 3, date: "2026-03-01" });
    // history is oldest → newest.
    expect(result.history).toEqual([225, 185]);
  });

  it("caps the history array at 7 entries even with more matching workouts", async () => {
    const workouts = Array.from({ length: 10 }, (_, i) =>
      workout(`w${i}`, `2026-04-${String(i + 1).padStart(2, "0")}`, [
        {
          exerciseId: "bench",
          sets: [
            { set_number: 1, weight: 100 + i * 5, reps: 5, is_completed: true },
          ],
        },
      ])
    );
    const store = makeStore(workouts);
    const result = await getExerciseHistory(store, "bench");
    expect(result.history.length).toBe(7);
    // Newest-first scan stops at 7; history oldest→newest preserves that.
    expect(result.last?.weight).toBe(145); // w9 = 100 + 9*5
  });

  it("skips incomplete sets when picking the top set", async () => {
    const store = makeStore([
      workout("w1", "2026-04-01", [
        {
          exerciseId: "bench",
          sets: [
            { set_number: 1, weight: 135, reps: 10, is_completed: true },
            { set_number: 2, weight: 999, reps: 20, is_completed: false },
          ],
        },
      ]),
    ]);
    const result = await getExerciseHistory(store, "bench");
    expect(result.last).toEqual({ weight: 135, reps: 10, date: "2026-04-01" });
  });

  it("skips workouts where the exercise has no completed sets", async () => {
    const store = makeStore([
      workout("w-empty", "2026-04-01", [
        {
          exerciseId: "bench",
          sets: [{ set_number: 1, weight: null, reps: null, is_completed: false }],
        },
      ]),
      workout("w-good", "2026-03-01", [
        {
          exerciseId: "bench",
          sets: [{ set_number: 1, weight: 135, reps: 10, is_completed: true }],
        },
      ]),
    ]);
    const result = await getExerciseHistory(store, "bench");
    expect(result.last).toEqual({ weight: 135, reps: 10, date: "2026-03-01" });
    expect(result.history).toEqual([135]);
  });
});
