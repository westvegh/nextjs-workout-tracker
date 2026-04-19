/**
 * MiniRing — a tiny SVG progress ring used by the session sticky bar (24px),
 * exercise card left gutter (26px), and rest sheet (56px). Single source of
 * ring geometry so sizing stays consistent.
 *
 * Progress is 0..1. Values outside that range are clamped. Strokes use
 * `currentColor`, so callers drive color with `text-brand` / `text-destructive`
 * etc. — avoids hardcoding token names.
 */

interface MiniRingProps {
  size: number;
  stroke: number;
  progress: number;
  className?: string;
  "aria-label"?: string;
}

export function MiniRing({
  size,
  stroke,
  progress,
  className,
  ...rest
}: MiniRingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role={rest["aria-label"] ? "img" : undefined}
      aria-label={rest["aria-label"]}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.15}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 400ms cubic-bezier(.22,.61,.36,1)" }}
      />
    </svg>
  );
}
