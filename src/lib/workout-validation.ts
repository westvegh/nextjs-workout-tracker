/**
 * Shared validation rules for workout input shapes.
 *
 * Both LocalStore and SupabaseStore validate through this module before
 * writing to their respective backends. Keep this file framework-free and
 * dependency-free (no Zod) so it can run in server actions, client code,
 * and unit tests without bundler surprises.
 */

export class ValidationError extends Error {
  field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

export interface NormalizedExerciseInput {
  exercise_id: string;
  exercise_name: string;
  muscle: string | null;
  equipment: string | null;
  default_sets: number;
}

export interface NormalizedWorkoutInput {
  name: string | null;
  date: string;
  exercises: NormalizedExerciseInput[];
}

export interface NormalizedSetInput {
  id?: string;
  workout_exercise_id: string;
  set_number: number;
  weight: number | null;
  weight_unit: "lbs" | "kg";
  reps: number | null;
  is_completed: boolean;
}

const MAX_EXERCISES = 50;
const MAX_NAME_LEN = 120;
const MAX_EXERCISE_NAME_LEN = 200;
const MAX_DEFAULT_SETS = 10;
const MIN_DEFAULT_SETS = 1;
const MAX_WEIGHT = 2000;
const MAX_REPS = 1000;
const MAX_SET_NUMBER = 50;
const MIN_SET_NUMBER = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map((part) => Number.parseInt(part, 10));
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const probe = new Date(Date.UTC(y, m - 1, d));
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === m - 1 &&
    probe.getUTCDate() === d
  );
}

function validateExercise(raw: unknown, index: number): NormalizedExerciseInput {
  if (!isRecord(raw)) {
    throw new ValidationError(
      `exercises[${index}]`,
      "Exercise entry must be an object."
    );
  }

  const exerciseIdRaw = raw.exercise_id;
  if (typeof exerciseIdRaw !== "string" || exerciseIdRaw.trim().length === 0) {
    throw new ValidationError(
      `exercises[${index}].exercise_id`,
      "exercise_id is required."
    );
  }
  const exercise_id = exerciseIdRaw.trim();

  const exerciseNameRaw = raw.exercise_name;
  if (typeof exerciseNameRaw !== "string") {
    throw new ValidationError(
      `exercises[${index}].exercise_name`,
      "exercise_name must be a string."
    );
  }
  const exercise_name = exerciseNameRaw.trim();
  if (exercise_name.length === 0) {
    throw new ValidationError(
      `exercises[${index}].exercise_name`,
      "exercise_name is required."
    );
  }
  if (exercise_name.length > MAX_EXERCISE_NAME_LEN) {
    throw new ValidationError(
      `exercises[${index}].exercise_name`,
      `exercise_name must be at most ${MAX_EXERCISE_NAME_LEN} characters.`
    );
  }

  let muscle: string | null = null;
  if (raw.muscle === null || raw.muscle === undefined) {
    muscle = null;
  } else if (typeof raw.muscle === "string") {
    const trimmed = raw.muscle.trim();
    muscle = trimmed.length === 0 ? null : trimmed;
  } else {
    throw new ValidationError(
      `exercises[${index}].muscle`,
      "muscle must be a string or null."
    );
  }

  let equipment: string | null = null;
  if (raw.equipment === null || raw.equipment === undefined) {
    equipment = null;
  } else if (typeof raw.equipment === "string") {
    const trimmed = raw.equipment.trim();
    equipment = trimmed.length === 0 ? null : trimmed;
  } else {
    throw new ValidationError(
      `exercises[${index}].equipment`,
      "equipment must be a string or null."
    );
  }

  let default_sets = 3;
  if (raw.default_sets !== undefined && raw.default_sets !== null) {
    if (!isInteger(raw.default_sets)) {
      throw new ValidationError(
        `exercises[${index}].default_sets`,
        "default_sets must be an integer."
      );
    }
    if (raw.default_sets < MIN_DEFAULT_SETS || raw.default_sets > MAX_DEFAULT_SETS) {
      throw new ValidationError(
        `exercises[${index}].default_sets`,
        `default_sets must be between ${MIN_DEFAULT_SETS} and ${MAX_DEFAULT_SETS}.`
      );
    }
    default_sets = raw.default_sets;
  }

  return { exercise_id, exercise_name, muscle, equipment, default_sets };
}

