import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QuickWeightButtons } from "./quick-weight-buttons";

describe("QuickWeightButtons", () => {
  it("adds the configured delta when a button is pressed", () => {
    const onChange = vi.fn();
    render(<QuickWeightButtons value="135" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /add 5 pounds/i }));
    expect(onChange).toHaveBeenCalledWith("140");
  });

  it("subtracts the configured delta when a button is pressed", () => {
    const onChange = vi.fn();
    render(<QuickWeightButtons value="135" onChange={onChange} />);
    fireEvent.click(
      screen.getByRole("button", { name: /subtract 5 pounds/i })
    );
    expect(onChange).toHaveBeenCalledWith("130");
  });

  it("floors at zero (no negative weight)", () => {
    const onChange = vi.fn();
    render(<QuickWeightButtons value="3" onChange={onChange} />);
    fireEvent.click(
      screen.getByRole("button", { name: /subtract 5 pounds/i })
    );
    expect(onChange).toHaveBeenCalledWith("0");
  });

  it("treats an empty value as zero", () => {
    const onChange = vi.fn();
    render(<QuickWeightButtons value="" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /add 10 pounds/i }));
    expect(onChange).toHaveBeenCalledWith("10");
  });

  it("handles the 2.5 delta correctly", () => {
    const onChange = vi.fn();
    render(<QuickWeightButtons value="135" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /add 2.5 pounds/i }));
    expect(onChange).toHaveBeenCalledWith("137.5");
  });
});
