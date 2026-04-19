import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiExercise } from "./exercise-api/types";

// searchAndPaginate is now a thin passthrough to fetchExercises. These tests
// verify URL construction (repeated params for multi-value filters), search
// trimming, hasVideo post-filter, and pagination parameter plumbing.

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

type FetchCall = { url: string; init?: RequestInit };

function mockFetch(responder: (call: FetchCall) => { body: unknown; status?: number }) {
  const calls: FetchCall[] = [];
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
    calls.push({ url, init });
    const { body, status = 200 } = responder({ url, init });
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
  globalThis.fetch = mock as unknown as typeof fetch;
  return { mock, calls };
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

beforeEach(() => {
  process.env.EXERCISEAPI_KEY = "test-key";
  process.env.NEXT_PUBLIC_EXERCISEAPI_URL = "https://api.example/v1";
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("searchAndPaginate — passthrough", () => {
  it("forwards search, limit, offset to the upstream URL", async () => {
    const { calls } = mockFetch(() => ({
      body: { data: [exercise({ id: "1", name: "Bench" })], total: null, limit: 20, offset: 0 },
    }));

    const { searchAndPaginate } = await import("./exercise-search");
    const result = await searchAndPaginate({ search: "bench press" }, 20, 40);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/exercises?");
    expect(calls[0].url).toContain("search=bench%20press");
    expect(calls[0].url).toContain("limit=20");
    expect(calls[0].url).toContain("offset=40");
    expect(result.data.map((e) => e.name)).toEqual(["Bench"]);
  });

  it("emits repeated params for multi-value muscles (OR-within)", async () => {
    const { calls } = mockFetch(() => ({
      body: { data: [], total: 0, limit: 24, offset: 0 },
    }));

    const { searchAndPaginate } = await import("./exercise-search");
    await searchAndPaginate({ muscles: ["biceps", "triceps"] }, 24, 0);

    expect(calls[0].url).toContain("muscle=biceps");
    expect(calls[0].url).toContain("muscle=triceps");
  });

  it("emits repeated params for multi-value equipment", async () => {
    const { calls } = mockFetch(() => ({
      body: { data: [], total: 0, limit: 24, offset: 0 },
    }));

    const { searchAndPaginate } = await import("./exercise-search");
    await searchAndPaginate(
      { equipment: ["barbell", "dumbbell"] },
      24,
      0
    );

    expect(calls[0].url).toContain("equipment=barbell");
    expect(calls[0].url).toContain("equipment=dumbbell");
  });

  it("emits repeated params for multi-value categories", async () => {
    const { calls } = mockFetch(() => ({
      body: { data: [], total: 0, limit: 24, offset: 0 },
    }));

    const { searchAndPaginate } = await import("./exercise-search");
    await searchAndPaginate(
      { categories: ["strength", "powerlifting"] },
      24,
      0
    );

    expect(calls[0].url).toContain("category=strength");
    expect(calls[0].url).toContain("category=powerlifting");
  });

  it("omits empty filter arrays from the URL", async () => {
    const { calls } = mockFetch(() => ({
      body: { data: [], total: 0, limit: 24, offset: 0 },
    }));

    const { searchAndPaginate } = await import("./exercise-search");
    await searchAndPaginate(
      { muscles: [], equipment: [], categories: [] },
      24,
      0
    );

    expect(calls[0].url).not.toContain("muscle=");
    expect(calls[0].url).not.toContain("equipment=");
    expect(calls[0].url).not.toContain("category=");
  });

  it("omits an empty search string", async () => {
    const { calls } = mockFetch(() => ({
      body: { data: [], total: 0, limit: 24, offset: 0 },
    }));

    const { searchAndPaginate } = await import("./exercise-search");
    await searchAndPaginate({ search: "   " }, 24, 0);

    expect(calls[0].url).not.toContain("search=");
  });

  it("post-filters to exercises with videos when hasVideo is true, and nulls total", async () => {
    mockFetch(() => ({
      body: {
        data: [
          exercise({ id: "1", name: "With video", videos: [{
            url: "https://cdn/x.mp4",
            format: "mp4",
            aspectRatio: "9:16",
            resolution: "496x864",
            durationSeconds: 5,
            generatedWith: "m",
            generatedAt: "2026",
          }] }),
          exercise({ id: "2", name: "No video", videos: [] }),
          exercise({ id: "3", name: "Also no video" }),
        ],
        total: 3,
        limit: 100,
        offset: 0,
      },
    }));

    const { searchAndPaginate } = await import("./exercise-search");
    const result = await searchAndPaginate({ hasVideo: true }, 100, 0);

    expect(result.data.map((e) => e.id)).toEqual(["1"]);
    expect(result.total).toBeNull();
  });

  it("preserves upstream total when hasVideo is not active", async () => {
    mockFetch(() => ({
      body: {
        data: [exercise({ id: "1", name: "X" })],
        total: 2198,
        limit: 24,
        offset: 0,
      },
    }));

    const { searchAndPaginate } = await import("./exercise-search");
    const result = await searchAndPaginate({}, 24, 0);

    expect(result.total).toBe(2198);
  });

  it("ANDs search with muscles (both params on the URL)", async () => {
    const { calls } = mockFetch(() => ({
      body: { data: [], total: 0, limit: 24, offset: 0 },
    }));

    const { searchAndPaginate } = await import("./exercise-search");
    await searchAndPaginate(
      { search: "curl", muscles: ["biceps"] },
      24,
      0
    );

    expect(calls[0].url).toContain("search=curl");
    expect(calls[0].url).toContain("muscle=biceps");
  });
});

describe("fetchExercisesThrough", () => {
  it("sends only limit and offset", async () => {
    const { calls } = mockFetch(() => ({
      body: { data: [], total: 2198, limit: 24, offset: 0 },
    }));

    const { fetchExercisesThrough } = await import("./exercise-search");
    const result = await fetchExercisesThrough(24, 100);

    expect(calls[0].url).toContain("limit=24");
    expect(calls[0].url).toContain("offset=100");
    expect(calls[0].url).not.toContain("search=");
    expect(calls[0].url).not.toContain("muscle=");
    expect(result.total).toBe(2198);
  });
});
