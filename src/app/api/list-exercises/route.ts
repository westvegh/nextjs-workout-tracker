import { NextResponse } from "next/server";
import { searchAndPaginate, fetchExercisesThrough } from "@/lib/exercise-search";

const PAGE_SIZE = 24;
const HAS_VIDEO_FETCH_LIMIT = 100;

/**
 * Infinite-scroll endpoint for the /exercises library. Mirrors the server
 * component's initial fetch + filter logic so the client list continues to
 * feel identical as the visitor scrolls.
 *
 * Query params:
 *   limit, offset — passthrough to the upstream exerciseapi.dev.
 *   search, muscle, equipment, category — passthrough filters.
 *   videos=1 — over-fetch + post-filter to exercises that have at least one
 *     video. The raw API lacks a has_video param.
 *
 * Response: { data: ApiExercise[] } — client code slices to PAGE_SIZE.
 */
export async function GET(request: Request) {
  if (!process.env.EXERCISEAPI_KEY) {
    return NextResponse.json(
      { error: "EXERCISEAPI_KEY is not set" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);
  const hasVideoFilter = searchParams.get("videos") === "1";
  const limit = Math.max(
    1,
    Math.min(
      Number(searchParams.get("limit") ?? PAGE_SIZE) ||
        (hasVideoFilter ? HAS_VIDEO_FETCH_LIMIT : PAGE_SIZE),
      200
    )
  );
  const search = searchParams.get("search") ?? undefined;
  // Multi-select: client sends ?muscle=adductors&muscle=neck. getAll() handles it.
  const muscles = searchParams.getAll("muscle").filter(Boolean);
  const equipment = searchParams.getAll("equipment").filter(Boolean);
  const categories = searchParams.getAll("category").filter(Boolean);

  try {
    // When any filter is active, use Fuse-backed catalog search (the upstream
    // API's search param is silently broken). Otherwise passthrough.
    const needsLocal = !!(
      search ||
      muscles.length ||
      equipment.length ||
      categories.length ||
      hasVideoFilter
    );
    if (needsLocal) {
      const result = await searchAndPaginate(
        {
          search,
          muscles,
          equipment,
          categories,
          hasVideo: hasVideoFilter,
        },
        PAGE_SIZE,
        offset
      );
      return NextResponse.json({ data: result.data, total: result.total });
    }
    const result = await fetchExercisesThrough(limit, offset);
    return NextResponse.json({
      data: result.data.slice(0, PAGE_SIZE),
      total: result.total,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "List failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
