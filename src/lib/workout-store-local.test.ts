import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoreError } from "./workout-store";
import { LocalStore, STORAGE_KEY, createLocalStore } from "./workout-store-local";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem(key) {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

function validExercise(overrides: Record<string, unknown> = {}) {
  return {
    exercise_id: "ex-1",
    exercise_name: "Bench press",
    muscle: "chest",
    equipment: "barbell",
    default_sets: 3,
    ...overrides,
  };
}

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Push day",
    date: "2026-04-18",
    exercises: [validExercise()],
    ...overrides,
  };
}

describe("LocalStore.createWorkout", () => {
  let store: LocalStore;

  beforeEach(() => {
    store = createLocalStore({ storage: memoryStorage() });
  });

  it("creates a workout and can fetch it back", async () => {
    const { id } = await store.createWorkout(validInput());
    expect(id).toMatch(/.+/);

    const got = await store.getWorkout(id);
    expect(got).not.toBeNull();
    expect(got!.name).toBe("Push day");
    expect(got!.date).toBe("2026-04-18");
    expect(got!.status).toBe("planned");
    expect(got!.exercises).toHaveLength(1);
    expect(got!.exercises[0].exercise_name).toBe("Bench press");
    expect(got!.exercises[0].sets).toHaveLength(3);
  });

  it("works with zero exercises and seeds no sets", async () => {
    const { id } = await store.createWorkout(validInput({ exercises: [] }));
    const got = await store.getWorkout(id);
    expect(got!.exercises).toHaveLength(0);
  });

  it("seeds default_sets blank sets per exercise (3 x 3 = 9)", async () => {
    const { id } = await store.createWorkout(
      validInput({
        exercises: [
          validExercise({ exercise_id: "a", default_sets: 3 }),
          validExercise({ exercise_id: "b", default_sets: 3 }),
          validExercise({ exercise_id: "c", default_sets: 3 }),
        ],
      })
    );
    const got = await store.getWorkout(id);
    const allSets = got!.exercises.flatMap((e) => e.sets);
    expect(allSets).toHaveLength(9);
    expect(allSets.every((s) => s.weight === null && s.reps === null)).toBe(true);
    expect(allSets.every((s) => s.is_completed === false)).toBe(true);
  });

  it("throws StoreError(validation_failed) on empty exercise_name", async () => {
    await expect(
      store.createWorkout(
        validInput({ exercises: [validExercise({ exercise_name: "   " })] })
      )
    ).rejects.toMatchObject({
      name: "StoreError",
      code: "validation_failed",
      field: "exercises[0].exercise_name",
    });
  });

  it("throws StoreError(quota_exceeded) when localStorage quota is hit", async () => {
    const storage = memoryStorage();
    const quotaErr = Object.assign(new Error("quota"), { name: "QuotaExceededError" });
    const setSpy = vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw quotaErr;
    });
    const quotaStore = createLocalStore({ storage });
    try {
      await expect(quotaStore.createWorkout(validInput())).rejects.toBeInstanceOf(
        StoreError
      );
      await expect(quotaStore.createWorkout(validInput())).rejects.toMatchObject({
        code: "quota_exceeded",
      });
    } finally {
      setSpy.mockRestore();
    }
  });

  it("falls back to in-memory when localStorage is unavailable on init", async () => {
    const failingStorage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("SecurityError");
      },
      removeItem: () => undefined,
    };
    // The probe runs inside the constructor with disabled=false, so we
    // explicitly pass disabled=true and inject a memory storage to simulate
    // the post-probe state.
    const memStorage = memoryStorage();
    const fallbackStore = createLocalStore({ storage: memStorage, disabled: true });
    expect(fallbackStore.storageDisabled).toBe(true);

    const { id } = await fallbackStore.createWorkout(validInput());
    const got = await fallbackStore.getWorkout(id);
    expect(got!.name).toBe("Push day");

    // Also exercise the real probe-on-failure code path.
    const originalLocalStorage = (globalThis as unknown as { localStorage?: Storage })
      .localStorage;
    (globalThis as unknown as { localStorage: StorageLike }).localStorage =
      failingStorage as unknown as Storage;
    try {
      const probed = new LocalStore();
      expect(probed.storageDisabled).toBe(true);
      const created = await probed.createWorkout(validInput());
      const refetch = await probed.getWorkout(created.id);
      expect(refetch).not.toBeNull();
    } finally {
      if (originalLocalStorage) {
        (globalThis as unknown as { localStorage: Storage }).localStorage =
          originalLocalStorage;
      }
    }
  });
});

