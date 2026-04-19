import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ExercisePickerDialog } from "./exercise-picker-dialog";

// Minimal ApiExercise factory — the picker only reads name, primaryMuscles,
// equipment, and videos, so the rest can be empty.
function exercise(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "ex-1",
    name: "Example",
    keywords: [],
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: null,
    force: null,
    level: "beginner",
    mechanic: null,
    category: "strength",
    instructions: [],
    exerciseTips: [],
    commonMistakes: [],
    safetyInfo: "",
    overview: "",
    variations: [],
    images: [],
    videos: [],
    ...overrides,
  };
}

const ORIGINAL_FETCH = globalThis.fetch;

describe("ExercisePickerDialog loading state", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  async function openPicker() {
    render(<ExercisePickerDialog onAdd={() => {}} />);
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /^add exercise$/i })
      );
    });
  }

  it("shows skeleton rows while search is pending, then results replace them", async () => {
    // Freeze fetch so the loading state stays visible until we resolve.
    let resolveFetch!: (value: Response) => void;
    const pending = new Promise<Response>((r) => {
      resolveFetch = r;
    });
    globalThis.fetch = vi.fn(() => pending) as unknown as typeof fetch;

    await openPicker();

    const input = screen.getByPlaceholderText(/bench press/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: "bench press" } });
    });

    // Skeleton is visible BEFORE the debounce has even fired. This is the
    // guard against the "flash" — old results should never sit for the full
    // 200ms debounce window.
    expect(screen.getByTestId("picker-loading")).toBeTruthy();
    expect(screen.queryByText(/searching/i)).toBeTruthy();

    // Advance past the debounce, then resolve the fetch with real results.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
      resolveFetch(
        new Response(
          JSON.stringify({
            data: [
              exercise({
                id: "bp1",
                name: "Barbell Bench Press",
                primaryMuscles: ["pectoralis major sternal head"],
                equipment: "barbell",
              }),
            ],
          }),
          { headers: { "Content-Type": "application/json" } }
        )
      );
    });

    // Skeleton gone; real result rendered.
    expect(screen.queryByTestId("picker-loading")).toBeNull();
    expect(screen.getByText("Barbell Bench Press")).toBeTruthy();
  });

  it("does not show skeleton when the query is cleared (empty)", async () => {
    globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    await openPicker();

    const input = screen.getByPlaceholderText(/bench press/i);
    // First: type something, get the skeleton.
    await act(async () => {
      fireEvent.change(input, { target: { value: "bench" } });
    });
    expect(screen.getByTestId("picker-loading")).toBeTruthy();

    // Clear: skeleton disappears immediately, no fetch fires.
    await act(async () => {
      fireEvent.change(input, { target: { value: "" } });
    });
    expect(screen.queryByTestId("picker-loading")).toBeNull();
  });
});
