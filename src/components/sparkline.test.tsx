import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Sparkline } from "./sparkline";

describe("Sparkline", () => {
  it("returns null for an empty array", () => {
    const { container } = render(<Sparkline values={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null for a single value (no trend to draw)", () => {
    const { container } = render(<Sparkline values={[100]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a polyline with one point per value", () => {
    const { container } = render(<Sparkline values={[100, 110, 120]} />);
    const polyline = container.querySelector("polyline");
    expect(polyline).not.toBeNull();
    const points = polyline!.getAttribute("points")!.trim().split(/\s+/);
    expect(points).toHaveLength(3);
  });

  it("handles a flat series without dividing by zero", () => {
    const { container } = render(<Sparkline values={[100, 100, 100]} />);
    const polyline = container.querySelector("polyline");
    expect(polyline).not.toBeNull();
    const yValues = polyline!
      .getAttribute("points")!
      .trim()
      .split(/\s+/)
      .map((p) => Number(p.split(",")[1]));
    for (const y of yValues) expect(Number.isFinite(y)).toBe(true);
  });

  it("places the endpoint dot at the last value", () => {
    const { container } = render(<Sparkline values={[100, 200, 150]} />);
    const circle = container.querySelector("circle");
    expect(circle).not.toBeNull();
    const cx = Number(circle!.getAttribute("cx"));
    expect(cx).toBeCloseTo(64, 1);
  });
});
