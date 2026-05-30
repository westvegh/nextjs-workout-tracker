import { fetchExercises } from "./exercise-api/client";
import type { ApiExercise } from "./exercise-api/types";

// Thin passthrough to exerciseapi.dev. The upstream /exercises endpoint
// handles full-text search (?search=), muscle/equipment/category multi-value
// OR-within and cross-axis AND, muscle-display-group expansion, and (since
// 2026-05-30, exercise-api migration 030) the hasVideo filter. This module
// just collapses the demo's filter types into the API client's param shape.

export interface SearchFilters {
  search?: string;
  muscles?: string[];
  equipment?: string[];
  categories?: string[];
  hasVideo?: boolean;
}

/**
 * Search + filter. Upstream handles everything, including hasVideo, so this is
 * a one-request passthrough with an honest `total` for every filter combo.
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
    hasVideo: filters.hasVideo ? true : undefined,
  });

  return { data: resp.data, total: resp.total };
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
