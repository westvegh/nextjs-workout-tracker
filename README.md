# Next.js Workout Tracker

Ship a workout app in 30 minutes with [exerciseapi.dev](https://exerciseapi.dev).

A production-grade starter: Next.js 15 App Router, Supabase auth and database, shadcn/ui components, and 2,000+ annotated exercises from exerciseapi.dev. MIT licensed, fork it and run.

## Features

- Magic-link auth via Supabase
- Server-side API key handling (no key leaks to the browser)
- Exercise library powered by exerciseapi.dev (2,000+ exercises across 12 categories, with videos, instructions, muscles, equipment)
- Workout logging schema with row-level security
- shadcn/ui + Tailwind CSS v4
- Framework-portable: `src/lib/` and `src/components/ui/` have no Next.js dependencies, easy to port to Vite, Remix, or anywhere else

## Quick start

```bash
git clone https://github.com/westvegh/nextjs-workout-tracker.git
cd nextjs-workout-tracker
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

- `EXERCISEAPI_KEY` — get one at [exerciseapi.dev/dashboard](https://exerciseapi.dev/dashboard)
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your [Supabase project](https://supabase.com)

Apply the database schema:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Run it:

```bash
npm run dev
```

## Stack

- [Next.js 15](https://nextjs.org) App Router with server components
- [Supabase](https://supabase.com) Postgres, auth, SSR cookies
- [exerciseapi.dev](https://exerciseapi.dev) exercise catalog
- [shadcn/ui](https://ui.shadcn.com) new-york variant on zinc base
- [Tailwind CSS v4](https://tailwindcss.com)
- TypeScript strict mode

## Vibe coding

If you're iterating with an AI agent, copy the universal integration prompt from [exerciseapi.dev/#integration](https://exerciseapi.dev/#integration) and paste it into Cursor, Claude Code, or Codex. The prompt covers the API surface, auth headers, pagination, and error shapes — your agent will wire up exercises correctly the first time.

## Deployment

One-click deploy to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwestvegh%2Fnextjs-workout-tracker)

Set `EXERCISEAPI_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel env vars. `NEXT_PUBLIC_EXERCISEAPI_URL` defaults to the prod API and usually doesn't need to be set.

## Schema

```
auth.users (Supabase)
    |
    +-- profiles (id, name, user_exercise_api_key)
    |
    +-- workouts (date, name, status, notes, rating, timestamps)
           |
           +-- workout_exercises (exercise_id, exercise_name, muscle, equipment, order)
                  |
                  +-- exercise_sets (set_number, weight, weight_unit, reps, is_completed)
```

All tables have row-level security enabled. Users can only read and write their own rows. See `supabase/migrations/000_initial_schema.sql` for the full schema and policies.

`exercise_id` in `workout_exercises` is a string pointing at an exerciseapi.dev id — no local exercise table required. Cache the exercise metadata in your app or re-fetch on render; the API is fast.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Landing page |
| `/auth/signin` | Magic-link sign in |
| `/auth/callback` | Supabase OAuth callback |
| `/exercises` | Exercise browser |
| `/exercises/[id]` | Exercise detail |
| `/workouts` | Workout list |
| `/workouts/new` | Workout builder |
| `/workouts/[id]` | Workout detail |
| `/workouts/[id]/log` | Set logger |
| `/api/generate-workout` | Stub for AI workout generation |

## License

MIT. See [LICENSE](./LICENSE).

Built with [exerciseapi.dev](https://exerciseapi.dev).
