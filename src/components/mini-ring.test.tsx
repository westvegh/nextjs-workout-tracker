import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MiniRing } from "./mini-ring";

function getOffset(container: HTMLElement): number {
  const fillCircle = container.querySelectorAll("circle")[1];
  return Number(fillCircle.getAttribute("stroke-dashoffset"));
}

describe("MiniRing", () => {
  it("renders a full track at progress=0 (offset === circumference)", () => {
    const { container } = render(<MiniRing size={24} stroke={2} progress={0} />);
    const radius = (24 - 2) / 2;
    const circumference = 2 * Math.PI * radius;
    expect(getOffset(container)).toBeCloseTo(circumference, 3);
  });

  it("renders a full fill at progress=1 (offset === 0)", () => {
    const { container } = render(<MiniRing size={24} stroke={2} progress={1} />);
    expect(getOffset(container)).toBeCloseTo(0, 3);
  });

  it("clamps progress > 1 to a full fill", () => {
    const { container } = render(<MiniRing size={24} stroke={2} progress={1.5} />);
    expect(getOffset(container)).toBeCloseTo(0, 3);
  });

  it("clamps progress < 0 to an empty ring", () => {
    const { container } = render(<MiniRing size={24} stroke={2} progress={-0.5} />);
    const radius = (24 - 2) / 2;
    const circumference = 2 * Math.PI * radius;
    expect(getOffset(container)).toBeCloseTo(circumference, 3);
  });
});
