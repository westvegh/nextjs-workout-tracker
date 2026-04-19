import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionHero } from "./session-hero";

describe("SessionHero", () => {
  it("renders the eyebrow date, workout name, and three stat chips", () => {
    render(
      <SessionHero
        workoutId="w1"
        workoutName="Upper-body push"
        date="2026-04-19"
        setsDone={3}
        setsTotal={12}
        volume={4800}
      />
    );
    expect(screen.getByText("Session · 2026-04-19")).toBeTruthy();
    expect(screen.getByText("Upper-body push")).toBeTruthy();
    expect(screen.getByText("3/12")).toBeTruthy();
    expect(screen.getByText("4,800")).toBeTruthy();
    expect(screen.getByText("25%")).toBeTruthy();
  });

  it("renders 0% when no sets are done", () => {
    render(
      <SessionHero
        workoutId="w1"
        workoutName="x"
        date="2026-04-19"
        setsDone={0}
        setsTotal={5}
        volume={0}
      />
    );
    expect(screen.getByText("0%")).toBeTruthy();
  });

  it("renders 0% when setsTotal is 0 (no division by zero)", () => {
    render(
      <SessionHero
        workoutId="w1"
        workoutName="x"
        date="2026-04-19"
        setsDone={0}
        setsTotal={0}
        volume={0}
      />
    );
    expect(screen.getByText("0%")).toBeTruthy();
  });

  it("has a back link to the workout detail", () => {
    render(
      <SessionHero
        workoutId="w99"
        workoutName="x"
        date="2026-04-19"
        setsDone={0}
        setsTotal={0}
        volume={0}
      />
    );
    const link = screen.getByRole("link", { name: /back to workout/i });
    expect(link.getAttribute("href")).toBe("/workouts/w99");
  });
});
