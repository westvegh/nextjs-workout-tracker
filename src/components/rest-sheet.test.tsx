import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { RestSheet } from "./rest-sheet";

describe("RestSheet", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T14:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function defaultProps(overrides: Partial<React.ComponentProps<typeof RestSheet>> = {}) {
    return {
      startedAt: Date.now(),
      target: 90,
      nextLabel: "Dumbbell Shoulder Press · Set 2",
      onSkip: vi.fn(),
      onAdjust: vi.fn(),
      ...overrides,
    } satisfies React.ComponentProps<typeof RestSheet>;
  }

  it("renders the remaining countdown on mount", () => {
    render(<RestSheet {...defaultProps()} />);
    expect(screen.getByText("1:30")).toBeTruthy();
    expect(screen.getByText("Rest")).toBeTruthy();
    expect(screen.getByText(/Dumbbell Shoulder Press/)).toBeTruthy();
  });

  it("ticks the countdown each second", () => {
    render(<RestSheet {...defaultProps()} />);
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByText("1:25")).toBeTruthy();
  });

  it("switches to overrun when elapsed exceeds target", () => {
    render(<RestSheet {...defaultProps({ target: 10 })} />);
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(screen.getByText("+0:05")).toBeTruthy();
    expect(screen.getByText(/Overrun/i)).toBeTruthy();
  });

  it("invokes onSkip when the Skip button is clicked", () => {
    const onSkip = vi.fn();
    render(<RestSheet {...defaultProps({ onSkip })} />);
    fireEvent.click(screen.getByRole("button", { name: /skip rest/i }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("calls onAdjust with +15 / +30 / -15 when the pills are clicked", () => {
    const onAdjust = vi.fn();
    render(<RestSheet {...defaultProps({ onAdjust })} />);
    fireEvent.click(screen.getByText("+15s"));
    fireEvent.click(screen.getByText("+30s"));
    fireEvent.click(screen.getByText("-15s"));
    expect(onAdjust).toHaveBeenNthCalledWith(1, 15);
    expect(onAdjust).toHaveBeenNthCalledWith(2, 30);
    expect(onAdjust).toHaveBeenNthCalledWith(3, -15);
  });

  it("disables -15s when it would drop the target below the 15s floor", () => {
    render(<RestSheet {...defaultProps({ target: 15 })} />);
    const minus = screen.getByText("-15s") as HTMLButtonElement;
    expect(minus.disabled).toBe(true);
  });

  it("falls back to 'All sets done' when nextLabel is null", () => {
    render(<RestSheet {...defaultProps({ nextLabel: null })} />);
    expect(screen.getByText("All sets done")).toBeTruthy();
  });
});
