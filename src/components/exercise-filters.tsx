"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

interface ExerciseFiltersProps {
  muscles: string[];
  equipment: string[];
  categories: string[];
  initial: {
    search?: string;
    muscle?: string;
    equipment?: string;
    category?: string;
  };
}

const ALL = "__all__";

export function ExerciseFilters({
  muscles,
  equipment,
  categories,
  initial,
}: ExerciseFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initial.search ?? "");
  const [muscle, setMuscle] = useState(initial.muscle ?? ALL);
  const [equip, setEquip] = useState(initial.equipment ?? ALL);
  const [category, setCategory] = useState(initial.category ?? ALL);

  function apply(next: {
    search?: string;
    muscle?: string;
    equipment?: string;
    category?: string;
  }) {
    const params = new URLSearchParams();
    const s = next.search ?? search;
    const m = next.muscle ?? muscle;
    const e = next.equipment ?? equip;
    const c = next.category ?? category;
    if (s) params.set("search", s);
    if (m && m !== ALL) params.set("muscle", m);
    if (e && e !== ALL) params.set("equipment", e);
    if (c && c !== ALL) params.set("category", c);
    const qs = params.toString();
    router.push(qs ? `/exercises?${qs}` : "/exercises");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply({});
  }

  const hasActive = !!(
    search ||
    (muscle && muscle !== ALL) ||
    (equip && equip !== ALL) ||
    (category && category !== ALL)
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_160px_160px_160px_auto]"
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
