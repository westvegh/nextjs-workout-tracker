import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * SessionHero — non-sticky header above the exercise list. The sticky bar
 * carries the live clock and progress; this is the workout's "name tag":
 * eyebrow date, title, and three stat chips.
 */

interface StatChipProps {
  label: string;
  value: string;
}

function StatChip({ label, value }: StatChipProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-md border bg-card px-2.5 py-2">
      <span className="font-mono text-sm font-semibold tabular-nums tracking-tight">
        {value}
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

interface SessionHeroProps {
  workoutId: string;
  workoutName: string;
  date: string;
  setsDone: number;
  setsTotal: number;
  volume: number;
}

export function SessionHero({
  workoutId,
  workoutName,
  date,
  setsDone,
  setsTotal,
  volume,
}: SessionHeroProps) {
  const donePct =
    setsTotal > 0 ? Math.round((setsDone / setsTotal) * 100) : 0;
  return (
    <div className="pt-4" data-testid="session-hero">
      <Link
        href={`/workouts/${workoutId}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to workout
      </Link>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Session · {date}
      </p>
      <h1 className="mt-1 text-[22px] font-bold leading-tight tracking-tight">
        {workoutName}
      </h1>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatChip label="Sets" value={`${setsDone}/${setsTotal}`} />
        <StatChip label="Volume" value={`${volume.toLocaleString()}`} />
        <StatChip label="Done" value={`${donePct}%`} />
      </div>
    </div>
  );
}
