/**
 * LocalStore — anonymous, localStorage-backed WorkoutStore.
 *
 * Error handling invariants (per CEO plan):
 * - QuotaExceededError on setItem → StoreError("quota_exceeded")
 * - Corrupted JSON on read → reset to empty + StoreError("corrupted_state")
 *   on FIRST read; subsequent reads return the fresh empty state
 * - localStorage unavailable (Safari private, blocked) → transparent
 *   in-memory fallback; storageDisabled flag is true and data is lost
 *   on page reload
 * - Schema version mismatch → reset + StoreError("corrupted_state")
 */

import type {
  CreateWorkoutInput,
  ExerciseSet,
  SetInput,
  Workout,
  WorkoutExercise,
  WorkoutStatus,
  WorkoutStore,
  WorkoutWithChildren,
} from "./workout-store";
import { StoreError } from "./workout-store";
import {
  validateSetInput,
  validateWorkoutInput,
  ValidationError,
} from "./workout-validation";

export const STORAGE_KEY = "wt_workouts_v1";
export const STORAGE_VERSION = 1 as const;

interface StorageShape {
  version: 1;
  workouts: Workout[];
  exercises: WorkoutExercise[];
  sets: ExerciseSet[];
}

function emptyState(): StorageShape {
  return { version: STORAGE_VERSION, workouts: [], exercises: [], sets: [] };
}

