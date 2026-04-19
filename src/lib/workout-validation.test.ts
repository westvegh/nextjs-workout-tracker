import { describe, expect, it } from "vitest";
import {
  ValidationError,
  validateSetInput,
  validateWorkoutInput,
} from "./workout-validation";

function validExercise(overrides: Record<string, unknown> = {}) {
  return {
    exercise_id: "ex-1",
    exercise_name: "Bench press",
    muscle: "chest",
    equipment: "barbell",
    default_sets: 3,
    ...overrides,
  };
}

function validWorkout(overrides: Record<string, unknown> = {}) {
  return {
    name: "Push day",
    date: "2026-04-18",
    exercises: [validExercise()],
    ...overrides,
  };
}

function validSet(overrides: Record<string, unknown> = {}) {
  return {
    workout_exercise_id: "we-1",
    set_number: 1,
    weight: 135,
    weight_unit: "lbs",
    reps: 10,
    is_completed: true,
    ...overrides,
  };
}

describe("validateWorkoutInput", () => {
  it("returns normalized shape for happy-path input", () => {
    const result = validateWorkoutInput(validWorkout());
    expect(result).toEqual({
      name: "Push day",
      date: "2026-04-18",
      exercises: [
        {
          exercise_id: "ex-1",
          exercise_name: "Bench press",
          muscle: "chest",
          equipment: "barbell",
          default_sets: 3,
        },
      ],
    });
  });

  it("trims the name", () => {
    const result = validateWorkoutInput(validWorkout({ name: "  Leg day  " }));
    expect(result.name).toBe("Leg day");
  });

  it("treats an empty/whitespace name as null", () => {
    expect(validateWorkoutInput(validWorkout({ name: "" })).name).toBeNull();
    expect(validateWorkoutInput(validWorkout({ name: "   " })).name).toBeNull();
    expect(validateWorkoutInput(validWorkout({ name: null })).name).toBeNull();
  });

  it("rejects a 121-char name", () => {
    const longName = "a".repeat(121);
    try {
      validateWorkoutInput(validWorkout({ name: longName }));
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("name");
    }
  });

  it("accepts a 120-char name", () => {
    const limit = "a".repeat(120);
    expect(validateWorkoutInput(validWorkout({ name: limit })).name).toBe(limit);
  });

  it("rejects a malformed date format", () => {
    try {
      validateWorkoutInput(validWorkout({ date: "04-18-2026" }));
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("date");
    }
  });

  it("rejects a non-calendar date (2026-02-30)", () => {
    try {
      validateWorkoutInput(validWorkout({ date: "2026-02-30" }));
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("date");
    }
  });

  it("rejects a missing date", () => {
    try {
      validateWorkoutInput({ name: "x", exercises: [] });
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("date");
    }
  });

  it("accepts 50 exercises", () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      validExercise({ exercise_id: `ex-${i}` })
    );
    const result = validateWorkoutInput(validWorkout({ exercises: many }));
    expect(result.exercises).toHaveLength(50);
  });

  it("rejects 51 exercises", () => {
    const many = Array.from({ length: 51 }, (_, i) =>
      validExercise({ exercise_id: `ex-${i}` })
    );
    try {
      validateWorkoutInput(validWorkout({ exercises: many }));
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("exercises");
    }
  });

  it("rejects exercise with empty name", () => {
    try {
      validateWorkoutInput(
        validWorkout({ exercises: [validExercise({ exercise_name: "   " })] })
      );
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("exercises[0].exercise_name");
    }
  });

  it("rejects exercise with missing exercise_id", () => {
    try {
      validateWorkoutInput(
        validWorkout({ exercises: [validExercise({ exercise_id: "" })] })
      );
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("exercises[0].exercise_id");
    }
  });

  it("coerces null/empty muscle/equipment to null", () => {
    const result = validateWorkoutInput(
      validWorkout({
        exercises: [
          validExercise({ muscle: null, equipment: "" }),
        ],
      })
    );
    expect(result.exercises[0].muscle).toBeNull();
    expect(result.exercises[0].equipment).toBeNull();
  });

  it("defaults default_sets to 3 when omitted", () => {
    const ex = validExercise();
    delete (ex as Record<string, unknown>).default_sets;
    const result = validateWorkoutInput(validWorkout({ exercises: [ex] }));
    expect(result.exercises[0].default_sets).toBe(3);
  });

  it("rejects default_sets below 1", () => {
    try {
      validateWorkoutInput(
        validWorkout({ exercises: [validExercise({ default_sets: 0 })] })
      );
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("exercises[0].default_sets");
    }
  });

  it("rejects default_sets above 10", () => {
    try {
      validateWorkoutInput(
        validWorkout({ exercises: [validExercise({ default_sets: 11 })] })
      );
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("exercises[0].default_sets");
    }
  });

  it("rejects non-integer default_sets", () => {
    try {
      validateWorkoutInput(
        validWorkout({ exercises: [validExercise({ default_sets: 3.5 })] })
      );
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("exercises[0].default_sets");
    }
  });

  it("rejects non-object input", () => {
    try {
      validateWorkoutInput(null);
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("root");
    }
  });

  it("rejects non-array exercises", () => {
    try {
      validateWorkoutInput(validWorkout({ exercises: "not-an-array" }));
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("exercises");
    }
  });
});

