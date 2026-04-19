import { NextResponse } from "next/server";
import { fetchExercises } from "@/lib/exercise-api/client";

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
    const result = await fetchExercises({ search: q, limit: 20 });
    return NextResponse.json({ data: result.data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
