"use client";

import { Dumbbell, Search as SearchIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { ExerciseCard } from "@/components/exercise-card";
import { ExerciseFilters } from "@/components/exercise-filters";
import type { ExerciseFiltersValue } from "@/components/exercise-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { useExerciseFavorites } from "@/lib/exercise-favorites";
import { useIntersection } from "@/lib/use-intersection";
import type { ApiExercise } from "@/lib/exercise-api/types";

const PAGE_SIZE = 24;

interface ExerciseBrowserProps {
  muscles: string[];
  equipment: string[];
  categories: string[];
  initialExercises: ApiExercise[];
  initialTotal: number | null;
  initialFilters: ExerciseFiltersValue;
  /** When ?videos=1 the server over-fetches the first page; this is the
   *  fetch size the client should continue using for subsequent pages. */
  pageFetchLimit: number;
  /** Raw URL for the client-side "load more" endpoint. Server hands this off
   *  since the exerciseapi key is server-only. */
  fetchPath: string;
}

export function ExerciseBrowser({
  muscles,
  equipment,
  categories,
  initialExercises,
  initialTotal,
  initialFilters,
  pageFetchLimit,
  fetchPath,
}: ExerciseBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ExerciseFiltersValue>(initialFilters);
  const [exercises, setExercises] = useState<ApiExercise[]>(initialExercises);
  const [offset, setOffset] = useState<number>(initialExercises.length);
  const [hasMore, setHasMore] = useState<boolean>(
    initialExercises.length >= PAGE_SIZE && !filters.favorites
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [total] = useState<number | null>(initialTotal);
  const { favorites, hydrated: favsHydrated } = useExerciseFavorites();

  // When filters change, push to URL and rely on the server component to
  // refetch + rehydrate initialExercises. The filters prop will come back in
  // on the next render and we reset local pagination state.
  const applyFilters = useCallback(
    (next: ExerciseFiltersValue) => {
      setFilters(next);
      const params = new URLSearchParams();
      if (next.search) params.set("search", next.search);
      if (next.muscles.length) params.set("muscle", next.muscles[0]);
      if (next.equipment.length) params.set("equipment", next.equipment[0]);
      if (next.categories.length) params.set("category", next.categories[0]);
      if (next.videos) params.set("videos", "1");
      if (next.favorites) params.set("favorites", "1");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  // When server re-renders with fresh initialExercises (URL changed),
  // reset the client list so we don't accumulate stale results.
  const prevSearch = useRef(searchParams.toString());
  useEffect(() => {
    const current = searchParams.toString();
    if (current === prevSearch.current) return;
    prevSearch.current = current;
    setExercises(initialExercises);
    setOffset(initialExercises.length);
    setHasMore(initialExercises.length >= PAGE_SIZE && !filters.favorites);
  }, [searchParams, initialExercises, filters.favorites]);

  // Infinite scroll sentinel.
  const { setRef: sentinelRef, isIntersecting: sentinelIntersecting } =
    useIntersection({ rootMargin: "400px" });
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || filters.favorites) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(pageFetchLimit));
      params.set("offset", String(offset));
      if (filters.search) params.set("search", filters.search);
      if (filters.muscles.length) params.set("muscle", filters.muscles[0]);
      if (filters.equipment.length)
        params.set("equipment", filters.equipment[0]);
      if (filters.categories.length)
        params.set("category", filters.categories[0]);
      if (filters.videos) params.set("videos", "1");
      const resp = await fetch(`${fetchPath}?${params.toString()}`);
      if (!resp.ok) throw new Error(`load failed: ${resp.status}`);
      const body: { data: ApiExercise[] } = await resp.json();
      const fetched = Array.isArray(body.data) ? body.data : [];
      setExercises((prev) => [...prev, ...fetched]);
      setOffset((prev) => prev + fetched.length);
      setHasMore(fetched.length >= PAGE_SIZE);
    } catch (err) {
      toast.error("Could not load more exercises.");
      setHasMore(false);
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [
    fetchPath,
    filters.categories,
    filters.equipment,
    filters.favorites,
    filters.muscles,
    filters.search,
    filters.videos,
    hasMore,
    loadingMore,
    offset,
    pageFetchLimit,
  ]);

  useEffect(() => {
    if (sentinelIntersecting) {
      // setState happens inside loadMore. The rule is flagging the transitive
      // call; this is exactly what infinite scroll is supposed to do.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadMore();
    }
  }, [sentinelIntersecting, loadMore]);

  // Client-side post-filters: multi-chip within a category + favorites mode.
  const visible = useMemo(() => {
    let list = exercises;
    // Multi-select: if more than one chip is selected in a category, retain
    // only exercises that match any of them (honest filter across the page).
    if (filters.muscles.length > 1) {
      const set = new Set(filters.muscles.map((m) => m.toLowerCase()));
      list = list.filter((ex) =>
        ex.primaryMuscles.some((m) => set.has(m.toLowerCase()))
      );
    }
    if (filters.equipment.length > 1) {
      const set = new Set(filters.equipment.map((m) => m.toLowerCase()));
      list = list.filter(
        (ex) => ex.equipment && set.has(ex.equipment.toLowerCase())
      );
    }
    if (filters.categories.length > 1) {
      const set = new Set(filters.categories.map((m) => m.toLowerCase()));
      list = list.filter((ex) => set.has(ex.category.toLowerCase()));
    }
    if (filters.favorites) {
      list = list.filter((ex) => favorites.has(ex.id));
    }
    return list;
  }, [exercises, favorites, filters.categories, filters.equipment, filters.favorites, filters.muscles]);

  // In favorites mode we need to fetch more pages until we have enough
  // matches or the catalog runs out. Kick that off reactively.
  useEffect(() => {
    if (!filters.favorites) return;
    if (!favsHydrated) return;
    if (visible.length >= 24) return;
    if (!hasMore && exercises.length > 0) return;
    // Borrow loadMore to keep fetching until we fill the page or exhaust.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMore();
  }, [
    filters.favorites,
    favsHydrated,
    visible.length,
    hasMore,
    exercises.length,
    loadMore,
  ]);

  const noResults = visible.length === 0 && !loadingMore;

  return (
    <>
      <div className="mt-8">
        <ExerciseFilters
          muscles={muscles}
          equipment={equipment}
          categories={categories}
          value={filters}
          onChange={applyFilters}
          favoritesAvailable={favsHydrated && favorites.size > 0}
        />
      </div>

      {total !== null ? (
        <p className="mt-6 text-xs text-muted-foreground">
          {filters.favorites
            ? `${favorites.size} favorite${favorites.size === 1 ? "" : "s"}`
            : `${total.toLocaleString()} total`}
        </p>
      ) : null}

      {noResults ? (
        <EmptyState
          icon={filters.favorites ? Dumbbell : SearchIcon}
          title={
            filters.favorites ? "No favorites yet" : "No exercises match"
          }
          description={
            filters.favorites
              ? "Tap the star on any exercise card to save it here."
              : "Try a different combination, like chest or barbell."
          }
          actionLabel="Clear filters"
          onAction={() =>
            applyFilters({
              search: "",
              muscles: [],
              equipment: [],
              categories: [],
              videos: false,
              favorites: false,
            })
          }
          className="mt-10"
        />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((exercise) => (
            <ExerciseCard key={exercise.id} exercise={exercise} />
          ))}
        </div>
      )}

      {/* Sentinel + loading row. Invisible but measured. */}
      <div ref={sentinelRef} className="h-1" aria-hidden="true" />
      {loadingMore ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ExerciseCardSkeleton key={i} />
          ))}
        </div>
      ) : null}
      {!hasMore && exercises.length > 0 && !filters.favorites ? (
        <p className="mt-10 text-center text-xs text-muted-foreground">
          End of catalog.
        </p>
      ) : null}
    </>
  );
}

export function ExerciseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="p-5">
        <Skeleton className="h-4 w-3/4" />
        <div className="mt-3 flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-4 h-3 w-32" />
      </div>
    </div>
  );
}

export function ExerciseGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ExerciseCardSkeleton key={i} />
      ))}
    </div>
  );
}
