"use client";

import { useCallback, useEffect, useState } from "react";

export const FAVORITES_KEY = "wt_favorite_exercises_v1";

function readFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((v): v is string => typeof v === "string"));
    }
    return new Set();
  } catch {
    return new Set();
  }
}

function writeFavorites(set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(Array.from(set))
    );
  } catch {
    // Non-fatal: storage quota / private mode. Favorites just won't persist.
  }
}

/**
 * Client-side favorites store backed by localStorage. Returns the set of
 * favorite ids, a toggle function, and a boolean check.
 *
 * We sync across tabs via the `storage` event so clicking the star in one
 * tab updates the others.
 */
export function useExerciseFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hydrate from localStorage on mount; reads a browser API not available
    // server-side. Block-disable the set-state-in-effect rule for the block.
    /* eslint-disable react-hooks/set-state-in-effect */
    setFavorites(readFavorites());
    setHydrated(true);

    function onStorage(event: StorageEvent) {
      if (event.key !== FAVORITES_KEY) return;
      setFavorites(readFavorites());
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.has(id),
    [favorites]
  );

  return { favorites, toggle, isFavorite, hydrated };
}
