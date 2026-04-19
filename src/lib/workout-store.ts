/**
 * WorkoutStore interface.
 *
 * Both LocalStore (anonymous, localStorage) and SupabaseStore (signed-in,
 * Postgres via server actions) conform to this shape. Pages call through
 * the interface so the auth-state switch is the only place that knows
 * which backend is in play.
 */

export type WorkoutStatus = "planned" | "in_progress" | "completed";

export interface Workout {
  id: string;
  date: string;
  name: string | null;
  status: WorkoutStatus;
  notes: string | null;
  rating: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  exercise_name: string;
  muscle: string | null;
  equipment: string | null;
  order_index: number;
  notes: string | null;
}

export interface ExerciseSet {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  weight: number | null;
  weight_unit: "lbs" | "kg";
  reps: number | null;
  is_completed: boolean;
  completed_at: string | null;
}

export interface WorkoutWithChildren extends Workout {
  exercises: Array<WorkoutExercise & { sets: ExerciseSet[] }>;
}

export interface PendingExercise {
  exercise_id: string;
  exercise_name: string;
  muscle: string | null;
  equipment: string | null;
  default_sets: number;
}

export interface CreateWorkoutInput {
  name: string;
  date: string;
  exercises: PendingExercise[];
}

export interface SetInput {
  id?: string;
  workout_exercise_id: string;
  set_number: number;
  weight: number | null;
  weight_unit: "lbs" | "kg";
  reps: number | null;
  is_completed: boolean;
}

export interface WorkoutStore {
  createWorkout(input: CreateWorkoutInput): Promise<{ id: string }>;
  listWorkouts(): Promise<Array<Workout & { exercise_count: number }>>;
  getWorkout(id: string): Promise<WorkoutWithChildren | null>;
  deleteWorkout(id: string): Promise<void>;
  setWorkoutStatus(id: string, status: WorkoutStatus): Promise<void>;
  upsertSets(workoutId: string, sets: SetInput[]): Promise<void>;
}

export type StoreErrorCode =
  | "quota_exceeded"
  | "storage_unavailable"
  | "corrupted_state"
  | "validation_failed"
  | "not_found"
  | "server_error";

const DEFAULT_USER_MESSAGES: Record<StoreErrorCode, string> = {
  quota_exceeded:
    "Your device is out of storage for guest workouts. Remove a workout or sign up to save to the cloud.",
  storage_unavailable:
    "Your browser is blocking local storage (private mode). Your workouts will be kept for this session only.",
  corrupted_state:
    "We could not read your saved workouts and reset the guest store. You can start fresh.",
  validation_failed: "Some of the workout details need to be corrected.",
  not_found: "We could not find that workout.",
  server_error: "Something went wrong saving your workout. Please try again.",
};

export class StoreError extends Error {
  code: StoreErrorCode;
  userMessage: string;
  field?: string;

  constructor(
    code: StoreErrorCode,
    options: { message?: string; userMessage?: string; field?: string; cause?: unknown } = {}
  ) {
    super(options.message ?? code);
    this.name = "StoreError";
    this.code = code;
    this.userMessage = options.userMessage ?? DEFAULT_USER_MESSAGES[code];
    this.field = options.field;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}
