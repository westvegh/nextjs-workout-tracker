import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  StoreError,
  getStore,
  isStorageAvailable,
} from "./workout-store";
import { LocalStore } from "./workout-store-local";

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

describe("StoreError", () => {
  it("fills userMessage with the default for a known code", () => {
    const err = new StoreError("quota_exceeded");
    expect(err.code).toBe("quota_exceeded");
    expect(err.userMessage).toMatch(/storage/i);
    expect(err.name).toBe("StoreError");
  });

  it("lets the caller override userMessage and field", () => {
    const err = new StoreError("validation_failed", {
      userMessage: "Name too long",
      field: "name",
    });
    expect(err.userMessage).toBe("Name too long");
    expect(err.field).toBe("name");
  });
});

describe("isStorageAvailable", () => {
  const original = (globalThis as unknown as { localStorage?: Storage }).localStorage;

  afterEach(() => {
    if (original) {
      (globalThis as unknown as { localStorage: Storage }).localStorage = original;
    }
  });

  it("returns true for a working localStorage", () => {
    (globalThis as unknown as { localStorage: StorageLike }).localStorage =
      memoryStorage() as unknown as Storage;
    expect(isStorageAvailable()).toBe(true);
  });

  it("returns false when setItem throws (Safari private mode style)", () => {
    const blocked: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => undefined,
    };
    (globalThis as unknown as { localStorage: StorageLike }).localStorage =
      blocked as unknown as Storage;
    expect(isStorageAvailable()).toBe(false);
  });
});

describe("getStore factory", () => {
  // Preserve the real localStorage so Vitest's happy-dom stays intact.
  const original = (globalThis as unknown as { localStorage?: Storage }).localStorage;

  beforeEach(() => {
    // Reset to a fresh memory-backed Storage for each test so seedIfEmpty
    // runs deterministically.
    (globalThis as unknown as { localStorage: StorageLike }).localStorage =
      memoryStorage() as unknown as Storage;
  });

  afterEach(() => {
    if (original) {
      (globalThis as unknown as { localStorage: Storage }).localStorage = original;
    }
  });

  it("returns a LocalStore seeded with example workouts for anon", async () => {
    const store = await getStore(null);
    expect(store).toBeInstanceOf(LocalStore);
    const list = await store.listWorkouts();
    // Three example workouts defined in src/data/example-workouts.ts.
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list.every((w) => typeof w.name === "string" && (w.name ?? "").length > 0)).toBe(true);
  });

  it("returns a RemoteStore instance when a userId is provided", async () => {
    const store = await getStore("user-123");
    expect(store).not.toBeInstanceOf(LocalStore);
    // Duck-type check: exposes the WorkoutStore methods.
    expect(typeof store.createWorkout).toBe("function");
    expect(typeof store.listWorkouts).toBe("function");
    expect(typeof store.getWorkout).toBe("function");
    expect(typeof store.upsertSets).toBe("function");
  });

  it("is idempotent for anon: second call does not re-seed", async () => {
    const first = await getStore(null);
    const firstList = await first.listWorkouts();

    // User deletes one example.
    await first.deleteWorkout(firstList[0].id);

    const second = await getStore(null);
    const secondList = await second.listWorkouts();
    expect(secondList.length).toBe(firstList.length - 1);
  });
});