describe("LocalStore.listWorkouts", () => {
  let store: LocalStore;

  beforeEach(() => {
    store = createLocalStore({ storage: memoryStorage() });
  });

  it("returns [] when empty", async () => {
    expect(await store.listWorkouts()).toEqual([]);
  });

  it("returns workouts sorted by date DESC with exercise_count", async () => {
    await store.createWorkout(validInput({ date: "2026-04-15", name: "A", exercises: [validExercise()] }));
    await store.createWorkout(
      validInput({
        date: "2026-04-20",
        name: "B",
        exercises: [validExercise({ exercise_id: "x" }), validExercise({ exercise_id: "y" })],
      })
    );
    await store.createWorkout(validInput({ date: "2026-04-10", name: "C", exercises: [] }));

    const list = await store.listWorkouts();
    expect(list.map((w) => w.name)).toEqual(["B", "A", "C"]);
    expect(list.map((w) => w.exercise_count)).toEqual([2, 1, 0]);
  });

  it("throws corrupted_state on first call, returns [] after", async () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, "{ this is not json");
    const bad = createLocalStore({ storage });
    await expect(bad.listWorkouts()).rejects.toMatchObject({
      name: "StoreError",
      code: "corrupted_state",
    });
    const list = await bad.listWorkouts();
    expect(list).toEqual([]);
  });

  it("resets + returns [] on wrong schema version", async () => {
    const storage = memoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 999, workouts: [{}], exercises: [], sets: [] })
    );
    const bad = createLocalStore({ storage });
    await expect(bad.listWorkouts()).rejects.toMatchObject({ code: "corrupted_state" });
    expect(await bad.listWorkouts()).toEqual([]);
    // Storage should now hold a clean v1 skeleton.
    const after = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null");
    expect(after.version).toBe(1);
    expect(after.workouts).toEqual([]);
  });
});

describe("LocalStore.getWorkout", () => {
  let store: LocalStore;

  beforeEach(() => {
    store = createLocalStore({ storage: memoryStorage() });
  });

  it("returns null for a missing id", async () => {
    expect(await store.getWorkout("does-not-exist")).toBeNull();
  });

  it("returns exercises sorted by order_index and sets sorted by set_number", async () => {
    const { id } = await store.createWorkout(
      validInput({
        exercises: [
          validExercise({ exercise_id: "a", exercise_name: "A", default_sets: 2 }),
          validExercise({ exercise_id: "b", exercise_name: "B", default_sets: 2 }),
          validExercise({ exercise_id: "c", exercise_name: "C", default_sets: 2 }),
        ],
      })
    );

    const got = await store.getWorkout(id);
    expect(got!.exercises.map((e) => e.exercise_name)).toEqual(["A", "B", "C"]);
    expect(got!.exercises.map((e) => e.order_index)).toEqual([0, 1, 2]);
    for (const ex of got!.exercises) {
      expect(ex.sets.map((s) => s.set_number)).toEqual([1, 2]);
    }
  });
});

describe("LocalStore.deleteWorkout", () => {
  it("cascades to exercises and sets", async () => {
    const storage = memoryStorage();
    const store = createLocalStore({ storage });
    const { id } = await store.createWorkout(
      validInput({
        exercises: [
          validExercise({ exercise_id: "a" }),
          validExercise({ exercise_id: "b" }),
        ],
      })
    );
    await store.deleteWorkout(id);
    expect(await store.getWorkout(id)).toBeNull();
    const raw = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null");
    expect(raw.workouts).toHaveLength(0);
    expect(raw.exercises).toHaveLength(0);
    expect(raw.sets).toHaveLength(0);
  });
});

