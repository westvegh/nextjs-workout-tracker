"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiExercise } from "@/lib/exercise-api/types";
import { useExerciseFavorites } from "@/lib/exercise-favorites";
import { useRecentExercises, pushRecent } from "@/lib/recent-exercises";

const SKELETON_ROW_COUNT = 5;

function PickerRowSkeleton() {
  return (
    <li>
      <div className="flex items-center gap-3 p-3">
        <Skeleton className="h-10 w-14 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-9 w-9 shrink-0" />
      </div>
    </li>
  );
}

export interface PickerResult {
  id: string;
  name: string;
  muscle: string | null;
  equipment: string | null;
  videoUrl?: string | null;
}

interface ExercisePickerDialogProps {
  onAdd: (exercise: PickerResult) => void;
  trigger?: React.ReactNode;
}

function exerciseInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

interface ExerciseRowProps {
  exercise: ApiExercise;
  onAdd: (ex: ApiExercise) => void;
  favorited: boolean;
  onToggleFavorite: (id: string) => void;
}

function ExerciseRow({
  exercise: ex,
  onAdd,
  favorited,
  onToggleFavorite,
}: ExerciseRowProps) {
  const video = ex.videos?.[0];
  return (
    <li>
      <div className="flex items-center gap-3 p-3">
        <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
          {video ? (
            <video
              src={video.url}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {exerciseInitials(ex.name)}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onAdd(ex)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="truncate font-medium">{ex.name}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {ex.primaryMuscles[0] ?? "—"}
            {ex.equipment ? ` · ${ex.equipment}` : ""}
          </div>
        </button>
        <button
          type="button"
          onClick={() => onToggleFavorite(ex.id)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={favorited ? "Unfavorite" : "Favorite"}
          aria-pressed={favorited}
        >
          <Star
            className={
              "h-4 w-4 " +
              (favorited ? "fill-foreground text-foreground" : "")
            }
          />
        </button>
      </div>
    </li>
  );
}

export function ExercisePickerDialog({
  onAdd,
  trigger,
}: ExercisePickerDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiExercise[]>([]);
  // Tracks which (trimmed) query `results` corresponds to. Loading and
  // empty-state are derived from this + `query` — no synchronous setState
  // in the effect body, which the React 19 lint rule forbids.
  const [resultsForQuery, setResultsForQuery] = useState<string>("");
  const [error, setError] = useState<{ forQuery: string; message: string } | null>(
    null
  );
  // Cache of exercises we have already seen so recents/favorites have a
  // renderable record without firing individual /exercises/:id requests.
  const [cache, setCache] = useState<Map<string, ApiExercise>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const trimmedQuery = query.trim();
  // Show skeleton whenever the typed query doesn't yet match the query the
  // current results were fetched for, unless that query already errored.
  const loading =
    trimmedQuery !== "" &&
    resultsForQuery !== trimmedQuery &&
    error?.forQuery !== trimmedQuery;
  const activeError = error?.forQuery === trimmedQuery ? error.message : null;

  const { favorites, toggle: toggleFavorite } = useExerciseFavorites();
  const { recents } = useRecentExercises();

  const cacheExercises = useCallback((exs: ApiExercise[]) => {
    setCache((prev) => {
      const next = new Map(prev);
      for (const ex of exs) next.set(ex.id, ex);
      return next;
    });
  }, []);

  useEffect(() => {
    // No dialog open, or empty query: nothing to fetch. Recents/favorites
    // already render from cache.
    if (!open || trimmedQuery === "") return;
    // Already have results (or an error) for this exact query: no refetch.
    if (resultsForQuery === trimmedQuery || error?.forQuery === trimmedQuery)
      return;

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const fetchedQuery = trimmedQuery;

    const handle = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search-exercises?q=${encodeURIComponent(fetchedQuery)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? `Search failed (${response.status})`);
        }
        const body = await response.json();
        const data: ApiExercise[] = body.data ?? [];
        setResults(data);
        setResultsForQuery(fetchedQuery);
        cacheExercises(data);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setError({
          forQuery: fetchedQuery,
          message: err instanceof Error ? err.message : "Search failed",
        });
      }
    }, 200);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [open, trimmedQuery, resultsForQuery, error, cacheExercises]);

  function handleAdd(ex: ApiExercise) {
    // Cache the clicked exercise and bump it to the front of recents so the
    // next picker open surfaces it. Favorite status is unchanged.
    cacheExercises([ex]);
    pushRecent(ex.id);
    onAdd({
      id: ex.id,
      name: ex.name,
      muscle: ex.primaryMuscles[0] ?? null,
      equipment: ex.equipment,
      videoUrl: ex.videos?.[0]?.url ?? null,
    });
    setOpen(false);
    setQuery("");
  }

  const showDefaultSections = query.trim() === "";
  const recentExercises = showDefaultSections
    ? recents
        .map((id) => cache.get(id))
        .filter((ex): ex is ApiExercise => ex !== undefined)
    : [];
  const favoriteExercises = showDefaultSections
    ? Array.from(favorites)
        .map((id) => cache.get(id))
        .filter((ex): ex is ApiExercise => ex !== undefined)
    : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline">Add exercise</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add exercise</DialogTitle>
          <DialogDescription>
            Search the exerciseapi.dev catalog.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            type="search"
            placeholder="Bench press, squat, curl..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="max-h-96 space-y-4 overflow-y-auto">
          {showDefaultSections &&
          (recentExercises.length > 0 || favoriteExercises.length > 0) ? (
            <>
              {favoriteExercises.length > 0 ? (
                <section>
                  <h3 className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Favorites
                  </h3>
                  <ul className="divide-y rounded-md border">
                    {favoriteExercises.map((ex) => (
                      <ExerciseRow
                        key={`fav-${ex.id}`}
                        exercise={ex}
                        onAdd={handleAdd}
                        favorited={favorites.has(ex.id)}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </ul>
                </section>
              ) : null}
              {recentExercises.length > 0 ? (
                <section>
                  <h3 className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Recently used
                  </h3>
                  <ul className="divide-y rounded-md border">
                    {recentExercises.map((ex) => (
                      <ExerciseRow
                        key={`rec-${ex.id}`}
                        exercise={ex}
                        onAdd={handleAdd}
                        favorited={favorites.has(ex.id)}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          ) : null}

          <div className="rounded-md border">
            {loading ? (
              <div aria-busy="true" aria-live="polite" data-testid="picker-loading">
                <span className="sr-only">Searching</span>
                <ul className="divide-y">
                  {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
                    <PickerRowSkeleton key={i} />
                  ))}
                </ul>
              </div>
            ) : activeError ? (
              <div className="p-6 text-sm text-destructive">{activeError}</div>
            ) : showDefaultSections || results.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {query ? (
                  <>
                    No matches for &ldquo;{query}&rdquo;.
                    <div className="mt-1 text-xs">
                      Try &ldquo;bench press&rdquo; or &ldquo;squat&rdquo;.
                    </div>
                  </>
                ) : (
                  <>
                    Start typing to search.
                    <div className="mt-1 text-xs">
                      Try &ldquo;bench press&rdquo; or &ldquo;squat&rdquo;.
                    </div>
                  </>
                )}
              </div>
            ) : (
              <ul className="divide-y">
                {results.map((ex) => (
                  <ExerciseRow
                    key={ex.id}
                    exercise={ex}
                    onAdd={handleAdd}
                    favorited={favorites.has(ex.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
