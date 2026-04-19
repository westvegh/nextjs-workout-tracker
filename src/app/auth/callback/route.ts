import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/workouts";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/signin?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    // Hand off to the client-side welcome page so it can import any guest
    // workouts that live in localStorage. The short-lived cookie tells it
    // this was a real just-now sign-in and not a random visit.
    const welcomeUrl = new URL(`${origin}/auth/welcome`);
    welcomeUrl.searchParams.set("next", next);
    const response = NextResponse.redirect(welcomeUrl);
    response.cookies.set("wt_just_signed_in", "1", {
      maxAge: 30,
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  return NextResponse.redirect(`${origin}/auth/signin?error=callback`);
}
