import Link from "next/link";
import { unstable_cache } from "next/cache";
import { ArrowRight, Database, Lock, PlayCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeaturedMovementCard } from "@/components/featured-movement-card";
import { fetchExercises } from "@/lib/exercise-api/client";
import type { ApiExercise } from "@/lib/exercise-api/types";

// ISR — let Next.js serve cached HTML between revalidations so most visitors
// don't re-run the server component at all.
export const revalidate = 60;

const GITHUB_URL = "https://github.com/westvegh/nextjs-workout-tracker";
const API_URL = "https://exerciseapi.dev";
const FEATURED_PAGE_SIZE = 100;
const FEATURED_MAX_PAGES = 25;
const FEATURED_CARDS = 8;

const FEATURES = [
  {
    icon: Database,
    title: "2,000+ exercises",
    body: "Annotated catalog across 12 categories. Primary and secondary muscles, equipment, level, force, mechanic.",
  },
  {
    icon: PlayCircle,
    title: "Videos + instructions",
    body: "Every exercise ships with demo video, step-by-step instructions, tips, common mistakes, and safety info.",
  },
  {
    icon: Lock,
    title: "Supabase auth + RLS",
    body: "Magic-link sign in, server-side sessions, row-level security. Users can only ever see their own data.",
  },
  {
    icon: Sparkles,
    title: "MCP-ready",
    body: "API key reads from a standard env var. Drop the MCP server into Claude or Cursor and let the agent wire up exercises.",
  },
];

const SCHEMA_TREE = `auth.users (Supabase)
    |
    +-- profiles (id, name, user_exercise_api_key)
    |
    +-- workouts (date, name, status, notes, rating, timestamps)
           |
           +-- workout_exercises (exercise_id, exercise_name, muscle, equipment, order)
                  |
                  +-- exercise_sets (set_number, weight, weight_unit, reps, is_completed)`;

// Only ~8 of 2,198 exercises carry videos today, and they're scattered
// alphabetically. The loop walks up to 25 pages of 100 to collect them, which
// is expensive enough (2-3s cold) that we must not repeat it per request.
// unstable_cache caches the result across all home renders on this Vercel
// instance. The inner fetchExercises calls are individually cached too (see
// lib/exercise-api/client.ts), so even a cold walk after cache eviction is
// quick on the second visit. Invalidate via `revalidateTag("exerciseapi-exercises")`
// when new videos land.
// TODO: when upstream adds ?has_video=1, replace this walk with a single call.
const loadFeaturedMovements = unstable_cache(
  async (): Promise<ApiExercise[]> => {
    if (!process.env.EXERCISEAPI_KEY) return [];
    const found: ApiExercise[] = [];
    try {
      for (let page = 0; page < FEATURED_MAX_PAGES; page++) {
        const resp = await fetchExercises({
          limit: FEATURED_PAGE_SIZE,
          offset: page * FEATURED_PAGE_SIZE,
        });
        for (const ex of resp.data) {
          if (Array.isArray(ex.videos) && ex.videos.length > 0) {
            found.push(ex);
            if (found.length >= FEATURED_CARDS) return found;
          }
        }
        if (resp.data.length < FEATURED_PAGE_SIZE) break;
      }
    } catch {
      return found;
    }
    return found;
  },
  ["featured-movements-v1"],
  { revalidate: 3600, tags: ["exerciseapi-exercises"] }
);

export default async function Home() {
  const featured = await loadFeaturedMovements();

  return (
    <main className="flex-1">
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              </span>
              Open source starter
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              A workout tracker you can fork in 30 minutes.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Next.js App Router, Supabase auth with row-level security, and
              2,000+ annotated exercises from exerciseapi.dev. Production-grade
              defaults, ready to ship.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                  Fork on GitHub
                  <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={`${API_URL}/dashboard`} target="_blank" rel="noreferrer">
                  Get your API key
                </a>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/exercises">Browse exercises</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="border-b">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  See it in action
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  A sample of the video-backed exercises in the catalog. Hover
                  to preview, click to see the full detail page.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/exercises?videos=1">
                  Browse all videos
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-4 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((ex) => (
                <FeaturedMovementCard
                  key={ex.id}
                  id={ex.id}
                  name={ex.name}
                  primaryMuscle={ex.primaryMuscles[0] ?? null}
                  equipment={ex.equipment}
                  videoUrl={ex.videos[0].url}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-lg border bg-card p-6 transition-colors hover:border-foreground/20"
              >
                <Icon className="h-5 w-5 text-foreground" />
                <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Schema you can actually read.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Four tables. Row-level security enabled on all of them. Every
                foreign key cascades on delete. No ORM, just SQL you own.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  exercise_id
                </code>{" "}
                is a string pointing at an exerciseapi.dev id &mdash; no local
                exercise table required.
              </p>
            </div>
            <pre className="lg:col-span-3 overflow-x-auto rounded-lg border bg-muted/40 p-6 text-xs leading-relaxed">
              <code>{SCHEMA_TREE}</code>
            </pre>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="rounded-xl border bg-card p-8 sm:p-12">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to ship your workout app?
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Clone the repo, drop in your exerciseapi.dev key and Supabase
              credentials, and you&apos;re live. MIT licensed.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                  git clone
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={API_URL} target="_blank" rel="noreferrer">
                  exerciseapi.dev
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
