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
    return await fetch(url, { ...options, signal: controller.signal });
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

function buildQuery(
  params: Record<string, string | number | undefined>
): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

export interface FetchExercisesParams {
  limit?: number;
  offset?: number;
  muscle?: string;
  equipment?: string;
  category?: string;
  search?: string;
}

export async function fetchExercises(
  params: FetchExercisesParams = {}
): Promise<ApiListResponse<ApiExercise>> {
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
  });
  if (!response.ok) {
    throw new Error(`fetchExercises failed: ${response.status}`);
  }
  return response.json();
}

export async function fetchAllExercises(): Promise<ApiExercise[]> {
  const all: ApiExercise[] = [];
  let offset = 0;
  while (true) {
    const page = await fetchExercises({ limit: PAGE_SIZE, offset });
    all.push(...page.data);
    if (page.data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

export async function fetchExercise(id: string): Promise<ApiExercise | null> {
  const response = await fetchWithRetry(
    `${BASE_URL}/exercises/${encodeURIComponent(id)}`,
    { headers: headers() }
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`fetchExercise(${id}) failed: ${response.status}`);
  }
  const body: ApiDetailResponse<ApiExercise> = await response.json();
  return body.data;
}

async function fetchSimpleList(path: string): Promise<string[]> {
  const response = await fetchWithRetry(`${BASE_URL}/${path}`, {
    headers: headers(),
  });
  if (!response.ok) {
    throw new Error(`fetch ${path} failed: ${response.status}`);
  }
  const body = await response.json();
  return body.data ?? body;
}

export function fetchCategories(): Promise<string[]> {
  return fetchSimpleList("categories");
}

export function fetchMuscles(): Promise<string[]> {
  return fetchSimpleList("muscles");
}

export function fetchEquipment(): Promise<string[]> {
  return fetchSimpleList("equipment");
}

export async function fetchStats(): Promise<ApiStatsResponse> {
  const response = await fetchWithRetry(`${BASE_URL}/stats`, {
    headers: headers(),
  });
  if (!response.ok) {
    throw new Error(`fetchStats failed: ${response.status}`);
  }
  const body = await response.json();
  return body.data ?? body;
}
