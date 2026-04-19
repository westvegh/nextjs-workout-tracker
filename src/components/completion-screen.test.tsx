import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CompletionScreen } from "./completion-screen";

const EXERCISES = [
  {
    id: "ex1",
    name: "Barbell Bench Press",
    sets: [
      { weight: "185", reps: "8", weight_unit: "lbs" as const },
      { weight: "185", reps: "8", weight_unit: "lbs" as const },
    ],
    volume: 2960,
  },
];

describe("CompletionScreen", () => {
  it("renders the four stat blocks and the completion headline", () => {
    render(
      <CompletionScreen
        workoutName="Upper-body push"
        durationMinutes={42}
        totalVolume={8250}
        setsDone={12}
        newPRs={2}
        exercises={EXERCISES}
        onFinish={() => {}}
        finishing={false}
      />
    );
    expect(screen.getByText(/Nice work/i)).toBeTruthy();
    expect(screen.getByText("Upper-body push")).toBeTruthy();
    expect(screen.getByText("42m")).toBeTruthy();
    expect(screen.getByText("8,250")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("renders the per-exercise set summary as W×R · W×R", () => {
    render(
      <CompletionScreen
        workoutName="x"
        durationMinutes={0}
        totalVolume={0}
        setsDone={0}
        newPRs={0}
        exercises={EXERCISES}
        onFinish={() => {}}
        finishing={false}
      />
    );
    expect(screen.getByText("185×8 · 185×8")).toBeTruthy();
  });

  it("invokes onFinish when 'Back to workouts' is clicked", () => {
    const onFinish = vi.fn();
    render(
      <CompletionScreen
        workoutName="x"
        durationMinutes={0}
        totalVolume={0}
        setsDone={0}
        newPRs={0}
        exercises={[]}
        onFinish={onFinish}
        finishing={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /back to workouts/i }));
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it("disables the finish button and shows 'Finishing…' while in flight", () => {
    render(
      <CompletionScreen
        workoutName="x"
        durationMinutes={0}
        totalVolume={0}
        setsDone={0}
        newPRs={0}
        exercises={[]}
        onFinish={() => {}}
        finishing={true}
      />
    );
    const btn = screen.getByRole("button", { name: /finishing/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("links 'Log another' to /workouts/new", () => {
    render(
      <CompletionScreen
        workoutName="x"
        durationMinutes={0}
        totalVolume={0}
        setsDone={0}
        newPRs={0}
        exercises={[]}
        onFinish={() => {}}
        finishing={false}
      />
    );
    const link = screen.getByRole("link", { name: /log another/i });
    expect(link.getAttribute("href")).toBe("/workouts/new");
  });
});