// Minimal storage surface — either the real Storage or an in-memory fallback.
interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function createMemoryStorage(): StorageLike {
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

function probeStorage(): { storage: StorageLike; disabled: boolean } {
  if (typeof globalThis === "undefined" || typeof globalThis.localStorage === "undefined") {
    return { storage: createMemoryStorage(), disabled: true };
  }
  try {
    const probeKey = "__wt_probe__";
    globalThis.localStorage.setItem(probeKey, "1");
    globalThis.localStorage.removeItem(probeKey);
    return { storage: globalThis.localStorage as StorageLike, disabled: false };
  } catch {
    return { storage: createMemoryStorage(), disabled: true };
  }
}

function isQuotaExceeded(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: unknown; code?: unknown };
  return (
    e.name === "QuotaExceededError" ||
    e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    e.code === 22 ||
    e.code === 1014
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback (happy-dom provides crypto.randomUUID, but guard anyway).
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

interface SupabaseStoreLike {
  createWorkout: WorkoutStore["createWorkout"];
}

export class LocalStore implements WorkoutStore {
  readonly storageDisabled: boolean;
  private storage: StorageLike;

  constructor(storage?: StorageLike, disabled?: boolean) {
    if (storage) {
      this.storage = storage;
      this.storageDisabled = disabled ?? false;
    } else {
      const probe = probeStorage();
      this.storage = probe.storage;
      this.storageDisabled = probe.disabled;
    }
  }

  private readState(): StorageShape {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (raw === null) {
      return emptyState();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.warn("[LocalStore] corrupted JSON, resetting", err);
      this.resetToEmpty();
      throw new StoreError("corrupted_state", { cause: err });
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as { version?: unknown }).version !== STORAGE_VERSION
    ) {
      console.warn("[LocalStore] schema version mismatch, resetting");
      this.resetToEmpty();
      throw new StoreError("corrupted_state");
    }

    const shape = parsed as Partial<StorageShape>;
    return {
      version: STORAGE_VERSION,
      workouts: Array.isArray(shape.workouts) ? shape.workouts : [],
      exercises: Array.isArray(shape.exercises) ? shape.exercises : [],
      sets: Array.isArray(shape.sets) ? shape.sets : [],
    };
  }

  /**
   * Read state, swallowing the single "corrupted_state" signal. Mutations
   * want a clean empty state on first write after corruption rather than
   * a second user-visible error.
   */
  private readStateOrEmpty(): StorageShape {
    try {
      return this.readState();
    } catch (err) {
      if (err instanceof StoreError && err.code === "corrupted_state") {
        return emptyState();
      }
      throw err;
    }
  }

  private writeState(state: StorageShape): void {
    const payload = JSON.stringify(state);
    try {
      this.storage.setItem(STORAGE_KEY, payload);
    } catch (err) {
      if (isQuotaExceeded(err)) {
        throw new StoreError("quota_exceeded", { cause: err });
      }
      throw new StoreError("storage_unavailable", { cause: err });
    }
  }

  private resetToEmpty(): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(emptyState()));
    } catch {
      // Best-effort; if even the reset fails we already surface an error above.
    }
  }

  async createWorkout(input: CreateWorkoutInput): Promise<{ id: string }> {
    let normalized;
    try {
      normalized = validateWorkoutInput(input);
    } catch (err) {
      if (err instanceof ValidationError) {
        throw new StoreError("validation_failed", {
          field: err.field,
          userMessage: err.message,
          cause: err,
        });
      }
      throw err;
    }

    const state = this.readStateOrEmpty();

    const timestamp = nowIso();
    const workoutId = newId();
    const workout: Workout = {
      id: workoutId,
      date: normalized.date,
      name: normalized.name,
      status: "planned",
      notes: null,
      rating: null,
      started_at: null,
      completed_at: null,
      created_at: timestamp,
      updated_at: timestamp,
    };

    const newExercises: WorkoutExercise[] = [];
    const newSets: ExerciseSet[] = [];

    normalized.exercises.forEach((ex, index) => {
      const workoutExerciseId = newId();
      newExercises.push({
        id: workoutExerciseId,
        workout_id: workoutId,
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        muscle: ex.muscle,
        equipment: ex.equipment,
        order_index: index,
        notes: null,
      });
      for (let setIndex = 0; setIndex < ex.default_sets; setIndex++) {
        newSets.push({
          id: newId(),
          workout_exercise_id: workoutExerciseId,
          set_number: setIndex + 1,
          weight: null,
          weight_unit: "lbs",
          reps: null,
          is_completed: false,
          completed_at: null,
        });
      }
    });

    const next: StorageShape = {
      version: STORAGE_VERSION,
      workouts: [...state.workouts, workout],
      exercises: [...state.exercises, ...newExercises],
      sets: [...state.sets, ...newSets],
    };
    this.writeState(next);

    return { id: workoutId };
  }

  async listWorkouts(): Promise<Array<Workout & { exercise_count: number }>> {
    // readState throws StoreError(corrupted_state) on the first corrupted read
    // and resets storage. Subsequent reads observe the fresh empty state.
    const state = this.readState();
    const counts = new Map<string, number>();
    for (const ex of state.exercises) {
      counts.set(ex.workout_id, (counts.get(ex.workout_id) ?? 0) + 1);
    }
    return [...state.workouts]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .map((w) => ({ ...w, exercise_count: counts.get(w.id) ?? 0 }));
  }

  async getWorkout(id: string): Promise<WorkoutWithChildren | null> {
    const state = this.readStateOrEmpty();
    const workout = state.workouts.find((w) => w.id === id);
    if (!workout) return null;

    const exercises = state.exercises
      .filter((e) => e.workout_id === id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((e) => ({
        ...e,
        sets: state.sets
          .filter((s) => s.workout_exercise_id === e.id)
          .sort((a, b) => a.set_number - b.set_number),
      }));

    return { ...workout, exercises };
  }

  async deleteWorkout(id: string): Promise<void> {
    const state = this.readStateOrEmpty();
    const remainingExercises = state.exercises.filter((e) => e.workout_id !== id);
    const removedExerciseIds = new Set(
      state.exercises.filter((e) => e.workout_id === id).map((e) => e.id)
    );
    const remainingSets = state.sets.filter(
      (s) => !removedExerciseIds.has(s.workout_exercise_id)
    );
    const next: StorageShape = {
      version: STORAGE_VERSION,
      workouts: state.workouts.filter((w) => w.id !== id),
      exercises: remainingExercises,
      sets: remainingSets,
    };
    this.writeState(next);
  }

  async setWorkoutStatus(id: string, status: WorkoutStatus): Promise<void> {
    const state = this.readStateOrEmpty();
    const index = state.workouts.findIndex((w) => w.id === id);
    if (index === -1) {
      throw new StoreError("not_found");
    }
    const timestamp = nowIso();
    const current = state.workouts[index];
    const updated: Workout = { ...current, status, updated_at: timestamp };
    if (status === "in_progress" && !updated.started_at) {
      updated.started_at = timestamp;
    }
    if (status === "completed" && !updated.completed_at) {
      updated.completed_at = timestamp;
    }
    const nextWorkouts = [...state.workouts];
    nextWorkouts[index] = updated;
    this.writeState({ ...state, workouts: nextWorkouts });
  }

  async upsertSets(workoutId: string, sets: SetInput[]): Promise<void> {
    const normalized = sets.map((s) => {
      try {
        return validateSetInput(s);
      } catch (err) {
        if (err instanceof ValidationError) {
          throw new StoreError("validation_failed", {
            field: err.field,
            userMessage: err.message,
            cause: err,
          });
        }
        throw err;
      }
    });

    const state = this.readStateOrEmpty();
    const validExerciseIds = new Set(
      state.exercises.filter((e) => e.workout_id === workoutId).map((e) => e.id)
    );

    const bySetId = new Map(state.sets.map((s) => [s.id, s]));
    const nextSets: ExerciseSet[] = [...state.sets];

    for (const input of normalized) {
      if (!validExerciseIds.has(input.workout_exercise_id)) {
        throw new StoreError("not_found", {
          field: "workout_exercise_id",
          userMessage: "The exercise row for this set does not exist.",
        });
      }
      const completed_at = input.is_completed ? nowIso() : null;
      if (input.id && bySetId.has(input.id)) {
        const idx = nextSets.findIndex((s) => s.id === input.id);
        const prev = nextSets[idx];
        nextSets[idx] = {
          ...prev,
          set_number: input.set_number,
          weight: input.weight,
          weight_unit: input.weight_unit,
          reps: input.reps,
          is_completed: input.is_completed,
          completed_at: input.is_completed ? prev.completed_at ?? completed_at : null,
        };
      } else {
        nextSets.push({
          id: input.id ?? newId(),
          workout_exercise_id: input.workout_exercise_id,
          set_number: input.set_number,
          weight: input.weight,
          weight_unit: input.weight_unit,
          reps: input.reps,
          is_completed: input.is_completed,
          completed_at,
        });
      }
    }

    // Stamp workout updated_at so listWorkouts reflects activity.
    const wIndex = state.workouts.findIndex((w) => w.id === workoutId);
    const nextWorkouts = [...state.workouts];
    if (wIndex !== -1) {
      nextWorkouts[wIndex] = { ...nextWorkouts[wIndex], updated_at: nowIso() };
    }

    this.writeState({ ...state, sets: nextSets, workouts: nextWorkouts });
  }

  async importToSupabase(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    targetStore: SupabaseStoreLike
  ): Promise<void> {
    throw new Error("implemented in Batch C");
  }
}

/**
 * Convenience factory. Callers can pass a custom StorageLike for testing.
 */
export function createLocalStore(options?: {
  storage?: StorageLike;
  disabled?: boolean;
}): LocalStore {
  return new LocalStore(options?.storage, options?.disabled);
}
