import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlashBadge } from "./flash-badge";

describe("FlashBadge", () => {
  it("renders nothing when flash is null", () => {
    render(<FlashBadge flash={null} />);
    expect(screen.queryByTestId("flash-badge")).toBeNull();
  });

  it("renders text and subtext when flash is set", () => {
    render(
      <FlashBadge flash={{ text: "Set logged", subtext: "Rest 90s", ts: 1 }} />
    );
    expect(screen.getByTestId("flash-badge")).toBeTruthy();
    expect(screen.getByText("Set logged")).toBeTruthy();
    expect(screen.getByText("Rest 90s")).toBeTruthy();
  });

  it("remounts (key change) when ts changes so the CSS animation restarts", () => {
    const { rerender } = render(
      <FlashBadge flash={{ text: "First", ts: 1 }} />
    );
    const first = screen.getByTestId("flash-badge");
    rerender(<FlashBadge flash={{ text: "Second", ts: 2 }} />);
    const second = screen.getByTestId("flash-badge");
    expect(second).not.toBe(first);
    expect(screen.getByText("Second")).toBeTruthy();
  });

  it("applies a PR border class when isPR is true", () => {
    render(
      <FlashBadge flash={{ text: "New PR logged", isPR: true, ts: 1 }} />
    );
    const el = screen.getByTestId("flash-badge");
    expect(el.className).toContain("border-brand");
  });
});
