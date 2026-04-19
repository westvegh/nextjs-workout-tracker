import type {
  ApiDetailResponse,
  ApiExercise,
  ApiListResponse,
  ApiStatsResponse,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_EXERCISEAPI_URL ?? "https://api.exerciseapi.dev/v1";
const TIMEOUT_MS = 10_000;
const PAGE_SIZE = 100;

function apiKey(): string {
  const key = process.env.EXERCISEAPI_KEY ?? "";
  if (!key) {
    throw new Error(
      "EXERCISEAPI_KEY is not set. Get a key at https://exerciseapi.dev/dashboard."
    );
  }
  return key;
}

function headers(): HeadersInit {
  return {
    "X-API-Key": apiKey(),
    Accept: "application/json",
  };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Cache policy: Next.js caches successful fetches per the `next.revalidate`
    // window. Non-2xx responses are thrown below before anything downstream
    // caches them. Previous `cache: "no-store"` made every server render re-hit
    // the upstream API; with revalidation, repeat visits serve from cache and
    // only cold instances pay the round-trip. Cache is manually invalidated
    // via `revalidateTag(...)` if the catalog changes.
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit
): Promise<Response> {
  try {
    return await fetchWithTimeout(url, options, TIMEOUT_MS);
  } catch {
    return fetchWithTimeout(url, options, TIMEOUT_MS);
  }
}

type QueryValue = string | number | string[] | undefined;

function buildQuery(params: Record<string, QueryValue>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item === undefined || item === null || item === "") continue;
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(item))}`);
      }
    } else if (v !== "") {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

export interface FetchExercisesParams {
  limit?: number;
  offset?: number;
  muscle?: string | string[];
  equipment?: string | string[];
  category?: string | string[];
  search?: string;
}

export async function fetchExercises(
  params: FetchExercisesParams = {}
): Promise<ApiListResponse<ApiExercise>> {
  // Upstream /v1/exercises accepts ?search= (fuzzy full-text) and supports
  // multi-value filters for muscle/equipment/category via repeated params
  // (?muscle=a&muscle=b) — OR within each axis, AND across axes. Fixed
  // 2026-04-19 in the exercise-api repo.
  const query = buildQuery({
    limit: params.limit ?? PAGE_SIZE,
    offset: params.offset ?? 0,
    muscle: params.muscle,
    equipment: params.equipment,
    category: params.category,
    search: params.search,
  });
  const response = await fetchWithRetry(`${BASE_URL}/exercises${query}`, {
    headers: headers(),
    next: { revalidate: 3600, tags: ["exerciseapi-exercises"] },
  });
  if (!response.ok) {
    throw new Error(`fetchExercises failed: ${response.status}`);
  }
  return response.json();
}

export async function fetchExercise(id: string): Promise<ApiExercise | null> {
  const response = await fetchWithRetry(
    `${BASE_URL}/exercises/${encodeURIComponent(id)}`,
    {
      headers: headers(),
      next: {
        revalidate: 3600,
        tags: ["exerciseapi-exercises", `exerciseapi-exercise-${id}`],
      },
    }
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`fetchExercise(${id}) failed: ${response.status}`);
  }
  const body: ApiDetailResponse<ApiExercise> = await response.json();
  return body.data;
}

async function fetchList<T = unknown>(path: string): Promise<T[]> {
  // Taxonomy endpoints (categories, muscles, equipment) almost never change —
  // 1-day cache is plenty, manually invalidate via `revalidateTag` if needed.
  const response = await fetchWithRetry(`${BASE_URL}/${path}`, {
    headers: headers(),
    next: { revalidate: 86400, tags: ["exerciseapi-taxonomy"] },
  });
  if (!response.ok) {
    throw new Error(`fetch ${path} failed: ${response.status}`);
  }
  const body = await response.json();
  return (body.data ?? body) as T[];
}

// API returns mixed shapes. Normalize to string[] for UI.
// /equipment: string[] (flat)
// /muscles: [{ displayGroup, muscles[] }] (extract displayGroup)
// /categories: [{ category, count, description }] (extract category)
function normalizeToStrings(raw: unknown[]): string[] {
  return raw
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        if (typeof obj.category === "string") return obj.category;
        if (typeof obj.displayGroup === "string") return obj.displayGroup;
        if (typeof obj.name === "string") return obj.name;
      }
      return null;
    })
    .filter((s): s is string => typeof s === "string" && s.length > 0);
}

export async function fetchCategories(): Promise<string[]> {
  return normalizeToStrings(await fetchList("categories"));
}

export async function fetchMuscles(): Promise<string[]> {
  return normalizeToStrings(await fetchList("muscles"));
}

export async function fetchEquipment(): Promise<string[]> {
  return normalizeToStrings(await fetchList("equipment"));
}

export async function fetchStats(): Promise<ApiStatsResponse> {
  const response = await fetchWithRetry(`${BASE_URL}/stats`, {
    headers: headers(),
    next: { revalidate: 300, tags: ["exerciseapi-stats"] },
  });
  if (!response.ok) {
    throw new Error(`fetchStats failed: ${response.status}`);
  }
  const body = await response.json();
  return body.data ?? body;
}
