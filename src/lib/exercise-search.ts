import { fetchExercises } from "./exercise-api/client";
import type { ApiExercise } from "./exercise-api/types";

// Thin passthrough to exerciseapi.dev. The upstream /exercises endpoint
// handles full-text search (?search=), muscle/equipment/category multi-value
// OR-within and cross-axis AND, and muscle-display-group expansion server
// side. This module exists mainly to (a) collapse the demo's filter types
// into the API client's param shape and (b) apply the tiny hasVideo
// post-filter the upstream doesn't support yet.

export interface SearchFilters {
  search?: string;
  muscles?: string[];
  equipment?: string[];
  categories?: string[];
  hasVideo?: boolean;
}

/**
 * Search + filter. Upstream handles everything except hasVideo, which is
 * post-filtered client-side. Callers with hasVideo active should over-fetch
 * via a larger limit (see /api/list-exercises).
 */
export async function searchAndPaginate(
  filters: SearchFilters,
  limit: number,
  offset: number
): Promise<{ data: ApiExercise[]; total: number | null }> {
  const resp = await fetchExercises({
    limit,
    offset,
    search: filters.search?.trim() || undefined,
    muscle: filters.muscles && filters.muscles.length > 0 ? filters.muscles : undefined,
    equipment: filters.equipment && filters.equipment.length > 0 ? filters.equipment : undefined,
    category: filters.categories && filters.categories.length > 0 ? filters.categories : undefined,
  });

  const data = filters.hasVideo
    ? resp.data.filter((e) => e.videos && e.videos.length > 0)
    : resp.data;

  // When hasVideo is active, the `total` count from upstream doesn't reflect
  // the post-filter. Return null so callers don't render a misleading number.
  const total = filters.hasVideo ? null : resp.total;

  return { data, total };
}

/**
 * Unfiltered passthrough using the API's native pagination. Used when no
 * filters are active for lower bandwidth than searchAndPaginate's generic
 * path (both are one request — kept separate for caller clarity).
 */
export async function fetchExercisesThrough(
  limit: number,
  offset: number
): Promise<{ data: ApiExercise[]; total: number | null }> {
  const resp = await fetchExercises({ limit, offset });
  return { data: resp.data, total: resp.total };
}
