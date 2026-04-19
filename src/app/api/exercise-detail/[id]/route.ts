import { NextResponse } from "next/server";
import { fetchExercise } from "@/lib/exercise-api/client";

/**
 * Lazy per-exercise detail proxy for the workout-logger's demo video pill.
 * Keeps the response payload minimal: the logger only needs the first video's
 * URL + poster to render the inline demo panel.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!process.env.EXERCISEAPI_KEY) {
    return NextResponse.json(
      { error: "EXERCISEAPI_KEY is not set" },
      { status: 500 }
    );
  }

  try {
    const exercise = await fetchExercise(id);
    if (!exercise) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const video = exercise.videos?.[0] ?? null;
    return NextResponse.json({
      name: exercise.name,
      videoUrl: video?.url ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
