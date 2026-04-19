import Fuse, { type IFuseOptions } from "fuse.js";
import { fetchAllExercises, fetchExercises } from "./exercise-api/client";
import type { ApiExercise } from "./exercise-api/types";

// exerciseapi.dev's /exercises?search= param is silently broken (returns
// unfiltered alphabetical results). Mirror the workout-app's fallback: fetch
// the full catalog once, build a Fuse.js fuzzy index in-process, search
// locally. See task #11 for the upstream API fix.

const FUSE_CONFIG: IFuseOptions<ApiExercise> = {
  keys: [
    { name: "name", weight: 1.0 },
    { name: "keywords", weight: 0.8 },
    { name: "primaryMuscles", weight: 0.7 },
    { name: "secondaryMuscles", weight: 0.4 },
    { name: "equipment", weight: 0.5 },
    { name: "category", weight: 0.3 },
  ],
  threshold: 0.4,
  distance: 100,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 2,
};

let catalogCache: ApiExercise[] | null = null;
let catalogPromise: Promise<ApiExercise[]> | null = null;
let fuseInstance: Fuse<ApiExercise> | null = null;
let fuseBuiltFor: ApiExercise[] | null = null;

async function getCatalog(): Promise<ApiExercise[]> {
  if (catalogCache) return catalogCache;
  if (catalogPromise) return catalogPromise;
  catalogPromise = fetchAllExercises()
    .then((all) => {
      catalogCache = all;
      catalogPromise = null;
      return all;
    })
    .catch((err) => {
      catalogPromise = null;
      throw err;
    });
  return catalogPromise;
}

function getOrBuildIndex(catalog: ApiExercise[]): Fuse<ApiExercise> {
  if (!fuseInstance || fuseBuiltFor !== catalog) {
    fuseInstance = new Fuse(catalog, FUSE_CONFIG);
    fuseBuiltFor = catalog;
  }
  return fuseInstance;
}

export interface SearchFilters {
  search?: string;
  muscle?: string;
  equipment?: string;
  category?: string;
  hasVideo?: boolean;
}

function applyStructuredFilters(
  items: ApiExercise[],
  filters: SearchFilters
): ApiExercise[] {
  return items.filter((ex) => {
    if (filters.hasVideo && !(ex.videos && ex.videos.length > 0)) return false;
    if (filters.muscle) {
      const all = [
        ...(ex.primaryMuscles ?? []),
        ...(ex.secondaryMuscles ?? []),
      ].map((m) => m.toLowerCase());
      if (!all.some((m) => m.includes(filters.muscle!.toLowerCase()))) {
        return false;
      }
    }
    if (
      filters.equipment &&
      (ex.equipment ?? "").toLowerCase() !== filters.equipment.toLowerCase()
    ) {
      return false;
    }
    if (
      filters.category &&
      (ex.category ?? "").toLowerCase() !== filters.category.toLowerCase()
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Search + filter the full catalog. Returns total match count + the
 * requested slice. Used by both the /exercises page and /api/list-exercises.
 */
export async function searchAndPaginate(
  filters: SearchFilters,
  limit: number,
  offset: number
): Promise<{ data: ApiExercise[]; total: number }> {
  const catalog = await getCatalog();

  let base: ApiExercise[];
  const q = filters.search?.trim();
  if (q && q.length >= 2) {
    const fuse = getOrBuildIndex(catalog);
    base = fuse.search(q).map((r) => r.item);
  } else {
    base = catalog;
  }

  const filtered = applyStructuredFilters(base, filters);
  return {
    data: filtered.slice(offset, offset + limit),
    total: filtered.length,
  };
}

/**
 * Passthrough for the unfiltered-catalog case (no search, no filters) —
 * uses the upstream API's native pagination for lower memory + bandwidth.
 */
export async function fetchExercisesThrough(
  limit: number,
  offset: number
): Promise<{ data: ApiExercise[]; total: number | null }> {
  const resp = await fetchExercises({ limit, offset });
  return { data: resp.data, total: resp.total };
}

export function invalidateCatalog(): void {
  catalogCache = null;
  fuseInstance = null;
  fuseBuiltFor = null;
}
