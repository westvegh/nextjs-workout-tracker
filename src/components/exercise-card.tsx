import Link from "next/link";
import { Play } from "lucide-react";
import { Badge } from "@/components/badge";
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
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  const muscle = exercise.primaryMuscles[0];
  const video = exercise.videos?.[0];
  return (
    <Link
      href={`/exercises/${exercise.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/20 hover:bg-accent/40"
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
            No video
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-medium leading-tight tracking-tight group-hover:text-foreground">
          {exercise.name}
        </h3>
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
