import Fuse, { type IFuseOptions } from "fuse.js";
import {
  fetchAllExercises,
  fetchExercises,
  fetchMuscleGroups,
} from "./exercise-api/client";
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

// displayGroup (lowercased) → specific muscle names (lowercased).
// e.g., "adductors" → ["gracilis", "adductor longus", "adductor magnus"]
let muscleGroupsCache: Record<string, string[]> | null = null;
let muscleGroupsPromise: Promise<Record<string, string[]>> | null = null;

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

async function getMuscleGroups(): Promise<Record<string, string[]>> {
  if (muscleGroupsCache) return muscleGroupsCache;
  if (muscleGroupsPromise) return muscleGroupsPromise;
  muscleGroupsPromise = fetchMuscleGroups()
    .then((groups) => {
      const map: Record<string, string[]> = {};
      for (const g of groups) {
        map[g.displayGroup.toLowerCase()] = g.muscles.map((m) =>
          m.toLowerCase()
        );
      }
      muscleGroupsCache = map;
      muscleGroupsPromise = null;
      return map;
    })
    .catch((err) => {
      muscleGroupsPromise = null;
      throw err;
    });
  return muscleGroupsPromise;
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
  // Multi-select: OR within each list, AND across lists.
  // E.g., { muscles: ["adductors", "neck"], equipment: ["barbell"] } means
  // "exercises hitting adductors OR neck, that ALSO use barbell".
  muscles?: string[];
  equipment?: string[];
  categories?: string[];
  hasVideo?: boolean;
}

export function applyStructuredFilters(
  items: ApiExercise[],
  filters: SearchFilters,
  muscleGroupMap: Record<string, string[]> | null
): ApiExercise[] {
  // Pre-resolve the union of acceptable specific muscle names across all
  // selected display groups. Empty array means "muscle filter inactive".
  // Defensive fallback: if a selected group isn't in the map (unknown or
  // legacy), include the lowercased group name itself for substring matching.
  const muscleFilters = (filters.muscles ?? []).filter(Boolean);
  const acceptableMuscles = new Set<string>();
  const substringFallbacks: string[] = [];
  for (const m of muscleFilters) {
    const lower = m.toLowerCase();
    const specificNames = muscleGroupMap?.[lower];
    if (specificNames && specificNames.length > 0) {
      for (const n of specificNames) acceptableMuscles.add(n);
    } else {
      substringFallbacks.push(lower);
    }
  }

  const equipmentFilters = (filters.equipment ?? [])
    .filter(Boolean)
    .map((e) => e.toLowerCase());
  const categoryFilters = (filters.categories ?? [])
    .filter(Boolean)
    .map((c) => c.toLowerCase());

  return items.filter((ex) => {
    if (filters.hasVideo && !(ex.videos && ex.videos.length > 0)) return false;

    // Muscle: exercise matches if ANY of its primary or secondary muscles
    // is in the union of acceptable specific names, OR matches any of the
    // substring fallbacks (for unknown display groups).
    if (muscleFilters.length > 0) {
      const exerciseMuscles = [
        ...(ex.primaryMuscles ?? []),
        ...(ex.secondaryMuscles ?? []),
      ].map((m) => m.toLowerCase());
      const hitsResolved = exerciseMuscles.some((m) =>
        acceptableMuscles.has(m)
      );
      const hitsFallback =
        substringFallbacks.length > 0 &&
        exerciseMuscles.some((m) =>
          substringFallbacks.some((f) => m.includes(f))
        );
      if (!hitsResolved && !hitsFallback) return false;
    }

    // Equipment: exercise matches if its single equipment value is in the
    // selected list. Each exercise has one equipment, but the user may
    // accept several ("I have barbell or cable").
    if (equipmentFilters.length > 0) {
      const exEquipment = (ex.equipment ?? "").toLowerCase();
      if (!equipmentFilters.includes(exEquipment)) return false;
    }

    // Category: same shape as equipment.
    if (categoryFilters.length > 0) {
      const exCategory = (ex.category ?? "").toLowerCase();
      if (!categoryFilters.includes(exCategory)) return false;
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
  // Resolve both caches up front so the filter itself stays sync and pure.
  const needsMuscleMap = !!filters.muscles && filters.muscles.length > 0;
  const [catalog, muscleGroupMap] = await Promise.all([
    getCatalog(),
    needsMuscleMap ? getMuscleGroups() : Promise.resolve(null),
  ]);

  let base: ApiExercise[];
  const q = filters.search?.trim();
  if (q && q.length >= 2) {
    const fuse = getOrBuildIndex(catalog);
    base = fuse.search(q).map((r) => r.item);
  } else {
    base = catalog;
  }

  const filtered = applyStructuredFilters(base, filters, muscleGroupMap);
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
  catalogPromise = null;
  fuseInstance = null;
  fuseBuiltFor = null;
}

// Required for test isolation: the module-level muscle-group cache would
// otherwise leak across test cases in the same file.
export function invalidateMuscleGroups(): void {
  muscleGroupsCache = null;
  muscleGroupsPromise = null;
}
