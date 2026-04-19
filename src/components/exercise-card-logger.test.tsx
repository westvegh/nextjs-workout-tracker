import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ExerciseCardLogger, type CardExerciseState } from "./exercise-card-logger";
import type { ExerciseHistory } from "@/lib/exercise-history";

function baseExercise(overrides: Partial<CardExerciseState> = {}): CardExerciseState {
  return {
    id: "ex-1",
    exercise_id: "bench",
    exercise_name: "Barbell Bench Press",
    muscle: "chest",
    equipment: "barbell",
    sets: [
      { set_number: 1, weight: "", weight_unit: "lbs", reps: "", is_completed: false },
      { set_number: 2, weight: "", weight_unit: "lbs", reps: "", is_completed: false },
    ],
    ...overrides,
  };
}

const ORIGINAL_FETCH = globalThis.fetch;

describe("ExerciseCardLogger", () => {
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it("renders name, chips, and the ordinal number in the gutter", () => {
    render(
      <ExerciseCardLogger
        exercise={baseExercise()}
        orderIndex={0}
        history={null}
        activeSetIdx={0}
        onUpdateSet={() => {}}
        onToggleSet={() => {}}
        onRemoveSet={() => {}}
        onAddSet={() => {}}
      />
    );
    expect(screen.getByText("Barbell Bench Press")).toBeTruthy();
    expect(screen.getByText("chest")).toBeTruthy();
    expect(screen.getByText("barbell")).toBeTruthy();
    // "01" appears both in the gutter ordinal and set_number. Both zero-padded.
    expect(screen.getAllByText("01").length).toBeGreaterThan(0);
  });

  it("renders DONE ✓ when every set is complete", () => {
    const ex = baseExercise({
      sets: [
        { set_number: 1, weight: "100", weight_unit: "lbs", reps: "10", is_completed: true },
        { set_number: 2, weight: "100", weight_unit: "lbs", reps: "10", is_completed: true },
      ],
    });
    render(
      <ExerciseCardLogger
        exercise={ex}
        orderIndex={0}
        history={null}
        activeSetIdx={null}
        onUpdateSet={() => {}}
        onToggleSet={() => {}}
        onRemoveSet={() => {}}
        onAddSet={() => {}}
      />
    );
    expect(screen.getByText(/Done/)).toBeTruthy();
  });

  it("renders the Last/PR row when history is provided", () => {
    const history: ExerciseHistory = {
      last: { weight: 185, reps: 8, date: "2026-04-14" },
      pr: { weight: 205, reps: 5, date: "2026-03-28" },
      history: [170, 175, 180, 180, 185, 185, 190],
    };
    render(
      <ExerciseCardLogger
        exercise={baseExercise()}
        orderIndex={0}
        history={history}
        activeSetIdx={0}
        onUpdateSet={() => {}}
        onToggleSet={() => {}}
        onRemoveSet={() => {}}
        onAddSet={() => {}}
      />
    );
    expect(screen.getByText("185 × 8")).toBeTruthy();
    expect(screen.getByText("205 × 5")).toBeTruthy();
  });

  it("fetches demo video lazily on first pill click", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;
      expect(url).toContain("/api/exercise-detail/bench");
      return new Response(
        JSON.stringify({ name: "Barbell Bench Press", videoUrl: "https://x/video.mp4" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    render(
      <ExerciseCardLogger
        exercise={baseExercise()}
        orderIndex={0}
        history={null}
        activeSetIdx={0}
        onUpdateSet={() => {}}
        onToggleSet={() => {}}
        onRemoveSet={() => {}}
        onAddSet={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /show demo/i }));
    await waitFor(() => {
      const video = document.querySelector("video");
      expect(video).not.toBeNull();
      expect(video!.getAttribute("src")).toBe("https://x/video.mp4");
    });
  });

  it("'Add set' triggers the handler", () => {
    const onAddSet = vi.fn();
    render(
      <ExerciseCardLogger
        exercise={baseExercise()}
        orderIndex={0}
        history={null}
        activeSetIdx={0}
        onUpdateSet={() => {}}
        onToggleSet={() => {}}
        onRemoveSet={() => {}}
        onAddSet={onAddSet}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /add set/i }));
    expect(onAddSet).toHaveBeenCalledOnce();
  });
});
