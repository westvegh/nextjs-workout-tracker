import { beforeEach, describe, expect, it, vi } from "vitest";

import { StoreError } from "@/lib/workout-store";
import { SupabaseStore } from "@/lib/workout-store-supabase";

/**
 * Minimal in-memory fake of the pieces of the Supabase client we use.
 * It implements the chainable query builder just enough to cover the
 * SupabaseStore code paths: insert, upsert, select, update, delete, eq,
 * order, single, maybeSingle, and the nested-count select form. This is
 * deliberately thin so the tests read as the real system behaviour, not
 * a plaintext mirror of the implementation.
 */
interface FakeRow {
  id: string;
  [key: string]: unknown;
}

type InsertOrder = "insert" | "reverse" | "shuffle";

interface FakeOptions {
  rowOrderOnInsert?: InsertOrder;
  failOn?: { table: string; op: string; message?: string };
}

function uuid(prefix: string, n: number): string {
  return `${prefix}-${n.toString().padStart(4, "0")}`;
}

function reorderInserts<T>(rows: T[], mode: InsertOrder): T[] {
  if (mode === "insert") return rows;
  if (mode === "reverse") return [...rows].reverse();
  // Deterministic "shuffle": move the last row to index 1.
  const copy = [...rows];
  if (copy.length < 3) return copy.reverse();
  const last = copy.pop() as T;
  copy.splice(1, 0, last);
  return copy;
}

class FakeQuery {
  private readonly db: FakeSupabase;
  private readonly table: string;
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private rows: FakeRow[] = [];
  private columns: string | null = null;
  private filters: Array<{ column: string; value: unknown }> = [];
  private updates: Record<string, unknown> | null = null;

  constructor(db: FakeSupabase, table: string) {
    this.db = db;
    this.table = table;
  }

  select(columns?: string): this {
    this.columns = columns ?? null;
    return this;
  }

