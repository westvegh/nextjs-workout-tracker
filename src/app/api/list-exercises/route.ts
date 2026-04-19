import { NextResponse } from "next/server";
import { fetchExercises } from "@/lib/exercise-api/client";

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
  const muscle = searchParams.get("muscle") ?? undefined;
  const equipment = searchParams.get("equipment") ?? undefined;
  const category = searchParams.get("category") ?? undefined;

  try {
    const result = await fetchExercises({
      limit,
      offset,
      search: search || undefined,
      muscle: muscle || undefined,
      equipment: equipment || undefined,
      category: category || undefined,
    });
    const data = hasVideoFilter
      ? result.data
          .filter((ex) => Array.isArray(ex.videos) && ex.videos.length > 0)
          .slice(0, PAGE_SIZE)
      : result.data.slice(0, PAGE_SIZE);
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "List failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
