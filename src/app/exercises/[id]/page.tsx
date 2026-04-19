import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchExercise } from "@/lib/exercise-api/client";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { SetupBanner } from "@/components/setup-banner";

type Params = Promise<{ id: string }>;

export default async function ExerciseDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  if (!process.env.EXERCISEAPI_KEY) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <SetupBanner
          title="Exercise API key missing"
          envVar="EXERCISEAPI_KEY"
          description={
            <>
              Get yours at{" "}
              <a
                href="https://exerciseapi.dev/dashboard"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline-offset-4 hover:underline"
              >
                exerciseapi.dev/dashboard
              </a>
              .
            </>
          }
        />
      </main>
    );
  }

  let exercise: Awaited<ReturnType<typeof fetchExercise>> = null;
  let loadError: string | null = null;
  try {
    exercise = await fetchExercise(id);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Failed to load exercise.";
  }

  if (loadError) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {loadError}
        </div>
      </main>
    );
  }

  if (!exercise) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Exercise not found
        </h1>
        <p className="mt-2 text-muted-foreground">
          No exercise exists with id <code>{id}</code>.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/exercises">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to browser
          </Link>
        </Button>
      </main>
    );
  }

  // Auth state controls the CTA; never throw the page if Supabase envs are missing.
  let isLoggedIn = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    isLoggedIn = !!data.user;
  } catch {
    isLoggedIn = false;
  }

  const video = exercise.videos[0];
  const image = exercise.images[0];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <Link
        href="/exercises"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All exercises
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {exercise.name}
          </h1>
          {exercise.overview ? (
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {exercise.overview}
            </p>
          ) : null}
        </div>
        {isLoggedIn ? (
          <Button asChild>
            <Link href={`/workouts/new?exerciseId=${exercise.id}`}>
              Add to workout
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/auth/signin">Sign in to add</Link>
          </Button>
        )}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {video ? (
            <video
              src={video.url}
              controls
              autoPlay
              muted
              loop
              playsInline
              className="w-full rounded-lg border bg-black"
            />
          ) : image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={exercise.name}
              className="w-full rounded-lg border bg-muted"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
              No media available
            </div>
          )}
        </div>

        <aside className="space-y-6 lg:col-span-2">
          <MetaBlock exercise={exercise} />

          {exercise.instructions.length > 0 ? (
            <Section title="Instructions">
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground">
                {exercise.instructions.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </Section>
          ) : null}

          {exercise.exerciseTips.length > 0 ? (
            <Section title="Tips">
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                {exercise.exerciseTips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {exercise.commonMistakes.length > 0 ? (
            <Section title="Common mistakes">
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                {exercise.commonMistakes.map((mistake, idx) => (
                  <li key={idx}>{mistake}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {exercise.safetyInfo ? (
            <Section title="Safety">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {exercise.safetyInfo}
              </p>
            </Section>
          ) : null}

          {exercise.variations.length > 0 ? (
            <Section title="Variations">
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                {exercise.variations.map((v, idx) => (
                  <li key={idx}>{v}</li>
                ))}
              </ul>
            </Section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function MetaBlock({
  exercise,
}: {
  exercise: NonNullable<Awaited<ReturnType<typeof fetchExercise>>>;
}) {
  const metaItems: Array<{ label: string; value: string | null }> = [
    { label: "Category", value: exercise.category },
    { label: "Level", value: exercise.level },
    { label: "Force", value: exercise.force },
    { label: "Mechanic", value: exercise.mechanic },
    { label: "Equipment", value: exercise.equipment },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {exercise.primaryMuscles.map((m) => (
          <Badge key={`p-${m}`} variant="default">
            {m}
          </Badge>
        ))}
        {exercise.secondaryMuscles.map((m) => (
          <Badge key={`s-${m}`} variant="outline">
            {m}
          </Badge>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-y-3 rounded-lg border bg-card p-4 text-sm">
        {metaItems.map(({ label, value }) =>
          value ? (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="capitalize text-foreground">{value}</dd>
            </div>
          ) : null
        )}
      </dl>
    </div>
  );
}