  insert(rows: FakeRow | FakeRow[]): this {
    this.op = "insert";
    this.rows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  upsert(rows: FakeRow | FakeRow[], opts?: unknown): this {
    void opts;
    this.op = "upsert";
    this.rows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(values: Record<string, unknown>): this {
    this.op = "update";
    this.updates = values;
    return this;
  }

  delete(): this {
    this.op = "delete";
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, opts?: unknown): this {
    void column;
    void opts;
    return this;
  }

  async single(): Promise<{ data: FakeRow | null; error: unknown }> {
    return this.execute(true);
  }

  async maybeSingle(): Promise<{ data: FakeRow | null; error: unknown }> {
    return this.execute(true);
  }

  then<T>(
    onFulfilled: (value: { data: FakeRow[] | null; error: unknown }) => T
  ): Promise<T> {
    return this.execute(false).then(onFulfilled as never) as Promise<T>;
  }

  private async execute(
    asSingle: boolean
  ): Promise<{ data: FakeRow | FakeRow[] | null; error: unknown }> {
    const fail = this.db.options.failOn;
    if (fail && fail.table === this.table && fail.op === this.op) {
      return { data: null, error: { message: fail.message ?? "fake error" } };
    }

    const store = this.db.tables;
    if (!store[this.table]) store[this.table] = [];

    if (this.op === "insert" || this.op === "upsert") {
      const assigned = this.rows.map((row) => ({
        id: row.id ?? uuid(this.table, this.db.nextId()),
        ...row,
      }));
      store[this.table].push(...assigned);
      const returned = reorderInserts(assigned, this.db.options.rowOrderOnInsert ?? "insert");
      if (this.columns === null) {
        return { data: null, error: null };
      }
      return {
        data: asSingle ? returned[0] ?? null : returned,
        error: null,
      };
    }

    if (this.op === "update") {
      const updated: FakeRow[] = [];
      store[this.table] = store[this.table].map((row) => {
        if (this.matches(row)) {
          const next = { ...row, ...(this.updates ?? {}) };
          updated.push(next);
          return next;
        }
        return row;
      });
      return {
        data: asSingle ? updated[0] ?? null : updated,
        error: null,
      };
    }

    if (this.op === "delete") {
      store[this.table] = store[this.table].filter((row) => !this.matches(row));
      return { data: null, error: null };
    }

    // select path
    let result = store[this.table].filter((row) => this.matches(row));
    // Handle the nested-count selector used by listWorkouts: return a
    // `workout_exercises` array with a {count} entry per parent row.
    if (this.columns && this.columns.includes("workout_exercises(count)")) {
      result = result.map((row) => {
        const count = (store.workout_exercises ?? []).filter(
          (we) => we.workout_id === row.id
        ).length;
        return { ...row, workout_exercises: [{ count }] };
      });
    } else if (this.columns && this.columns.includes("workout_exercises(")) {
      // Full nested select used by getWorkout.
      result = result.map((row) => ({
        ...row,
        workout_exercises: (store.workout_exercises ?? [])
          .filter((we) => we.workout_id === row.id)
          .map((we) => ({
            ...we,
            exercise_sets: (store.exercise_sets ?? []).filter(
              (s) => s.workout_exercise_id === we.id
            ),
          })),
      }));
    }
    return {
      data: asSingle ? result[0] ?? null : result,
      error: null,
    };
  }

  private matches(row: FakeRow): boolean {
    return this.filters.every((f) => row[f.column] === f.value);
  }
}

class FakeSupabase {
  tables: Record<string, FakeRow[]> = {
    workouts: [],
    workout_exercises: [],
    exercise_sets: [],
  };
  options: FakeOptions;
  queryCount = 0;
  private idCounter = 0;

  constructor(options: FakeOptions = {}) {
    this.options = options;
  }

  nextId(): number {
    this.idCounter += 1;
    return this.idCounter;
  }

  from(table: string): FakeQuery {
    this.queryCount += 1;
    return new FakeQuery(this, table);
  }
}

// Typecast wrapper so our fake satisfies the constructor signature.
function makeStore(fake: FakeSupabase, userId = "user-1"): SupabaseStore {
  return new SupabaseStore(fake as unknown as Parameters<typeof SupabaseStore>[0], userId);
}

describe("SupabaseStore", () => {
  describe("createWorkout", () => {
    it("REGRESSION: seeds default_sets per input position, not Supabase row-return order", async () => {
      const fake = new FakeSupabase({ rowOrderOnInsert: "reverse" });
      const store = makeStore(fake);

      await store.createWorkout({
        name: "Upper body",
        date: "2026-04-18",
        exercises: [
          { exercise_id: "a", exercise_name: "Bench", muscle: null, equipment: null, default_sets: 5 },
          { exercise_id: "b", exercise_name: "Row", muscle: null, equipment: null, default_sets: 5 },
          { exercise_id: "c", exercise_name: "OHP", muscle: null, equipment: null, default_sets: 5 },
        ],
      });

      // Each inserted exercise should have exactly 5 placeholder sets, even
      // though the fake client returned the inserted rows in reverse order.
      for (const we of fake.tables.workout_exercises) {
        const sets = fake.tables.exercise_sets.filter(
          (s) => s.workout_exercise_id === we.id
        );
        expect(sets).toHaveLength(5);
      }
    });

    it("REGRESSION: works when Supabase returns inserted rows in arbitrary order", async () => {
      const fake = new FakeSupabase({ rowOrderOnInsert: "shuffle" });
      const store = makeStore(fake);

      await store.createWorkout({
        name: "Arbitrary",
        date: "2026-04-18",
        exercises: [
          { exercise_id: "a", exercise_name: "A", muscle: null, equipment: null, default_sets: 2 },
          { exercise_id: "b", exercise_name: "B", muscle: null, equipment: null, default_sets: 4 },
          { exercise_id: "c", exercise_name: "C", muscle: null, equipment: null, default_sets: 1 },
          { exercise_id: "d", exercise_name: "D", muscle: null, equipment: null, default_sets: 3 },
        ],
      });

      // Total sets should equal the sum of default_sets regardless of order.
      expect(fake.tables.exercise_sets).toHaveLength(2 + 4 + 1 + 3);

      // Each exercise should get exactly the correct count keyed by exercise_id.
      for (const [exId, expected] of [
        ["a", 2],
        ["b", 4],
        ["c", 1],
        ["d", 3],
      ] as const) {
        const we = fake.tables.workout_exercises.find((w) => w.exercise_id === exId);
        expect(we).toBeDefined();
        const sets = fake.tables.exercise_sets.filter(
          (s) => s.workout_exercise_id === (we as FakeRow).id
        );
        expect(sets).toHaveLength(expected);
      }
    });

    it("validates input and throws a validation StoreError for bad shapes", async () => {
      const fake = new FakeSupabase();
      const store = makeStore(fake);

      await expect(
        store.createWorkout({
          name: "",
          date: "not-a-date",
          exercises: [],
        })
      ).rejects.toMatchObject({
        name: "StoreError",
        code: "validation_failed",
        field: "date",
      });

      expect(fake.tables.workouts).toHaveLength(0);
    });

    it("creates an empty workout when the exercises array is empty", async () => {
      const fake = new FakeSupabase();
      const store = makeStore(fake);

      const { id } = await store.createWorkout({
        name: "Rest day",
        date: "2026-04-18",
        exercises: [],
      });

      expect(id).toBeDefined();
      expect(fake.tables.workouts).toHaveLength(1);
      expect(fake.tables.workout_exercises).toHaveLength(0);
      expect(fake.tables.exercise_sets).toHaveLength(0);
    });

    it("maps Supabase errors to StoreError with code server_error", async () => {
      const fake = new FakeSupabase({
        failOn: { table: "workouts", op: "insert", message: "duplicate key violates constraint" },
      });
      const store = makeStore(fake);

      await expect(
        store.createWorkout({
          name: "X",
          date: "2026-04-18",
          exercises: [],
        })
      ).rejects.toMatchObject({
        name: "StoreError",
        code: "server_error",
      });
    });
  });

  describe("listWorkouts", () => {
    it("returns workouts with inline exercise_count in a single query (N+1 fix)", async () => {
      const fake = new FakeSupabase();
      const store = makeStore(fake);

      await store.createWorkout({
        name: "A",
        date: "2026-04-17",
        exercises: [
          { exercise_id: "e1", exercise_name: "E1", muscle: null, equipment: null, default_sets: 3 },
          { exercise_id: "e2", exercise_name: "E2", muscle: null, equipment: null, default_sets: 3 },
        ],
      });
      await store.createWorkout({
        name: "B",
        date: "2026-04-18",
        exercises: [
          { exercise_id: "e3", exercise_name: "E3", muscle: null, equipment: null, default_sets: 3 },
        ],
      });

      const queriesBefore = fake.queryCount;
      const workouts = await store.listWorkouts();
      const queriesAfter = fake.queryCount;

      expect(workouts).toHaveLength(2);
      expect(workouts.every((w) => typeof w.exercise_count === "number")).toBe(true);
      expect(new Set(workouts.map((w) => w.exercise_count))).toEqual(new Set([1, 2]));

      // Exactly one query for listWorkouts itself — no per-workout count.
      expect(queriesAfter - queriesBefore).toBe(1);
    });
  });

  describe("upsertSets", () => {
    it("no-ops when the sets array is empty", async () => {
      const fake = new FakeSupabase();
      const store = makeStore(fake);

      const queriesBefore = fake.queryCount;
      await store.upsertSets("workout-1", []);
      expect(fake.queryCount).toBe(queriesBefore);
    });

    it("handles a mix of sets with and without ids", async () => {
      const fake = new FakeSupabase();
      const store = makeStore(fake);

      await store.upsertSets("workout-1", [
        {
          id: "existing-set-1",
          workout_exercise_id: "we-1",
          set_number: 1,
          weight: 100,
          weight_unit: "lbs",
          reps: 5,
          is_completed: true,
        },
        {
          workout_exercise_id: "we-1",
          set_number: 2,
          weight: null,
          weight_unit: "lbs",
          reps: null,
          is_completed: false,
        },
      ]);

      expect(fake.tables.exercise_sets).toHaveLength(2);
      const withId = fake.tables.exercise_sets.find((r) => r.id === "existing-set-1");
      expect(withId).toBeDefined();
      expect(withId).toMatchObject({
        weight: 100,
        reps: 5,
        is_completed: true,
      });
      expect(withId?.completed_at).not.toBeNull();
    });

    it("wraps a Supabase error as StoreError", async () => {
      const fake = new FakeSupabase({
        failOn: { table: "exercise_sets", op: "upsert", message: "unique violation" },
      });
      const store = makeStore(fake);

      await expect(
        store.upsertSets("workout-1", [
          {
            workout_exercise_id: "we-1",
            set_number: 1,
            weight: null,
            weight_unit: "lbs",
            reps: null,
            is_completed: false,
          },
        ])
      ).rejects.toBeInstanceOf(StoreError);
    });

    it("validates set input and throws a validation StoreError for bad shapes", async () => {
      const fake = new FakeSupabase();
      const store = makeStore(fake);

      await expect(
        store.upsertSets("workout-1", [
          {
            workout_exercise_id: "",
            set_number: 0,
            weight: null,
            weight_unit: "lbs",
            reps: null,
            is_completed: false,
          },
        ])
      ).rejects.toMatchObject({
        name: "StoreError",
        code: "validation_failed",
      });
    });
  });

  describe("getWorkout / deleteWorkout / setWorkoutStatus", () => {
    it("getWorkout returns null when the row does not exist", async () => {
      const fake = new FakeSupabase();
      const store = makeStore(fake);

      expect(await store.getWorkout("missing-id")).toBeNull();
    });

    it("getWorkout returns the workout with nested exercises and sets", async () => {
      const fake = new FakeSupabase();
      const store = makeStore(fake);

      const { id } = await store.createWorkout({
        name: "Push",
        date: "2026-04-18",
        exercises: [
          {
            exercise_id: "bench",
            exercise_name: "Bench",
            muscle: "chest",
            equipment: "barbell",
            default_sets: 3,
          },
        ],
      });

      const result = await store.getWorkout(id);
      expect(result).not.toBeNull();
      expect(result?.exercises).toHaveLength(1);
      expect(result?.exercises[0].sets).toHaveLength(3);
    });

    it("deleteWorkout wraps errors as StoreError", async () => {
      const fake = new FakeSupabase({
        failOn: { table: "workouts", op: "delete", message: "cannot delete" },
      });
      const store = makeStore(fake);

      await expect(store.deleteWorkout("any")).rejects.toBeInstanceOf(StoreError);
    });

    it("setWorkoutStatus writes started_at / completed_at timestamps", async () => {
      const fake = new FakeSupabase();
      const store = makeStore(fake);

      const { id } = await store.createWorkout({
        name: "X",
        date: "2026-04-18",
        exercises: [],
      });

      const now = new Date("2026-04-18T10:00:00.000Z");
      vi.useFakeTimers();
      vi.setSystemTime(now);

      try {
        await store.setWorkoutStatus(id, "in_progress");
        const row = fake.tables.workouts.find((w) => w.id === id);
        expect(row?.status).toBe("in_progress");
        expect(row?.started_at).toBe(now.toISOString());

        await store.setWorkoutStatus(id, "completed");
        const completed = fake.tables.workouts.find((w) => w.id === id);
        expect(completed?.status).toBe("completed");
        expect(completed?.completed_at).toBe(now.toISOString());
      } finally {
        vi.useRealTimers();
      }
    });
  });
});

beforeEach(() => {
  vi.restoreAllMocks();
});
