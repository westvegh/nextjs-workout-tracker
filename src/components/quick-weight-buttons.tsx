"use client";

/**
 * QuickWeightButtons — increment/decrement the weight input without opening
 * the numeric keypad. Values are the four most common plate math deltas:
 * -5, +2.5, +5, +10.
 *
 * Styled to sit below the weight input on mobile and inline-right on desktop.
 * The parent controls where it lives via className.
 */

interface QuickWeightButtonsProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
}

const STEPS: Array<{ label: string; delta: number }> = [
  { label: "-5", delta: -5 },
  { label: "+2.5", delta: 2.5 },
  { label: "+5", delta: 5 },
  { label: "+10", delta: 10 },
];

function applyDelta(current: string, delta: number): string {
  const n = current.trim() === "" ? 0 : Number(current);
  const base = Number.isFinite(n) ? n : 0;
  const next = Math.max(0, base + delta);
  // Keep .5 when present, else integer.
  const rounded = Math.round(next * 2) / 2;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}

export function QuickWeightButtons({
  value,
  onChange,
  disabled,
  className,
}: QuickWeightButtonsProps) {
  return (
    <div
      className={
        "flex items-center gap-1" + (className ? ` ${className}` : "")
      }
      role="group"
      aria-label="Quick weight adjustments"
    >
      {STEPS.map((step) => (
        <button
          key={step.label}
          type="button"
          disabled={disabled}
          onClick={() => onChange(applyDelta(value, step.delta))}
          className="h-8 min-w-[42px] rounded-md border border-input bg-transparent px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          aria-label={`${step.delta > 0 ? "Add" : "Subtract"} ${Math.abs(step.delta)} pounds`}
        >
          {step.label}
        </button>
      ))}
    </div>
  );
}
