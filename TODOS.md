# TODOS

## Signed-in UX

### Seed example workouts for fresh Supabase accounts

**Priority:** P1

When a user signs in without having first browsed anonymously (new account on a clean browser, or the migration path at `/auth/welcome` yields zero rows), they land on `/workouts` and see "No workouts yet." Bad first impression.

**Current state:**
- `LocalStore.seedIfEmpty()` at `src/lib/workout-store-local.ts:486` runs for anon visitors from `getStore(null)` → `src/lib/workout-store.ts:158`.
- `/auth/welcome` at `src/app/auth/welcome/page.tsx:84` calls `localStore.importToSupabase(remoteStore)` to migrate localStorage workouts (including seeds) into Supabase.
- `RemoteStore` never self-seeds.

**Fix sketch:**
1. Add `seedIfEmpty()` to `RemoteStore` (mirror `LocalStore` behavior against Supabase).
2. In `/auth/welcome`, after `importToSupabase` returns, if `result.importedCount === 0` AND the target Supabase account has zero existing workouts, call `remoteStore.seedIfEmpty()`.
3. Gate on the `wt_just_signed_in` cookie so we only seed on fresh sign-ins, not re-visits.

Covers all three entry paths (anon-with-work → sign in, anon-empty → sign in, direct sign in without anon visit).

## Completed
