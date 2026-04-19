"use client";

/**
 * Recently-used exercises — localStorage-backed list of the last 10 exercise
 * ids used (last-picked first). Used by the exercise picker to surface the
 * user's recents above the live search so adding the same bench press across
 * workouts is a one-tap action.
 */

import { useCallback, useEffect, useState } from "react";

export const RECENT_KEY = "wt_recent_exercises_v1";
const MAX_RECENT = 10;

function readRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

function writeRecents(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(ids));
  } catch {
    // quota / private mode — recents are a nice-to-have.
  }
}

/**
 * Push an exercise id to the front of the recents list (or move it if
 * present) and trim to MAX_RECENT. Returns the new list.
 */
export function pushRecent(id: string): string[] {
  if (typeof window === "undefined") return [];
  const current = readRecents();
  const next = [id, ...current.filter((existing) => existing !== id)].slice(
    0,
    MAX_RECENT
  );
  writeRecents(next);
  return next;
}

/**
 * Hook that reflects the current recents list plus a record function. Syncs
 * across tabs via the storage event.
 */
export function useRecentExercises() {
  const [recents, setRecents] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecents(readRecents());
    setHydrated(true);

    function onStorage(event: StorageEvent) {
      if (event.key !== RECENT_KEY) return;
      setRecents(readRecents());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const record = useCallback((id: string) => {
    setRecents(pushRecent(id));
  }, []);

  return { recents, record, hydrated };
}
