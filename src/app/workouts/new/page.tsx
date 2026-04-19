import { fetchExercise } from "@/lib/exercise-api/client";
import { NewWorkoutBuilder } from "./new-workout-builder";
import type { PickerResult } from "@/components/exercise-picker-dialog";

type SearchParams = Promise<{ exerciseId?: string }>;

export default async function NewWorkoutPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  let prefill: PickerResult | null = null;
  if (params.exerciseId && process.env.EXERCISEAPI_KEY) {
    try {
      const ex = await fetchExercise(params.exerciseId);
      if (ex) {
        prefill = {
          id: ex.id,
          name: ex.name,
          muscle: ex.primaryMuscles[0] ?? null,
          equipment: ex.equipment,
          videoUrl: ex.videos?.[0]?.url ?? null,
        };
      }
    } catch {
      // Silently drop the prefill if the API call fails; user can still add manually.
    }
  }

  return <NewWorkoutBuilder prefill={prefill} />;
}
