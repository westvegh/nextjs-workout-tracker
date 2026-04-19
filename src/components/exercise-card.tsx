"use client";

import Link from "next/link";
import { Play, Star } from "lucide-react";
import { Badge } from "@/components/badge";
import { useExerciseFavorites } from "@/lib/exercise-favorites";
import { cn } from "@/lib/utils";
import type { ApiExercise } from "@/lib/exercise-api/types";

interface ExerciseCardProps {
  exercise: Pick<
    ApiExercise,
    | "id"
    | "name"
    | "primaryMuscles"
    | "equipment"
    | "category"
    | "level"
    | "videos"
  >;
  /** Optional pre-computed "Last: 3d ago" string. Library page populates this
   *  from the workout store; other callers can omit. */
  lastPerformed?: string | null;
}

export function ExerciseCard({ exercise, lastPerformed }: ExerciseCardProps) {
  const muscle = exercise.primaryMuscles[0];
  const video = exercise.videos?.[0];
  const { isFavorite, toggle, hydrated } = useExerciseFavorites();
  const favorited = hydrated && isFavorite(exercise.id);

  function handleStar(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    toggle(exercise.id);
  }

  return (
    <Link
      href={`/exercises/${exercise.id}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/20 hover:bg-accent/40"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {video ? (
          <>
            <video
              src={video.url}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
            <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm backdrop-blur">
              <Play className="h-2.5 w-2.5" />
              video
            </div>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Video coming soon
          </div>
        )}
        {hydrated ? (
          <button
            type="button"
            onClick={handleStar}
            aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={favorited}
            className={cn(
              "absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground",
              favorited && "text-amber-500 hover:text-amber-500"
            )}
          >
            <Star
              className={cn("h-3.5 w-3.5", favorited && "fill-current")}
            />
          </button>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-medium leading-tight tracking-tight group-hover:text-foreground">
          {exercise.name}
        </h3>
        {lastPerformed ? (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Last: {lastPerformed}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {muscle ? <Badge variant="default">{muscle}</Badge> : null}
          {exercise.equipment ? (
            <Badge variant="outline">{exercise.equipment}</Badge>
          ) : null}
        </div>
        <div className="mt-auto pt-4 text-xs text-muted-foreground">
          <span className="capitalize">{exercise.category}</span>
          <span className="mx-1.5">&middot;</span>
          <span className="capitalize">{exercise.level}</span>
        </div>
      </div>
    </Link>
  );
}
