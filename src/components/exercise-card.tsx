import Link from "next/link";
import { Badge } from "@/components/badge";
import type { ApiExercise } from "@/lib/exercise-api/types";

interface ExerciseCardProps {
  exercise: Pick<
    ApiExercise,
    "id" | "name" | "primaryMuscles" | "equipment" | "category" | "level"
  >;
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  const muscle = exercise.primaryMuscles[0];
  return (
    <Link
      href={`/exercises/${exercise.id}`}
      className="group flex flex-col rounded-lg border bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-accent/40"
    >
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
        <span className="mx-1.5">·</span>
        <span className="capitalize">{exercise.level}</span>
      </div>
    </Link>
  );
}
