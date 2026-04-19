import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { SetupBanner } from "@/components/setup-banner";

interface WorkoutRow {
  id: string;
  name: string | null;
  date: string;
  status: string | null;
  notes: string | null;
  workout_exercises: { count: number }[];
}

function formatDate(iso: string): string {
  // Keep DB date (YYYY-MM-DD) stable across server/client render — format as UTC.
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function WorkoutsPage() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Workouts</h1>
        <div className="mt-8">
          <SetupBanner
            title="Supabase not configured"
            envVar="NEXT_PUBLIC_SUPABASE_URL"
            description="Sign in and workout tracking require a Supabase project. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local."
          />
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Workouts</h1>
        <p className="mt-3 text-muted-foreground">
          Sign in to track workouts, log sets, and keep a history.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href="/auth/signin">Sign in</Link>
          </Button>
        </div>
      </main>
    );
  }

  const { data: workouts, error } = await supabase
    .from("workouts")
    .select(
      "id, name, date, status, notes, workout_exercises(count)"
    )
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Workouts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your training log.
          </p>
        </div>
        <Button asChild>
          <Link href="/workouts/new">
            <Plus className="h-4 w-4" />
            New workout
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="mt-10 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error.message}
        </div>
      ) : !workouts || workouts.length === 0 ? (
        <div className="mt-12 rounded-lg border border-dashed p-12 text-center">
          <h2 className="font-medium">No workouts yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Build your first workout from the exercise catalog.
          </p>
          <Button asChild size="sm" className="mt-6">
            <Link href="/workouts/new">Create your first</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-8 divide-y rounded-lg border bg-card">
          {(workouts as unknown as WorkoutRow[]).map((w) => {
            const count = w.workout_exercises?.[0]?.count ?? 0;
            return (
              <li key={w.id}>
                <Link
                  href={`/workouts/${w.id}`}
                  className="flex items-start justify-between gap-4 p-5 transition-colors hover:bg-accent/40"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium">
                        {w.name || "Unnamed workout"}
                      </span>
                      <StatusBadge status={w.status} />
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {formatDate(w.date)}
                      <span className="mx-2">·</span>
                      {count} exercise{count === 1 ? "" : "s"}
                    </div>
                    {w.notes ? (
                      <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
                        {w.notes}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
