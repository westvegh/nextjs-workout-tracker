/**
 * Sparkline — inline 64x20 polyline showing the last N workouts' top-set
 * weight per exercise. Endpoint dot is `currentColor` so the caller can
 * render it in `text-brand` without hardcoding the token.
 *
 * Returns null when values.length < 2: a single point has no trend to draw,
 * and zero points would render an empty SVG box that occupies layout space.
 */

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  "aria-label"?: string;
}

export function Sparkline({
  values,
  width = 64,
  height = 20,
  className,
  ...rest
}: SparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    // Invert Y so higher weight sits higher on the chart. Leave 2px padding
    // top and bottom so the stroke + endpoint dot don't clip.
    const y = height - 2 - ((v - min) / range) * (height - 4);
    return [x, y] as const;
  });

  const d = points.map(([x, y]) => `${x},${y}`).join(" ");
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role={rest["aria-label"] ? "img" : undefined}
      aria-label={rest["aria-label"]}
    >
      <polyline
        points={d}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.5}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={2} fill="currentColor" />
    </svg>
  );
}
