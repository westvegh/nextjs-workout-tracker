import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// Only refresh the Supabase session on routes that actually depend on auth
// state. The prior everything-except-static matcher added a Supabase network
// round-trip to every anon pageload on `/`, `/exercises`, `/exercises/[id]`,
// and the public list/search API routes — for zero benefit, since those paths
// don't read user data. `/auth/*` stays matched so magic-link callbacks and
// sign-out can rotate the session cookie. The API exclusions pass through
// anon proxy endpoints (list-exercises, search-exercises, exercise-detail).
export const config = {
  matcher: [
    "/workouts/:path*",
    "/auth/:path*",
    "/api/((?!list-exercises|search-exercises|exercise-detail).*)",
  ],
};
