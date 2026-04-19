"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { SetupBanner } from "@/components/setup-banner";
import { getStore, type Workout } from "@/lib/workout-store";
import { FirstVisitTutorial } from "@/components/first-visit-tutorial";

const GUEST_BANNER_KEY = "wt_guest_banner_dismissed_v1";

type WorkoutRow = Workout & { exercise_count: number };

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function WorkoutsPage() {
  const hasSupabaseEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const [authLoaded, setAuthLoaded] = useState(!hasSupabaseEnv);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      return window.localStorage.getItem(GUEST_BANNER_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Resolve auth state on mount. Only runs when Supabase env is present;
  // otherwise authLoaded is already true and userId stays null.
  useEffect(() => {
    if (!hasSupabaseEnv) return;
    const client = createClient();
    let cancelled = false;
    client.auth
      .getUser()
      .then(({ data }) => {
        if (cancelled) return;
        setUserId(data.user?.id ?? null);
        setAuthLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setAuthLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hasSupabaseEnv]);

  // Fetch workouts once auth is known.
  useEffect(() => {
    if (!authLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const store = await getStore(userId);
        const rows = await store.listWorkouts();
        if (cancelled) return;
        setWorkouts(rows as WorkoutRow[]);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load workouts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoaded, userId]);

  function dismissBanner() {
    setBannerDismissed(true);
    try {
      window.localStorage.setItem(GUEST_BANNER_KEY, "true");
    } catch {
      // Non-fatal.
    }
  }

  if (!hasSupabaseEnv) {
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

  const showGuestBanner = authLoaded && !userId && !bannerDismissed;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      {authLoaded && !userId ? <FirstVisitTutorial /> : null}
      {showGuestBanner ? (
        <div className="mb-6 flex items-start justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <p>
            Browsing as a guest. Your workouts live on this device.{" "}
            <Link
              href="/auth/signin"
              className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
            >
              Sign up
            </Link>{" "}
            to save across devices.
          </p>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Dismiss"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Workouts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your training log.</p>
        </div>
        <Button asChild>
          <Link href="/workouts/new">
            <Plus className="h-4 w-4" />
            New workout
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="mt-12 rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Loading your workouts…
        </div>
      ) : error ? (
        <div className="mt-10 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error}
        </div>
      ) : workouts.length === 0 ? (
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
          {workouts.map((w) => (
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
                    {w.exercise_count} exercise{w.exercise_count === 1 ? "" : "s"}
                  </div>
                  {w.notes ? (
                    <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
                      {w.notes}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
