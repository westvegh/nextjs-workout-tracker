import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { SessionStickyBar } from "./session-sticky-bar";

describe("SessionStickyBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T14:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders mm:ss elapsed, workout name, and done/total", () => {
    const startedAt = Date.now() - 65_000;
    render(
      <SessionStickyBar
        startedAt={startedAt}
        workoutName="Upper-body push"
        done={2}
        total={10}
      />
    );
    expect(screen.getByText("1:05")).toBeTruthy();
    expect(screen.getByText("Upper-body push")).toBeTruthy();
    expect(screen.getByText("2/10")).toBeTruthy();
  });

  it("ticks the elapsed counter every second", () => {
    render(
      <SessionStickyBar
        startedAt={Date.now()}
        workoutName="w"
        done={0}
        total={5}
      />
    );
    expect(screen.getByText("0:00")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(7_000);
    });
    expect(screen.getByText("0:07")).toBeTruthy();
  });

  it("switches to h:mm:ss past an hour", () => {
    render(
      <SessionStickyBar
        startedAt={Date.now() - 3_661_000}
        workoutName="long"
        done={0}
        total={0}
      />
    );
    expect(screen.getByText("1:01:01")).toBeTruthy();
  });

  it("handles total=0 without dividing by zero", () => {
    const { container } = render(
      <SessionStickyBar
        startedAt={Date.now()}
        workoutName="w"
        done={0}
        total={0}
      />
    );
    const bar = container.querySelector("[style*='width']") as HTMLElement;
    expect(bar.style.width).toBe("0%");
  });
});
