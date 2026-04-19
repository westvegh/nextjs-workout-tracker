import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiExercise } from "@/lib/exercise-api/types";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

type FetchCall = { url: string };

function mockFetch(responder: (call: FetchCall) => { body: unknown; status?: number }) {
  const calls: FetchCall[] = [];
  const mock = vi.fn(async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
    calls.push({ url });
    const { body, status = 200 } = responder({ url });
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

describe("GET /api/search-exercises", () => {
  it("forwards ?q=<term> to upstream as ?search=<term> and returns its data", async () => {
    const { calls } = mockFetch(() => ({
      body: {
        data: [
          exercise({ id: "1", name: "Barbell Bench Press" }),
          exercise({ id: "2", name: "Dumbbell Bench Press" }),
        ],
        total: null,
        limit: 20,
        offset: 0,
      },
    }));

    const { GET } = await import("./route");
    const req = new Request(
      "http://localhost/api/search-exercises?q=bench%20press"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: ApiExercise[] };
    expect(calls[0].url).toContain("search=bench%20press");
    expect(body.data.map((e) => e.name)).toEqual([
      "Barbell Bench Press",
      "Dumbbell Bench Press",
    ]);
  });

  it("returns 500 when EXERCISEAPI_KEY is missing", async () => {
    delete process.env.EXERCISEAPI_KEY;
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/search-exercises?q=bench");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it("handles an empty query by omitting ?search= from the upstream call", async () => {
    const { calls } = mockFetch(() => ({
      body: {
        data: [exercise({ id: "1", name: "Squat" })],
        total: 2198,
        limit: 20,
        offset: 0,
      },
    }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/search-exercises?q=");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: ApiExercise[] };
    expect(Array.isArray(body.data)).toBe(true);
    expect(calls[0].url).not.toContain("search=");
  });
});
