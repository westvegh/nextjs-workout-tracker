import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { RestTimerBanner } from "./rest-timer-banner";

describe("RestTimerBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders 0:00 at start", () => {
    render(<RestTimerBanner startedAt={Date.now()} onDismiss={() => {}} />);
    expect(screen.getByText("0:00")).toBeTruthy();
  });

  it("ticks elapsed time every second", () => {
    render(<RestTimerBanner startedAt={Date.now()} onDismiss={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByText("0:05")).toBeTruthy();
  });

  it("switches to warning color past 3 minutes", () => {
    render(<RestTimerBanner startedAt={Date.now()} onDismiss={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(181_000);
    });
    const time = screen.getByText("3:01");
    expect(time.className).toContain("text-destructive");
  });

  it("stays in the normal color at exactly 2:59", () => {
    render(<RestTimerBanner startedAt={Date.now()} onDismiss={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(179_000);
    });
    const time = screen.getByText("2:59");
    expect(time.className).toContain("text-foreground");
  });

  it("calls onDismiss when the X is pressed", () => {
    const onDismiss = vi.fn();
    render(<RestTimerBanner startedAt={Date.now()} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
