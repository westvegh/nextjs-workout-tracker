import Link from "next/link";
import {
  fetchCategories,
  fetchEquipment,
  fetchExercises,
  fetchMuscles,
} from "@/lib/exercise-api/client";
import { ExerciseCard } from "@/components/exercise-card";
import { ExerciseFilters } from "@/components/exercise-filters";
import { SetupBanner } from "@/components/setup-banner";
import { DemoFooterCta } from "@/components/demo-footer-cta";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 24;
const HAS_VIDEO_FETCH_LIMIT = 100;

type SearchParams = Promise<{
  search?: string;
  muscle?: string;
  equipment?: string;
  category?: string;
  offset?: string;
  videos?: string;
}>;

interface ExercisesPageProps {
  searchParams: SearchParams;
}

export default async function ExercisesPage({
  searchParams,
}: ExercisesPageProps) {
  const params = await searchParams;
  const offset = Math.max(0, Number(params.offset ?? 0) || 0);
  const hasVideoFilter = params.videos === "1";

  if (!process.env.EXERCISEAPI_KEY) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Exercises</h1>
        <div className="mt-8">
          <SetupBanner
            title="Exercise API key missing"
            envVar="EXERCISEAPI_KEY"
            description={
              <>
                Get yours at{" "}
                <a
                  href="https://exerciseapi.dev/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline-offset-4 hover:underline"
                >
                  exerciseapi.dev/dashboard
                </a>
                .
              </>
            }
          />
        </div>
      </main>
    );
  }

  let data: Awaited<ReturnType<typeof fetchExercises>> | null = null;
  let muscles: string[] = [];
  let equipment: string[] = [];
  let categories: string[] = [];
  let loadError: string | null = null;

  try {
    const [exercisesResp, musclesResp, equipmentResp, categoriesResp] =
      await Promise.all([
        fetchExercises({
          // When filtering to has-video we over-fetch and filter client-side
          // because the API doesn't support a has_video query param.
          limit: hasVideoFilter ? HAS_VIDEO_FETCH_LIMIT : PAGE_SIZE,
          offset,
          search: params.search,
          muscle: params.muscle,
          equipment: params.equipment,
          category: params.category,
        }),
        fetchMuscles(),
        fetchEquipment(),
        fetchCategories(),
      ]);
    data = exercisesResp;
    muscles = musclesResp;
    equipment = equipmentResp;
    categories = categoriesResp;
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Failed to load exercises.";
  }

  // If the has-video filter is on, filter in memory and trim to a single page.
  const visibleExercises = data
    ? hasVideoFilter
      ? data.data
          .filter((ex) => Array.isArray(ex.videos) && ex.videos.length > 0)
          .slice(0, PAGE_SIZE)
      : data.data
    : [];

  const hasFilters = Boolean(
    params.search ||
      params.muscle ||
      params.equipment ||
      params.category ||
      hasVideoFilter
  );

  const prevOffset = Math.max(0, offset - PAGE_SIZE);
  const nextOffset = offset + PAGE_SIZE;
  // When the has-video filter is on, pagination is best-effort — we over-fetch
  // a single page and don't know how many video-backed exercises exist beyond
  // it. Disable Next to avoid misleading the visitor.
  const hasNext = data
    ? hasVideoFilter
      ? false
      : data.data.length === PAGE_SIZE
    : false;

  function buildPageLink(targetOffset: number): string {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.muscle) qs.set("muscle", params.muscle);
    if (params.equipment) qs.set("equipment", params.equipment);
    if (params.category) qs.set("category", params.category);
    if (hasVideoFilter) qs.set("videos", "1");
    if (targetOffset > 0) qs.set("offset", String(targetOffset));
    const qsString = qs.toString();
    return qsString ? `/exercises?${qsString}` : "/exercises";
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Exercises</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse the full exerciseapi.dev catalog.
          </p>
        </div>
        {data && data.total !== null ? (
          <p className="text-sm text-muted-foreground">
            {data.total.toLocaleString()} total
          </p>
        ) : null}
      </div>

      <div className="mt-8">
        <ExerciseFilters
          muscles={muscles}
          equipment={equipment}
          categories={categories}
          initial={{
            search: params.search,
            muscle: params.muscle,
            equipment: params.equipment,
            category: params.category,
            videos: hasVideoFilter,
          }}
        />
      </div>

      {loadError ? (
        <div className="mt-10 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {loadError}
        </div>
      ) : data && visibleExercises.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : data ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleExercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))}
          </div>

          <div className="mt-10 flex items-center justify-between">
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={offset === 0}
              aria-disabled={offset === 0}
            >
              {offset === 0 ? (
                <span>Previous</span>
              ) : (
                <Link href={buildPageLink(prevOffset)}>Previous</Link>
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              Showing {offset + 1}&ndash;{offset + visibleExercises.length}
            </span>
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={!hasNext}
              aria-disabled={!hasNext}
            >
              {!hasNext ? (
                <span>Next</span>
              ) : (
                <Link href={buildPageLink(nextOffset)}>Next</Link>
              )}
            </Button>
          </div>
        </>
      ) : null}

      <DemoFooterCta />
    </main>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="mt-12 rounded-lg border border-dashed p-12 text-center">
      <h2 className="font-medium">No exercises found</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasFilters
          ? "Try a different combination of filters."
          : "The API returned no results."}
      </p>
      {hasFilters ? (
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/exercises">Clear filters</Link>
        </Button>
      ) : null}
    </div>
  );
}