describe("validateSetInput", () => {
  it("returns normalized shape on happy path", () => {
    const result = validateSetInput(validSet());
    expect(result).toEqual({
      id: undefined,
      workout_exercise_id: "we-1",
      set_number: 1,
      weight: 135,
      weight_unit: "lbs",
      reps: 10,
      is_completed: true,
    });
  });

  it("allows kg unit", () => {
    expect(validateSetInput(validSet({ weight_unit: "kg" })).weight_unit).toBe("kg");
  });

  it("rejects weight_unit of g", () => {
    try {
      validateSetInput(validSet({ weight_unit: "g" }));
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("weight_unit");
    }
  });

  it("allows null weight and null reps", () => {
    const result = validateSetInput(validSet({ weight: null, reps: null }));
    expect(result.weight).toBeNull();
    expect(result.reps).toBeNull();
  });

  it("rejects weight=-1", () => {
    try {
      validateSetInput(validSet({ weight: -1 }));
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("weight");
    }
  });

  it("rejects weight=2001", () => {
    try {
      validateSetInput(validSet({ weight: 2001 }));
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("weight");
    }
  });

  it("accepts weight=2000", () => {
    expect(validateSetInput(validSet({ weight: 2000 })).weight).toBe(2000);
  });

  it("rejects reps=-1", () => {
    try {
      validateSetInput(validSet({ reps: -1 }));
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("reps");
    }
  });

  it("rejects reps=1001", () => {
    try {
      validateSetInput(validSet({ reps: 1001 }));
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("reps");
    }
  });

  it("rejects non-integer reps", () => {
    try {
      validateSetInput(validSet({ reps: 3.5 }));
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("reps");
    }
  });

  it("rejects set_number=0", () => {
    try {
      validateSetInput(validSet({ set_number: 0 }));
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("set_number");
    }
  });

  it("rejects set_number=51", () => {
    try {
      validateSetInput(validSet({ set_number: 51 }));
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("set_number");
    }
  });

  it("rejects missing workout_exercise_id", () => {
    try {
      validateSetInput(validSet({ workout_exercise_id: "" }));
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("workout_exercise_id");
    }
  });

  it("defaults is_completed to false when not boolean true", () => {
    const result = validateSetInput(validSet({ is_completed: undefined }));
    expect(result.is_completed).toBe(false);
  });

  it("accepts and trims id when provided", () => {
    const result = validateSetInput(validSet({ id: "  set-1  " }));
    expect(result.id).toBe("set-1");
  });

  it("rejects non-string id", () => {
    try {
      validateSetInput(validSet({ id: 42 }));
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("id");
    }
  });

  it("rejects non-object input", () => {
    try {
      validateSetInput("not an object");
      throw new Error("expected ValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).field).toBe("root");
    }
  });
});
