import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiExercise } from "./exercise-api/types";

// Each test gets a clean module state by invalidating the in-process caches.
// Avoids using vi.resetModules() per case — the explicit invalidate* exports
// read cleaner and exercise the same code path production would use after
// a hot-reload or a manual refresh.

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

type FetchHandler = (url: string) => { body: unknown; status?: number };

function mockFetch(handler: FetchHandler) {
  const mock = vi.fn(async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
    const { body, status = 200 } = handler(url);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

function exercise(overrides: Partial<ApiExercise> = {}): ApiExercise {
  return {
    id: "ex-1",
    name: "Example",
    keywords: [],
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: null,
    force: null,
    level: "beginner",
    mechanic: null,
    category: "strength",
    instructions: [],
    exerciseTips: [],
    commonMistakes: [],
    safetyInfo: "",
    overview: "",
    variations: [],
    images: [],
    videos: [],
    ...overrides,
  };
}

const MUSCLE_GROUPS = [
  { displayGroup: "adductors", muscles: ["gracilis", "adductor longus", "adductor magnus"] },
  { displayGroup: "chest", muscles: ["pectoralis major clavicular head", "pectoralis major sternal head", "pectoralis minor"] },
  { displayGroup: "back", muscles: ["latissimus dorsi", "trapezius upper", "rhomboids"] },
];

beforeEach(async () => {
  process.env.EXERCISEAPI_KEY = "test-key";
  process.env.NEXT_PUBLIC_EXERCISEAPI_URL = "https://api.example/v1";
  const mod = await import("./exercise-search");
  mod.invalidateCatalog();
  mod.invalidateMuscleGroups();
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("searchAndPaginate — muscle filter", () => {
  it("resolves displayGroup 'adductors' to specific muscle names and matches exercises on primaryMuscles", async () => {
    const catalog: ApiExercise[] = [
      exercise({ id: "1", name: "Sumo Squat", primaryMuscles: ["gracilis", "gluteus maximus"] }),
      exercise({ id: "2", name: "Cable Hip Adduction", primaryMuscles: ["adductor longus"] }),
      exercise({ id: "3", name: "Bench Press", primaryMuscles: ["pectoralis major sternal head"] }),
    ];
    mockFetch((url) => {
      if (url.includes("/muscles")) return { body: { data: MUSCLE_GROUPS } };
      return { body: { data: catalog, total: catalog.length, limit: 100, offset: 0 } };
    });

    const { searchAndPaginate } = await import("./exercise-search");
    const result = await searchAndPaginate({ muscles: ["adductors"] }, 50, 0);

    expect(result.total).toBe(2);
    expect(result.data.map((e) => e.id).sort()).toEqual(["1", "2"]);
  });

  it("matches on secondaryMuscles too, not just primary", async () => {
    const catalog: ApiExercise[] = [
      exercise({ id: "1", name: "Bench Press", primaryMuscles: ["pectoralis major sternal head"], secondaryMuscles: ["triceps brachii long head"] }),
      exercise({ id: "2", name: "Squat", primaryMuscles: ["rectus femoris"], secondaryMuscles: ["adductor longus"] }),
    ];
    mockFetch((url) => {
      if (url.includes("/muscles")) return { body: { data: MUSCLE_GROUPS } };
      return { body: { data: catalog, total: catalog.length, limit: 100, offset: 0 } };
    });

    const { searchAndPaginate } = await import("./exercise-search");
    const result = await searchAndPaginate({ muscles: ["adductors"] }, 50, 0);

    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe("2");
  });

  it("falls back to substring matching for an unknown displayGroup", async () => {
    // If the /muscles API doesn't include the filter's group, the defensive
    // fallback lets substring-matching still produce some results.
    const catalog: ApiExercise[] = [
      exercise({ id: "1", name: "Plantarflexion", primaryMuscles: ["tibialis posterior"] }),
      exercise({ id: "2", name: "Squat", primaryMuscles: ["rectus femoris"] }),
    ];
    mockFetch((url) => {
      if (url.includes("/muscles")) return { body: { data: MUSCLE_GROUPS } };
      return { body: { data: catalog, total: catalog.length, limit: 100, offset: 0 } };
    });

    const { searchAndPaginate } = await import("./exercise-search");
    // "tibialis" is not a displayGroup in the mocked data; substring hits.
    const result = await searchAndPaginate({ muscles: ["tibialis"] }, 50, 0);

    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe("1");
  });

  it("ANDs muscle with equipment", async () => {
    const catalog: ApiExercise[] = [
      exercise({ id: "1", name: "Cable Hip Adduction", primaryMuscles: ["adductor longus"], equipment: "cable" }),
      exercise({ id: "2", name: "Barbell Sumo Squat", primaryMuscles: ["gracilis"], equipment: "barbell" }),
      exercise({ id: "3", name: "Barbell Bench Press", primaryMuscles: ["pectoralis major sternal head"], equipment: "barbell" }),
    ];
    mockFetch((url) => {
      if (url.includes("/muscles")) return { body: { data: MUSCLE_GROUPS } };
      return { body: { data: catalog, total: catalog.length, limit: 100, offset: 0 } };
    });

    const { searchAndPaginate } = await import("./exercise-search");
    const result = await searchAndPaginate(
      { muscles: ["adductors"], equipment: ["barbell"] },
      50,
      0
    );

    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe("2");
  });

  it("is case-insensitive on both sides", async () => {
    const catalog: ApiExercise[] = [
      exercise({ id: "1", name: "Sumo Squat", primaryMuscles: ["Gracilis", "GLUTEUS MAXIMUS"] }),
    ];
    mockFetch((url) => {
      if (url.includes("/muscles")) return { body: { data: MUSCLE_GROUPS } };
      return { body: { data: catalog, total: catalog.length, limit: 100, offset: 0 } };
    });

    const { searchAndPaginate } = await import("./exercise-search");
    const [lower, upper, mixed] = await Promise.all([
      searchAndPaginate({ muscles: ["adductors"] }, 50, 0),
      searchAndPaginate({ muscles: ["ADDUCTORS"] }, 50, 0),
      searchAndPaginate({ muscles: ["Adductors"] }, 50, 0),
    ]);

    expect(lower.total).toBe(1);
    expect(upper.total).toBe(1);
    expect(mixed.total).toBe(1);
  });

  it("OR-within / AND-across: union of muscle groups intersected with equipment", async () => {
    // 1: chest exercise, body only
    // 2: chest exercise, barbell
    // 3: back exercise, barbell
    // 4: leg exercise, barbell (no chest, no back)
    const catalog: ApiExercise[] = [
      exercise({ id: "1", name: "Push-Up", primaryMuscles: ["pectoralis minor"], equipment: "body only" }),
      exercise({ id: "2", name: "Bench Press", primaryMuscles: ["pectoralis major sternal head"], equipment: "barbell" }),
      exercise({ id: "3", name: "Bent Over Row", primaryMuscles: ["latissimus dorsi"], equipment: "barbell" }),
      exercise({ id: "4", name: "Squat", primaryMuscles: ["rectus femoris"], equipment: "barbell" }),
    ];
    mockFetch((url) => {
      if (url.includes("/muscles")) return { body: { data: MUSCLE_GROUPS } };
      return { body: { data: catalog, total: catalog.length, limit: 100, offset: 0 } };
    });

    const { searchAndPaginate } = await import("./exercise-search");

    // chest OR back — should be 3 (push-up, bench, row)
    const orMuscles = await searchAndPaginate(
      { muscles: ["chest", "back"] },
      50,
      0
    );
    expect(orMuscles.total).toBe(3);
    expect(orMuscles.data.map((e) => e.id).sort()).toEqual(["1", "2", "3"]);

    // (chest OR back) AND barbell — should be 2 (bench, row)
    const orMusclesAndBarbell = await searchAndPaginate(
      { muscles: ["chest", "back"], equipment: ["barbell"] },
      50,
      0
    );
    expect(orMusclesAndBarbell.total).toBe(2);
    expect(orMusclesAndBarbell.data.map((e) => e.id).sort()).toEqual(["2", "3"]);

    // barbell OR body only (equipment OR-within) — should be 4 (all)
    const orEquipment = await searchAndPaginate(
      { equipment: ["barbell", "body only"] },
      50,
      0
    );
    expect(orEquipment.total).toBe(4);
  });

  it("does not double-fetch /muscles under concurrent first-call pressure", async () => {
    const catalog: ApiExercise[] = [
      exercise({ id: "1", name: "Sumo Squat", primaryMuscles: ["gracilis"] }),
    ];
    const mock = mockFetch((url) => {
      if (url.includes("/muscles")) return { body: { data: MUSCLE_GROUPS } };
      return { body: { data: catalog, total: catalog.length, limit: 100, offset: 0 } };
    });

    const { searchAndPaginate } = await import("./exercise-search");
    await Promise.all([
      searchAndPaginate({ muscles: ["adductors"] }, 50, 0),
      searchAndPaginate({ muscles: ["chest"] }, 50, 0),
      searchAndPaginate({ muscles: ["back"] }, 50, 0),
    ]);

    const musclesFetches = mock.mock.calls.filter((call) => {
      const url = call[0];
      return typeof url === "string" && url.includes("/muscles");
    });
    expect(musclesFetches.length).toBe(1);
  });
});
