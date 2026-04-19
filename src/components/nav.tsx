import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { createClient } from "@/lib/supabase/server";

const GITHUB_URL = "https://github.com/westvegh/nextjs-workout-tracker";

export async function Nav() {
  let email: string | null = null;

  // Supabase client throws when env vars are missing — degrade gracefully.
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? null;
  } catch {
    email = null;
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
        <Link
          href="/"
          className="font-semibold tracking-tight hover:opacity-80"
        >
          workout.next
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/exercises"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Exercises
          </Link>
          <Link
            href="/workouts"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Workouts
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            GitHub
          </a>
          <div className="ml-2">
            {email ? (
              <UserMenu email={email} />
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href="/auth/signin">Sign in</Link>
              </Button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