describe("LocalStore.setWorkoutStatus", () => {
  let store: LocalStore;
  let id: string;

  beforeEach(async () => {
    store = createLocalStore({ storage: memoryStorage() });
    const created = await store.createWorkout(validInput());
    id = created.id;
  });

  it("sets started_at when transitioning to in_progress", async () => {
    await store.setWorkoutStatus(id, "in_progress");
    const got = await store.getWorkout(id);
    expect(got!.status).toBe("in_progress");
    expect(got!.started_at).not.toBeNull();
    expect(got!.completed_at).toBeNull();
  });

  it("sets completed_at when transitioning to completed", async () => {
    await store.setWorkoutStatus(id, "completed");
    const got = await store.getWorkout(id);
    expect(got!.status).toBe("completed");
    expect(got!.completed_at).not.toBeNull();
  });

  it("throws not_found for an unknown workout id", async () => {
    await expect(store.setWorkoutStatus("missing", "completed")).rejects.toMatchObject({
      name: "StoreError",
      code: "not_found",
    });
  });
});

describe("LocalStore.upsertSets", () => {
  it("inserts new sets with generated ids and updates existing sets by id", async () => {
    const store = createLocalStore({ storage: memoryStorage() });
    const { id: workoutId } = await store.createWorkout(
      validInput({
        exercises: [validExercise({ default_sets: 2 })],
      })
    );
    const got = await store.getWorkout(workoutId);
    const weId = got!.exercises[0].id;
    const [first, second] = got!.exercises[0].sets;

    await store.upsertSets(workoutId, [
      {
        id: first.id,
        workout_exercise_id: weId,
        set_number: 1,
        weight: 135,
        weight_unit: "lbs",
        reps: 10,
        is_completed: true,
      },
      {
        // No id → insert new row
        workout_exercise_id: weId,
        set_number: 3,
        weight: 145,
        weight_unit: "lbs",
        reps: 8,
        is_completed: false,
      },
    ]);

    const after = await store.getWorkout(workoutId);
    const sets = after!.exercises[0].sets;
    expect(sets).toHaveLength(3);
    expect(sets.find((s) => s.id === first.id)!.weight).toBe(135);
    expect(sets.find((s) => s.id === first.id)!.is_completed).toBe(true);
    expect(sets.find((s) => s.id === second.id)!.weight).toBeNull();
    const inserted = sets.find((s) => s.set_number === 3)!;
    expect(inserted.weight).toBe(145);
    expect(inserted.is_completed).toBe(false);
  });

  it("throws validation_failed when a set input is invalid", async () => {
    const store = createLocalStore({ storage: memoryStorage() });
    const { id: workoutId } = await store.createWorkout(validInput());
    const got = await store.getWorkout(workoutId);
    const weId = got!.exercises[0].id;
    await expect(
      store.upsertSets(workoutId, [
        {
          workout_exercise_id: weId,
          set_number: 1,
          weight: 9999,
          weight_unit: "lbs",
          reps: 10,
          is_completed: false,
        },
      ])
    ).rejects.toMatchObject({
      name: "StoreError",
      code: "validation_failed",
      field: "weight",
    });
  });

  it("throws not_found when workout_exercise_id does not belong to the workout", async () => {
    const store = createLocalStore({ storage: memoryStorage() });
    const { id: workoutId } = await store.createWorkout(validInput());
    await expect(
      store.upsertSets(workoutId, [
        {
          workout_exercise_id: "not-a-real-id",
          set_number: 1,
          weight: 100,
          weight_unit: "lbs",
          reps: 10,
          is_completed: false,
        },
      ])
    ).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("LocalStore.importToSupabase", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns zero counts when there are no local workouts", async () => {
    const store = createLocalStore({ storage: memoryStorage() });
    const result = await store.importToSupabase({
      createWorkout: async () => ({ id: "x" }),
      listWorkouts: async () => [],
    });
    expect(result).toEqual({ imported: 0, skipped: 0, failed: 0, failures: [] });
  });

  it("imports every local workout when the remote is empty and clears local", async () => {
    const storage = memoryStorage();
    const store = createLocalStore({ storage });
    await store.createWorkout(validInput({ name: "A", date: "2026-04-10" }));
    await store.createWorkout(validInput({ name: "B", date: "2026-04-11" }));

    const calls: Array<{ name: string; date: string }> = [];
    const result = await store.importToSupabase({
      createWorkout: async (input) => {
        calls.push({ name: input.name, date: input.date });
        return { id: "remote-" + calls.length };
      },
      listWorkouts: async () => [],
    });

    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(calls.map((c) => c.name).sort()).toEqual(["A", "B"]);
    expect(await store.listWorkouts()).toEqual([]);
  });

  it("skips local workouts that already exist on the remote by (date, name)", async () => {
    const store = createLocalStore({ storage: memoryStorage() });
    await store.createWorkout(validInput({ name: "Push", date: "2026-04-10" }));
    await store.createWorkout(validInput({ name: "Pull", date: "2026-04-11" }));

    const created: string[] = [];
    const result = await store.importToSupabase({
      createWorkout: async (input) => {
        created.push(input.name);
        return { id: "remote" };
      },
      listWorkouts: async () => [
        {
          id: "remote-push",
          date: "2026-04-10",
          name: "Push",
          status: "completed",
          notes: null,
          rating: null,
          started_at: null,
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          exercise_count: 0,
        },
      ],
    });

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(created).toEqual(["Pull"]);
    // The skipped one is also cleared locally (remote is source of truth).
    expect(await store.listWorkouts()).toEqual([]);
  });

  it("keeps local workouts that fail to import and throws partial_import_failure", async () => {
    const store = createLocalStore({ storage: memoryStorage() });
    await store.createWorkout(validInput({ name: "OK", date: "2026-04-10" }));
    await store.createWorkout(validInput({ name: "Boom", date: "2026-04-11" }));

    let call = 0;
    await expect(
      store.importToSupabase({
        createWorkout: async () => {
          call += 1;
          if (call === 2) throw new Error("remote down");
          return { id: "remote-" + call };
        },
        listWorkouts: async () => [],
      })
    ).rejects.toMatchObject({ name: "StoreError", code: "server_error" });

    const remaining = await store.listWorkouts();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe("Boom");
  });
});

describe("LocalStore.seedIfEmpty", () => {
  it("seeds the example workouts once on an empty store", async () => {
    const storage = memoryStorage();
    const store = createLocalStore({ storage });
    store.seedIfEmpty();
    const list = await store.listWorkouts();
    expect(list.length).toBeGreaterThanOrEqual(3);
    // Second call is a no-op.
    store.seedIfEmpty();
    const list2 = await store.listWorkouts();
    expect(list2.length).toBe(list.length);
  });

  it("does not re-seed after the user deletes all example workouts", async () => {
    const storage = memoryStorage();
    const store = createLocalStore({ storage });
    store.seedIfEmpty();
    const list = await store.listWorkouts();
    for (const w of list) {
      await store.deleteWorkout(w.id);
    }
    expect(await store.listWorkouts()).toEqual([]);
    // Creating a fresh wrapper around the same storage still respects the flag.
    const nextStore = createLocalStore({ storage });
    nextStore.seedIfEmpty();
    expect(await nextStore.listWorkouts()).toEqual([]);
  });

  it("does not seed when the store already has user workouts", async () => {
    const storage = memoryStorage();
    const store = createLocalStore({ storage });
    await store.createWorkout(validInput({ name: "Mine", date: "2026-04-01" }));
    store.seedIfEmpty();
    const list = await store.listWorkouts();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Mine");
  });
});
