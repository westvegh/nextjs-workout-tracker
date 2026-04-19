import type { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** lucide-react icon component to render at the top */
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  /** Optional secondary action rendered next to the primary. */
  secondary?: ReactNode;
  className?: string;
}

/**
 * Unified empty state. Ports the feel of workout-app's EmptyState (centered,
 * muted, clear primary CTA) to the web.
 *
 *   <EmptyState
 *     icon={Dumbbell}
 *     title="No workouts yet"
 *     description="Build your first workout from the exercise catalog."
 *     actionLabel="Create your first"
 *     onAction={() => router.push('/workouts/new')}
 *   />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondary,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center",
        className
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <h2 className="text-base font-medium">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={onAction} size="sm">
            {actionLabel}
          </Button>
          {secondary}
        </div>
      ) : secondary ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {secondary}
        </div>
      ) : null}
    </div>
  );
}
