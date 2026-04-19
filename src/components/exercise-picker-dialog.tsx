"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ApiExercise } from "@/lib/exercise-api/types";

export interface PickerResult {
  id: string;
  name: string;
  muscle: string | null;
  equipment: string | null;
  videoUrl?: string | null;
}

interface ExercisePickerDialogProps {
  onAdd: (exercise: PickerResult) => void;
  trigger?: React.ReactNode;
}

export function ExercisePickerDialog({
  onAdd,
  trigger,
}: ExercisePickerDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/search-exercises?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? `Search failed (${response.status})`);
        }
        const body = await response.json();
        setResults(body.data ?? []);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [open, query]);

  function handleAdd(ex: ApiExercise) {
    onAdd({
      id: ex.id,
      name: ex.name,
      muscle: ex.primaryMuscles[0] ?? null,
      equipment: ex.equipment,
      videoUrl: ex.videos?.[0]?.url ?? null,
    });
    setOpen(false);
    setQuery("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline">Add exercise</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add exercise</DialogTitle>
          <DialogDescription>
            Search the exerciseapi.dev catalog.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            type="search"
            placeholder="Bench press, squat, curl..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="max-h-80 overflow-y-auto rounded-md border">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-destructive">{error}</div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {query ? "No matches." : "Start typing to search."}
            </div>
          ) : (
            <ul className="divide-y">
              {results.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => handleAdd(ex)}
                    className="flex w-full items-start justify-between gap-3 p-3 text-left transition-colors hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">{ex.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {ex.primaryMuscles[0] ?? "—"}
                        {ex.equipment ? ` · ${ex.equipment}` : ""}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Add
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
