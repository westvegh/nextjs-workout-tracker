import Link from "next/link";
import { UserMenu } from "@/components/user-menu";
import { NavCta } from "@/components/nav-cta";
import { createClient } from "@/lib/supabase/server";

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

  const isSignedIn = !!email;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-semibold tracking-tight hover:opacity-80"
          >
            Next.js Workout Tracker
          </Link>
          <nav className="hidden items-center gap-1 text-sm sm:flex">
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
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <NavCta isSignedIn={isSignedIn} />
          {email ? <UserMenu email={email} /> : null}
        </div>
      </div>
    </header>
  );
}
