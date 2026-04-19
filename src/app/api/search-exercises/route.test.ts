import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiExercise } from "@/lib/exercise-api/types";

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

beforeEach(async () => {
  process.env.EXERCISEAPI_KEY = "test-key";
  process.env.NEXT_PUBLIC_EXERCISEAPI_URL = "https://api.example/v1";
  const mod = await import("@/lib/exercise-search");
  mod.invalidateCatalog();
  mod.invalidateMuscleGroups();
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("GET /api/search-exercises", () => {
  it("filters by query locally because upstream ?search= is silently broken", async () => {
    // Upstream returns unfiltered alphabetical head regardless of ?search=.
    // Simulate that: the handler ignores the query string entirely and
    // always returns the full catalog. If the route calls the upstream with
    // ?search=..., the mock returns everything, and Bench Press would NOT
    // be the first result without Fuse-backed local filtering.
    const catalog: ApiExercise[] = [
      exercise({
        id: "1",
        name: "1.5 Rep Squat",
        primaryMuscles: ["rectus femoris"],
        equipment: "barbell",
      }),
      exercise({
        id: "2",
        name: "18 Inch Deadlift",
        primaryMuscles: ["erector spinae"],
        equipment: "barbell",
      }),
      exercise({
        id: "3",
        name: "Barbell Bench Press",
        primaryMuscles: ["pectoralis major sternal head"],
        equipment: "barbell",
      }),
    ];
    mockFetch(() => ({
      body: { data: catalog, total: catalog.length, limit: 100, offset: 0 },
    }));

    const { GET } = await import("./route");
    const req = new Request(
      "http://localhost/api/search-exercises?q=bench%20press"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: ApiExercise[] };

    // The regression this guards: before the fix, the route returned the
    // alphabetical head (["1.5 Rep Squat", "18 Inch Deadlift", ...]) because
    // it trusted the broken upstream ?search= param.
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].name).toBe("Barbell Bench Press");
    // And must NOT contain the unrelated alphabetical head.
    const names = body.data.map((e) => e.name);
    expect(names).not.toContain("1.5 Rep Squat");
    expect(names).not.toContain("18 Inch Deadlift");
  });

  it("returns 500 when EXERCISEAPI_KEY is missing", async () => {
    delete process.env.EXERCISEAPI_KEY;
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/search-exercises?q=bench");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it("handles empty query without crashing", async () => {
    const catalog: ApiExercise[] = [exercise({ id: "1", name: "Squat" })];
    mockFetch(() => ({
      body: { data: catalog, total: 1, limit: 100, offset: 0 },
    }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/search-exercises?q=");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: ApiExercise[] };
    expect(Array.isArray(body.data)).toBe(true);
  });
});
