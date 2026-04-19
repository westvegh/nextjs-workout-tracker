import { test } from "@playwright/test";

/**
 * Anon-to-signed-in import flow is hard to exercise end-to-end without real
 * magic-link email delivery + Supabase session mocking. Deferred until we
 * wire a proper session stub.
 *
 * TODO: mock Supabase session so we can simulate a just-signed-in user and
 * verify that localStorage workouts migrate into the RemoteStore.
 */
test.skip("anon→signed-in import (requires Supabase session mock)", async () => {
  // Intentionally skipped.
});
