"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isStorageAvailable } from "@/lib/workout-store";

type Status = "working" | "done" | "partial" | "error";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/[-.]/g, "\\$&") + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function clearCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

export default function AuthWelcomePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Signing you in…</h1>
        </main>
      }
    >
      <AuthWelcomeInner />
    </Suspense>
  );
}

function AuthWelcomeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/workouts";

  const [status, setStatus] = useState<Status>("working");
  const [message, setMessage] = useState<string>("Signing you in…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // If the short-lived cookie is missing we came here out of band — just
      // bounce to the intended destination without trying to import anything.
      const cookie = readCookie("wt_just_signed_in");
      if (!cookie) {
        router.replace(next);
        return;
      }
      clearCookie("wt_just_signed_in");

      if (!isStorageAvailable()) {
        if (!cancelled) router.replace(next);
        return;
      }

      // Lazy-import the store so we never pull the localStorage module into
      // an SSR codepath.
      const { LocalStore } = await import("@/lib/workout-store-local");
      const { RemoteStore } = await import("@/lib/workout-store-remote");

      const localStore = new LocalStore();
      let localCount = 0;
      try {
        const list = await localStore.listWorkouts();
        localCount = list.length;
      } catch {
        localCount = 0;
      }

      if (localCount === 0) {
        if (!cancelled) router.replace(next);
        return;
      }

      const remoteStore = new RemoteStore();

      try {
        const result = await localStore.importToSupabase(remoteStore);
        if (cancelled) return;
        setStatus("done");
        setMessage(
          result.imported === 0
            ? "Welcome back."
            : `Welcome! Imported ${result.imported} guest workout${
                result.imported === 1 ? "" : "s"
              } to your account.`
        );
        setTimeout(() => {
          if (!cancelled) router.replace(next);
        }, 1200);
      } catch (err) {
        if (cancelled) return;
        const partial =
          err && typeof err === "object" && "cause" in err
            ? (err as { cause?: { imported?: number; failed?: number } }).cause
            : undefined;
        const imported = partial?.imported ?? 0;
        const failed = partial?.failed ?? 0;
        setStatus("partial");
        setMessage(
          `Imported ${imported}. ${failed} workout${
            failed === 1 ? "" : "s"
          } couldn't be imported and are still saved locally.`
        );
        setTimeout(() => {
          if (!cancelled) router.replace(next);
        }, 2400);
      }
    }

    run().catch(() => {
      if (!cancelled) {
        setStatus("error");
        setMessage("We signed you in but couldn't finish the import.");
        setTimeout(() => router.replace(next), 2000);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router, next]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {status === "working" ? "Signing you in…" : "Welcome"}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
