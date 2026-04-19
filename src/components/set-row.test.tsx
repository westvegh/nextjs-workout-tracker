import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SetRow, type SetRowSetState } from "./set-row";

function baseSet(overrides: Partial<SetRowSetState> = {}): SetRowSetState {
  return {
    set_number: 1,
    weight: "",
    weight_unit: "lbs",
    reps: "",
    is_completed: false,
    pr: false,
    ...overrides,
  };
}

describe("SetRow", () => {
  it("renders weight/reps inputs with placeholders from ghost values", () => {
    render(
      <SetRow
        set={baseSet()}
        setIdx={0}
        exerciseId="ex1"
        isActive={false}
        ghostWeight="185"
        ghostReps="8"
        onUpdate={() => {}}
        onToggle={() => {}}
        onRemove={() => {}}
      />
    );
    const weight = screen.getByLabelText("Weight, set 1");
    const reps = screen.getByLabelText("Reps, set 1");
    expect(weight.getAttribute("placeholder")).toBe("185");
    expect(reps.getAttribute("placeholder")).toBe("8");
  });

  it("clicking an empty input with a ghost value populates it", () => {
    const onUpdate = vi.fn();
    render(
      <SetRow
        set={baseSet()}
        setIdx={0}
        exerciseId="ex1"
        isActive={false}
        ghostWeight="185"
        ghostReps="8"
        onUpdate={onUpdate}
        onToggle={() => {}}
        onRemove={() => {}}
      />
    );
    fireEvent.click(screen.getByLabelText("Weight, set 1"));
    expect(onUpdate).toHaveBeenCalledWith({ weight: "185" });
  });

  it("toggling the unit chip calls onUpdate with the opposite unit", () => {
    const onUpdate = vi.fn();
    render(
      <SetRow
        set={baseSet({ weight_unit: "lbs" })}
        setIdx={0}
        exerciseId="ex1"
        isActive={false}
        ghostWeight={null}
        ghostReps={null}
        onUpdate={onUpdate}
        onToggle={() => {}}
        onRemove={() => {}}
      />
    );
    fireEvent.click(screen.getByLabelText("Toggle weight unit"));
    expect(onUpdate).toHaveBeenCalledWith({ weight_unit: "kg" });
  });

  it("clicking the check button fires onToggle", () => {
    const onToggle = vi.fn();
    render(
      <SetRow
        set={baseSet()}
        setIdx={0}
        exerciseId="ex1"
        isActive
        ghostWeight={null}
        ghostReps={null}
        onUpdate={() => {}}
        onToggle={onToggle}
        onRemove={() => {}}
      />
    );
    fireEvent.click(screen.getByLabelText("Mark done"));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("renders the PR pill when completed AND pr=true", () => {
    render(
      <SetRow
        set={baseSet({ is_completed: true, pr: true, weight: "205", reps: "5" })}
        setIdx={0}
        exerciseId="ex1"
        isActive={false}
        ghostWeight={null}
        ghostReps={null}
        onUpdate={() => {}}
        onToggle={() => {}}
        onRemove={() => {}}
      />
    );
    expect(screen.getByText("New PR")).toBeTruthy();
  });

  it("does not render the PR pill when pr is false", () => {
    render(
      <SetRow
        set={baseSet({ is_completed: true, weight: "185", reps: "8" })}
        setIdx={0}
        exerciseId="ex1"
        isActive={false}
        ghostWeight={null}
        ghostReps={null}
        onUpdate={() => {}}
        onToggle={() => {}}
        onRemove={() => {}}
      />
    );
    expect(screen.queryByText("New PR")).toBeNull();
  });
});
