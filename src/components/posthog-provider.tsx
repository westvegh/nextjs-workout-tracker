"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/posthog/events";

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const pathname = usePathname();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: true,
      capture_pageleave: true,
      person_profiles: "identified_only",
      autocapture: false,
    });

    function handleError(event: ErrorEvent) {
      const err = event.error;
      const message = typeof event.message === "string" ? event.message : "";
      const name =
        err && typeof err === "object" && "name" in err
          ? String((err as { name?: string }).name)
          : "";
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: string }).code)
          : "";
      const isStoreError =
        name === "StoreError" || message.includes("StoreError");
      if (isStoreError) {
        track.localStorageError(code || "unknown");
      }
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      if (!reason || typeof reason !== "object") return;
      const name =
        "name" in reason ? String((reason as { name?: string }).name) : "";
      const message =
        "message" in reason
          ? String((reason as { message?: string }).message ?? "")
          : "";
      const code =
        "code" in reason ? String((reason as { code?: string }).code ?? "") : "";
      const isStoreError =
        name === "StoreError" || message.includes("StoreError");
      if (isStoreError) {
        track.localStorageError(code || "unknown");
      }
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  useEffect(() => {
    if (!pathname) return;
    track.demoViewed(pathname);
  }, [pathname]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
