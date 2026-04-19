import { describe, expect, it } from "vitest";
import { computeIsPR, type PRExerciseSnapshot } from "./pr-detection";

function ex(
  id: string,
  exerciseId: string,
  sets: Array<{ weight: string; reps: string; is_completed: boolean }>
): PRExerciseSnapshot {
  return { id, exercise_id: exerciseId, sets };
}

describe("computeIsPR", () => {
  it("the first ever completed set with positive weight and reps is a PR", () => {
    const exercises = [
      ex("we1", "bench", [
        { weight: "60", reps: "15", is_completed: false },
      ]),
    ];
    expect(
      computeIsPR({
        exercises,
        completingExerciseId: "we1",
        completingSetIdx: 0,
        newWeight: 60,
        newReps: 15,
        historyPR: null,
      })
    ).toBe(true);
  });

  it("a tie of an earlier session set is NOT a PR (the bug from the screenshot)", () => {
    const exercises = [
      ex("we1", "bench", [
        // set 1 is already marked completed at 60x15, score 900.
        { weight: "60", reps: "15", is_completed: true },
        // set 2 about to be toggled with the same 60x15 — should NOT PR.
        { weight: "60", reps: "15", is_completed: false },
      ]),
    ];
    expect(
      computeIsPR({
        exercises,
        completingExerciseId: "we1",
        completingSetIdx: 1,
        newWeight: 60,
        newReps: 15,
        historyPR: null,
      })
    ).toBe(false);
  });

  it("a heavier session set DOES set a new PR over an earlier session best", () => {
    const exercises = [
      ex("we1", "bench", [
        { weight: "60", reps: "15", is_completed: true },
        { weight: "70", reps: "15", is_completed: false },
      ]),
    ];
    expect(
      computeIsPR({
        exercises,
        completingExerciseId: "we1",
        completingSetIdx: 1,
        newWeight: 70,
        newReps: 15,
        historyPR: null,
      })
    ).toBe(true);
  });

  it("a tie of the all-time history PR is NOT a PR", () => {
    const exercises = [
      ex("we1", "bench", [{ weight: "60", reps: "15", is_completed: false }]),
    ];
    expect(
      computeIsPR({
        exercises,
        completingExerciseId: "we1",
        completingSetIdx: 0,
        newWeight: 60,
        newReps: 15,
        historyPR: { weight: 60, reps: 15 },
      })
    ).toBe(false);
  });

  it("beats history but loses to a session set → still NOT a PR", () => {
    const exercises = [
      ex("we1", "bench", [
        // session already has 1000-score completed.
        { weight: "100", reps: "10", is_completed: true },
        // about to toggle a 950-score set. Beats history (900) but not session.
        { weight: "95", reps: "10", is_completed: false },
      ]),
    ];
    expect(
      computeIsPR({
        exercises,
        completingExerciseId: "we1",
        completingSetIdx: 1,
        newWeight: 95,
        newReps: 10,
        historyPR: { weight: 90, reps: 10 },
      })
    ).toBe(false);
  });

  it("considers the same exercise_id across multiple workout_exercise slots", () => {
    // User added Bench Press twice in the same workout. Slot 1 already set
    // a 900 PR; slot 2 now ties — should not PR.
    const exercises = [
      ex("we1", "bench", [{ weight: "60", reps: "15", is_completed: true }]),
      ex("we2", "bench", [{ weight: "60", reps: "15", is_completed: false }]),
    ];
    expect(
      computeIsPR({
        exercises,
        completingExerciseId: "we2",
        completingSetIdx: 0,
        newWeight: 60,
        newReps: 15,
        historyPR: null,
      })
    ).toBe(false);
  });

  it("ignores other exercises in the workout", () => {
    const exercises = [
      ex("we1", "bench", [{ weight: "60", reps: "15", is_completed: false }]),
      // Squat already set a high score; shouldn't gate the bench PR.
      ex("we2", "squat", [{ weight: "200", reps: "10", is_completed: true }]),
    ];
    expect(
      computeIsPR({
        exercises,
        completingExerciseId: "we1",
        completingSetIdx: 0,
        newWeight: 60,
        newReps: 15,
        historyPR: null,
      })
    ).toBe(true);
  });

  it("zero weight or zero reps is never a PR", () => {
    const exercises = [
      ex("we1", "bench", [{ weight: "0", reps: "10", is_completed: false }]),
    ];
    expect(
      computeIsPR({
        exercises,
        completingExerciseId: "we1",
        completingSetIdx: 0,
        newWeight: 0,
        newReps: 10,
        historyPR: null,
      })
    ).toBe(false);
  });
});
