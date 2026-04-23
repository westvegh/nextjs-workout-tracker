"use client";
import posthog from "posthog-js";

export function capture(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}

export function identifyUser(userId: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  posthog.identify(userId, props);
}
