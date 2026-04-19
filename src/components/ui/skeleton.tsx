import { cn } from "@/lib/utils";

/**
 * Skeleton placeholder. Pulses the muted token so it reads softly in both
 * light and dark themes. Prefer wrapping actual element shapes (h-4, w-full,
 * rounded-md) rather than using raw rectangles.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/60", className)}
      {...props}
    />
  );
}
