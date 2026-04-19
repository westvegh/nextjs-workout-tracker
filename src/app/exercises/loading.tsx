import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseGridSkeleton } from "@/components/exercise-browser";

/**
 * Streaming loading state for the exercise library. Renders a shell of the
 * page (title, filter-row placeholders, grid skeleton) so the layout is
 * stable as the server fetches the initial page.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <div>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="mt-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 min-w-[240px] flex-1" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </div>
      <ExerciseGridSkeleton count={9} />
    </main>
  );
}
