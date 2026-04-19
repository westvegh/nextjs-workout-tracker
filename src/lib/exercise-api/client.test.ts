import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Default env so the client doesn't throw on "missing key" in most tests.
const ORIGINAL_ENV = { ...process.env };

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function importClient() {
  // Re-import after env mutations so the module reads the current env.
  vi.resetModules();
  return import("./client");
}

function setFetch(mock: FetchMock) {
  globalThis.fetch = mock as unknown as typeof fetch;
}

function lastUrl(mock: FetchMock, callIndex = 0): string {
  const call = mock.mock.calls[callIndex];
  if (!call) throw new Error(`no fetch call at index ${callIndex}`);
  const [url] = call;
  return typeof url === "string" ? url : (url as URL).toString();
}

describe("exercise-api/client", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, EXERCISEAPI_KEY: "test-key" };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  describe("fetchExercises", () => {
    it("REGRESSION: uses search= param (API rejects q= with 500)", async () => {
      // Yesterday's fix incorrectly mapped search→q. The exerciseapi.dev API
      // actually accepts search= and returns 500 INTERNAL_ERROR on q=. Keep
      // this test so the regression doesn't recur.
      const fetchMock = vi.fn(async () =>
        jsonResponse({ data: [], total: 0, limit: 100, offset: 0 })
      );
      setFetch(fetchMock);

      const { fetchExercises } = await importClient();
      await fetchExercises({ search: "bench" });

      const url = lastUrl(fetchMock);
      expect(url).toContain("search=bench");
      expect(url).not.toContain("q=bench");
    });

    it("URL-encodes search values", async () => {
      const fetchMock = vi.fn(async () =>
        jsonResponse({ data: [], total: 0, limit: 100, offset: 0 })
      );
      setFetch(fetchMock);

      const { fetchExercises } = await importClient();
      await fetchExercises({ search: "bench press" });

      expect(lastUrl(fetchMock)).toContain("search=bench%20press");
    });

    it("passes muscle= through untouched", async () => {
      const fetchMock = vi.fn(async () =>
        jsonResponse({ data: [], total: 0, limit: 100, offset: 0 })
      );
      setFetch(fetchMock);

      const { fetchExercises } = await importClient();
      await fetchExercises({ muscle: "biceps" });

      expect(lastUrl(fetchMock)).toContain("muscle=biceps");
    });

    it("passes limit and offset through", async () => {
      const fetchMock = vi.fn(async () =>
        jsonResponse({ data: [], total: 0, limit: 10, offset: 20 })
      );
      setFetch(fetchMock);

      const { fetchExercises } = await importClient();
      await fetchExercises({ limit: 10, offset: 20 });

      const url = lastUrl(fetchMock);
      expect(url).toContain("limit=10");
      expect(url).toContain("offset=20");
    });

    it("sends X-API-Key header from EXERCISEAPI_KEY", async () => {
      const fetchMock = vi.fn(async () =>
        jsonResponse({ data: [], total: 0, limit: 100, offset: 0 })
      );
      setFetch(fetchMock);

      const { fetchExercises } = await importClient();
      await fetchExercises();

      const call = fetchMock.mock.calls[0] as unknown as [unknown, RequestInit];
      const init = call[1];
      const headers = init.headers as Record<string, string>;
      expect(headers["X-API-Key"]).toBe("test-key");
    });

    it("throws with an actionable message when EXERCISEAPI_KEY is missing", async () => {
      delete process.env.EXERCISEAPI_KEY;
      const fetchMock = vi.fn();
      setFetch(fetchMock);

      const { fetchExercises } = await importClient();
      await expect(fetchExercises()).rejects.toThrow(/EXERCISEAPI_KEY/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("throws when the API returns 500", async () => {
      const fetchMock = vi.fn(async () => new Response("boom", { status: 500 }));
      setFetch(fetchMock);

      const { fetchExercises } = await importClient();
      await expect(fetchExercises()).rejects.toThrow(/500/);
    });

    it("retries once when the first fetch throws, then succeeds", async () => {
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new Error("flaky network"))
        .mockResolvedValueOnce(
          jsonResponse({ data: [{ id: "abc" }], total: 1, limit: 100, offset: 0 })
        );
      setFetch(fetchMock);

      const { fetchExercises } = await importClient();
      const result = await fetchExercises();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.data).toHaveLength(1);
    });
  });

  describe("fetchExercise", () => {
    it("hits /exercises/:id", async () => {
      const fetchMock = vi.fn(async () =>
        jsonResponse({ data: { id: "abc-123" } })
      );
      setFetch(fetchMock);

      const { fetchExercise } = await importClient();
      await fetchExercise("abc-123");

      expect(lastUrl(fetchMock)).toContain("/exercises/abc-123");
    });

    it("returns null on 404", async () => {
      const fetchMock = vi.fn(async () => new Response("", { status: 404 }));
      setFetch(fetchMock);

      const { fetchExercise } = await importClient();
      expect(await fetchExercise("missing")).toBeNull();
    });

    it("throws on 500", async () => {
      const fetchMock = vi.fn(async () => new Response("boom", { status: 500 }));
      setFetch(fetchMock);

      const { fetchExercise } = await importClient();
      await expect(fetchExercise("abc")).rejects.toThrow(/500/);
    });

    it("unwraps the data envelope", async () => {
      const fetchMock = vi.fn(async () =>
        jsonResponse({ data: { id: "abc", name: "Bench Press" } })
      );
      setFetch(fetchMock);

      const { fetchExercise } = await importClient();
      const result = await fetchExercise("abc");
      expect(result).toEqual({ id: "abc", name: "Bench Press" });
    });
  });
});
