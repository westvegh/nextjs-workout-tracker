"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { track } from "@/lib/posthog/events";

interface ExerciseFiltersProps {
  muscles: string[];
  equipment: string[];
  categories: string[];
  initial: {
    search?: string;
    muscle?: string;
    equipment?: string;
    category?: string;
    videos?: boolean;
  };
}

const ALL = "__all__";
const VISITED_KEY = "wt_visited_exercises_v1";

export function ExerciseFilters({
  muscles,
  equipment,
  categories,
  initial,
}: ExerciseFiltersProps) {
  const router = useRouter();
  // Lazy state initializer: on the first client render, if the visitor has
  // never been here and the URL doesn't specify the videos filter, default it
  // to ON and remember the visit. Runs exactly once per mount, no effects.
  const [videos, setVideos] = useState<boolean>(() => {
    if (typeof window === "undefined") return Boolean(initial.videos);
    if (initial.videos !== undefined) return Boolean(initial.videos);
    try {
      const visited = window.localStorage.getItem(VISITED_KEY) === "1";
      if (!visited) {
        window.localStorage.setItem(VISITED_KEY, "1");
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  });
  const [search, setSearch] = useState(initial.search ?? "");
  const [muscle, setMuscle] = useState(initial.muscle ?? ALL);
  const [equip, setEquip] = useState(initial.equipment ?? ALL);
  const [category, setCategory] = useState(initial.category ?? ALL);

  // When the lazy initializer flipped videos on for a first-time visitor, the
  // URL doesn't yet reflect the filter. Reconcile once after mount so the
  // rendered list + URL agree.
  const reconciledRef = useRef(false);
  useEffect(() => {
    if (reconciledRef.current) return;
    reconciledRef.current = true;
    if (videos && initial.videos === undefined) {
      const params = buildParams({
        search,
        muscle,
        equipment: equip,
        category,
        videos: true,
      });
      router.replace(params ? `/exercises?${params}` : "/exercises");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildParams(next: {
    search?: string;
    muscle?: string;
    equipment?: string;
    category?: string;
    videos?: boolean;
  }): string {
    const params = new URLSearchParams();
    const s = next.search ?? search;
    const m = next.muscle ?? muscle;
    const e = next.equipment ?? equip;
    const c = next.category ?? category;
    const v = next.videos ?? videos;
    if (s) params.set("search", s);
    if (m && m !== ALL) params.set("muscle", m);
    if (e && e !== ALL) params.set("equipment", e);
    if (c && c !== ALL) params.set("category", c);
    if (v) params.set("videos", "1");
    return params.toString();
  }

  function apply(next: {
    search?: string;
    muscle?: string;
    equipment?: string;
    category?: string;
    videos?: boolean;
  }) {
    const qs = buildParams(next);
    router.push(qs ? `/exercises?${qs}` : "/exercises");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply({});
  }

  function handleVideosChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.checked;
    setVideos(next);
    track.videoFilterToggled(next);
    apply({ videos: next });
  }

  const hasActive = !!(
    search ||
    (muscle && muscle !== ALL) ||
    (equip && equip !== ALL) ||
    (category && category !== ALL) ||
    videos
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_160px_160px_160px_auto_auto]"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search exercises"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
        />
      </div>
      <FilterSelect
        label="Muscle"
        value={muscle}
        options={muscles}
        onChange={(v) => {
          setMuscle(v);
          apply({ muscle: v });
        }}
      />
      <FilterSelect
        label="Equipment"
        value={equip}
        options={equipment}
        onChange={(v) => {
          setEquip(v);
          apply({ equipment: v });
        }}
      />
      <FilterSelect
        label="Category"
        value={category}
        options={categories}
        onChange={(v) => {
          setCategory(v);
          apply({ category: v });
        }}
      />
      <label className="inline-flex items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <input
          type="checkbox"
          checked={videos}
          onChange={handleVideosChange}
          className="h-4 w-4 rounded border-input"
          aria-label="Only exercises with video"
        />
        Has video
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="default">
          Search
        </Button>
        {hasActive ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setSearch("");
              setMuscle(ALL);
              setEquip(ALL);
              setCategory(ALL);
              setVideos(false);
              router.push("/exercises");
            }}
            aria-label="Clear filters"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </form>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt} className="capitalize">
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
