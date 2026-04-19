"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Star, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/posthog/events";
import { cn } from "@/lib/utils";

export interface ExerciseFiltersValue {
  search: string;
  muscles: string[];
  equipment: string[];
  categories: string[];
  videos: boolean;
  favorites: boolean;
}

interface ExerciseFiltersProps {
  muscles: string[];
  equipment: string[];
  categories: string[];
  value: ExerciseFiltersValue;
  onChange: (next: ExerciseFiltersValue) => void;
  /** Whether the visitor has any starred exercises yet. Drives the visibility
   *  of the "Favorites" chip + clear affordance. */
  favoritesAvailable: boolean;
}

const VISITED_KEY = "wt_visited_exercises_v1";

export function ExerciseFilters({
  muscles,
  equipment,
  categories,
  value,
  onChange,
  favoritesAvailable,
}: ExerciseFiltersProps) {
  const [search, setSearch] = useState(value.search);

  // Lazy: first-time visitors default to Has-video ON, exactly like the old
  // select-based filters did. Reconcile once after mount if we flipped it.
  const firstVisitRef = useRef(false);
  useEffect(() => {
    if (firstVisitRef.current) return;
    firstVisitRef.current = true;
    if (typeof window === "undefined") return;
    if (value.videos) return;
    try {
      const visited = window.localStorage.getItem(VISITED_KEY) === "1";
      if (!visited) {
        window.localStorage.setItem(VISITED_KEY, "1");
        onChange({ ...value, videos: true });
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep local search in sync if value.search changes from the URL.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(value.search);
  }, [value.search]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onChange({ ...value, search });
  }

  function toggleIn(list: string[], item: string): string[] {
    return list.includes(item) ? list.filter((v) => v !== item) : [...list, item];
  }

  function clear() {
    setSearch("");
    onChange({
      search: "",
      muscles: [],
      equipment: [],
      categories: [],
      videos: false,
      favorites: false,
    });
  }

  const hasActive =
    value.search.length > 0 ||
    value.muscles.length > 0 ||
    value.equipment.length > 0 ||
    value.categories.length > 0 ||
    value.videos ||
    value.favorites;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search exercises"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onBlur={() => {
              if (search !== value.search) onChange({ ...value, search });
            }}
            className="pl-9"
          />
        </div>
        <Chip
          active={value.videos}
          onClick={() => {
            const next = !value.videos;
            track.videoFilterToggled(next);
            onChange({ ...value, videos: next });
          }}
        >
          Has video
        </Chip>
        {favoritesAvailable ? (
          <Chip
            active={value.favorites}
            onClick={() =>
              onChange({ ...value, favorites: !value.favorites })
            }
          >
            <Star
              className={cn(
                "h-3 w-3",
                value.favorites ? "fill-current" : ""
              )}
            />
            Favorites
          </Chip>
        ) : null}
        {hasActive ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="h-8"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        ) : null}
      </form>

      <ChipGroup
        label="Muscle"
        options={muscles}
        selected={value.muscles}
        onToggle={(item) =>
          onChange({ ...value, muscles: toggleIn(value.muscles, item) })
        }
      />
      <ChipGroup
        label="Equipment"
        options={equipment}
        selected={value.equipment}
        onToggle={(item) =>
          onChange({ ...value, equipment: toggleIn(value.equipment, item) })
        }
      />
      <ChipGroup
        label="Category"
        options={categories}
        selected={value.categories}
        onToggle={(item) =>
          onChange({ ...value, categories: toggleIn(value.categories, item) })
        }
      />
    </div>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1"
        style={{ scrollbarWidth: "thin" }}
      >
        {options.map((opt) => (
          <Chip
            key={opt}
            active={selected.includes(opt)}
            onClick={() => onToggle(opt)}
          >
            {opt}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
