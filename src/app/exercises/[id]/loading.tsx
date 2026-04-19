import { Skeleton } from "@/components/ui/skeleton";

/**
 * Streaming loading state for the exercise detail page. Next.js Suspense
 * boundary mounts this while the server-side fetchExercise resolves.
 *
 * Layout mirrors the committed page (video left-column, meta right-column)
 * so the jump when content arrives is minimal.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <Skeleton className="h-4 w-28" />
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-80" />
          <Skeleton className="mt-3 h-4 w-96 max-w-full" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Skeleton className="aspect-video w-full" />
        </div>
        <aside className="space-y-6 lg:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="space-y-3 rounded-lg border bg-card p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
          <div>
            <Skeleton className="h-4 w-28" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
