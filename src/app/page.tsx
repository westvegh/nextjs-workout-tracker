import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Next.js Workout Tracker
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          A vibecode-ready starter using exerciseapi.dev. Auth, exercise
          library, workout logging — fork it and ship.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <a
              href="https://exerciseapi.dev"
              target="_blank"
              rel="noreferrer"
            >
              Get your API key
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a
              href="https://github.com/westvegh/nextjs-workout-tracker"
              target="_blank"
              rel="noreferrer"
            >
              Fork on GitHub
            </a>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/exercises">Browse exercises</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
