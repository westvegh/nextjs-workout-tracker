import {
  fetchCategories,
  fetchEquipment,
  fetchMuscles,
} from "@/lib/exercise-api/client";
import {
  fetchExercisesThrough,
  searchAndPaginate,
} from "@/lib/exercise-search";
import type { ApiExercise } from "@/lib/exercise-api/types";
import { ExerciseBrowser } from "@/components/exercise-browser";
import { SetupBanner } from "@/components/setup-banner";
import { DemoFooterCta } from "@/components/demo-footer-cta";

const PAGE_SIZE = 24;
const HAS_VIDEO_FETCH_LIMIT = 100;

type SearchParams = Promise<{
  search?: string;
  muscle?: string | string[];
  equipment?: string | string[];
  category?: string | string[];
  offset?: string;
  videos?: string;
  favorites?: string;
}>;

interface ExercisesPageProps {
  searchParams: SearchParams;
}

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return (Array.isArray(v) ? v : [v]).filter(Boolean);
}

export default async function ExercisesPage({
  searchParams,
}: ExercisesPageProps) {
  const params = await searchParams;
  const hasVideoFilter = params.videos === "1";
  const favoritesFilter = params.favorites === "1";
  const muscleParams = toArray(params.muscle);
  const equipmentParams = toArray(params.equipment);
  const categoryParams = toArray(params.category);

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

  let initialExercises: ApiExercise[] = [];
  let total: number | null = null;
  let muscles: string[] = [];
  let equipment: string[] = [];
  let categories: string[] = [];
  let loadError: string | null = null;

  try {
    // Any active filter goes through the local Fuse-backed search (upstream
    // search param is broken). No filters → direct API passthrough.
    const hasAnyFilter = !!(
      params.search ||
      muscleParams.length ||
      equipmentParams.length ||
      categoryParams.length ||
      hasVideoFilter
    );
    const exercisesPromise = hasAnyFilter
      ? searchAndPaginate(
          {
            search: params.search,
            muscles: muscleParams,
            equipment: equipmentParams,
            categories: categoryParams,
            hasVideo: hasVideoFilter,
          },
          PAGE_SIZE,
          0
        )
      : fetchExercisesThrough(PAGE_SIZE, 0);

    const [exercisesResp, musclesResp, equipmentResp, categoriesResp] =
      await Promise.all([
        exercisesPromise,
        fetchMuscles(),
        fetchEquipment(),
        fetchCategories(),
      ]);
    total = exercisesResp.total;
    initialExercises = exercisesResp.data.slice(0, PAGE_SIZE);
    muscles = musclesResp;
    equipment = equipmentResp;
    categories = categoriesResp;
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Failed to load exercises.";
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
      </div>

      {loadError ? (
        <div className="mt-10 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {loadError}
        </div>
      ) : (
        <ExerciseBrowser
          muscles={muscles}
          equipment={equipment}
          categories={categories}
          initialExercises={initialExercises}
          initialTotal={total}
          initialFilters={{
            search: params.search ?? "",
            muscles: muscleParams,
            equipment: equipmentParams,
            categories: categoryParams,
            videos: hasVideoFilter,
            favorites: favoritesFilter,
          }}
          pageFetchLimit={hasVideoFilter ? HAS_VIDEO_FETCH_LIMIT : PAGE_SIZE}
          fetchPath="/api/list-exercises"
        />
      )}

      <DemoFooterCta />
    </main>
  );
}