export function validateWorkoutInput(input: unknown): NormalizedWorkoutInput {
  if (!isRecord(input)) {
    throw new ValidationError("root", "Workout input must be an object.");
  }

  let name: string | null;
  if (input.name === null || input.name === undefined) {
    name = null;
  } else if (typeof input.name === "string") {
    const trimmed = input.name.trim();
    if (trimmed.length === 0) {
      name = null;
    } else if (trimmed.length > MAX_NAME_LEN) {
      throw new ValidationError(
        "name",
        `name must be at most ${MAX_NAME_LEN} characters.`
      );
    } else {
      name = trimmed;
    }
  } else {
    throw new ValidationError("name", "name must be a string or null.");
  }

  if (typeof input.date !== "string") {
    throw new ValidationError("date", "date is required.");
  }
  if (!isValidCalendarDate(input.date)) {
    throw new ValidationError(
      "date",
      "date must be a valid YYYY-MM-DD calendar date."
    );
  }
  const date = input.date;

  if (!Array.isArray(input.exercises)) {
    throw new ValidationError("exercises", "exercises must be an array.");
  }
  if (input.exercises.length > MAX_EXERCISES) {
    throw new ValidationError(
      "exercises",
      `exercises must contain at most ${MAX_EXERCISES} entries.`
    );
  }

  const exercises = input.exercises.map((raw, index) => validateExercise(raw, index));

  return { name, date, exercises };
}

export function validateSetInput(input: unknown): NormalizedSetInput {
  if (!isRecord(input)) {
    throw new ValidationError("root", "Set input must be an object.");
  }

  if (
    typeof input.workout_exercise_id !== "string" ||
    input.workout_exercise_id.trim().length === 0
  ) {
    throw new ValidationError(
      "workout_exercise_id",
      "workout_exercise_id is required."
    );
  }
  const workout_exercise_id = input.workout_exercise_id.trim();

  if (!isInteger(input.set_number)) {
    throw new ValidationError("set_number", "set_number must be an integer.");
  }
  if (input.set_number < MIN_SET_NUMBER || input.set_number > MAX_SET_NUMBER) {
    throw new ValidationError(
      "set_number",
      `set_number must be between ${MIN_SET_NUMBER} and ${MAX_SET_NUMBER}.`
    );
  }
  const set_number = input.set_number;

  let weight: number | null = null;
  if (input.weight === null || input.weight === undefined) {
    weight = null;
  } else if (typeof input.weight !== "number" || !Number.isFinite(input.weight)) {
    throw new ValidationError("weight", "weight must be a number or null.");
  } else if (input.weight < 0 || input.weight > MAX_WEIGHT) {
    throw new ValidationError(
      "weight",
      `weight must be between 0 and ${MAX_WEIGHT}.`
    );
  } else {
    weight = input.weight;
  }

  let reps: number | null = null;
  if (input.reps === null || input.reps === undefined) {
    reps = null;
  } else if (!isInteger(input.reps)) {
    throw new ValidationError("reps", "reps must be an integer or null.");
  } else if (input.reps < 0 || input.reps > MAX_REPS) {
    throw new ValidationError("reps", `reps must be between 0 and ${MAX_REPS}.`);
  } else {
    reps = input.reps;
  }

  if (input.weight_unit !== "lbs" && input.weight_unit !== "kg") {
    throw new ValidationError(
      "weight_unit",
      'weight_unit must be "lbs" or "kg".'
    );
  }
  const weight_unit = input.weight_unit;

  const is_completed = input.is_completed === true;

  let id: string | undefined;
  if (input.id !== undefined && input.id !== null) {
    if (typeof input.id !== "string" || input.id.trim().length === 0) {
      throw new ValidationError("id", "id must be a non-empty string when provided.");
    }
    id = input.id.trim();
  }

  return {
    id,
    workout_exercise_id,
    set_number,
    weight,
    weight_unit,
    reps,
    is_completed,
  };
}
