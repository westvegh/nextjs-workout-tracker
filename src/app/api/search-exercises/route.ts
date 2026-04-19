import { NextResponse } from "next/server";
import { searchAndPaginate } from "@/lib/exercise-search";

const SEARCH_PAGE_SIZE = 20;

// Exercise-picker search endpoint. Uses Fuse-backed local filtering because
// upstream exerciseapi.dev's /exercises?search= param is silently broken
// (returns unfiltered alphabetical head regardless of the query). See
// /api/list-exercises for the same pattern applied to the library page.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (!process.env.EXERCISEAPI_KEY) {
    return NextResponse.json(
      { error: "EXERCISEAPI_KEY is not set" },
      { status: 500 }
    );
  }

  try {
    const result = await searchAndPaginate(
      { search: q },
      SEARCH_PAGE_SIZE,
      0
    );
    return NextResponse.json({ data: result.data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
