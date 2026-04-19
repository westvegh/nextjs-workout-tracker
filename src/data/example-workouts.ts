/**
 * Example workouts seeded into LocalStore on first load. Three hand-built
 * plans that show the breadth of exerciseapi.dev versus yuhonas (the
 * mobility workout uses PT/mobility/plyometrics categories the other
 * dataset lacks).
 *
 * Exercise ids match the exerciseapi.dev free-tier naming scheme
 * (Pascal_Snake_Case). LocalStore stores them as opaque strings, so
 * non-existent ids still render a usable workout — they just won't
 * resolve on a live detail link until the catalog ships the record.
 */

export interface ExampleExercise {
  exercise_id: string;
  exercise_name: string;
  muscle: string | null;
  equipment: string | null;
  default_sets: number;
}

export interface ExampleWorkout {
  id: string;
  name: string;
  date: string;
  exercises: ExampleExercise[];
}

export const EXAMPLE_SEED_DATE = "2026-04-19";

export const EXAMPLE_WORKOUTS: ExampleWorkout[] = [
  {
    id: "example-upper-push",
    name: "Upper-body push",
    date: EXAMPLE_SEED_DATE,
    exercises: [
      {
        exercise_id: "Barbell_Bench_Press_-_Medium_Grip",
        exercise_name: "Barbell Bench Press (Medium Grip)",
        muscle: "chest",
        equipment: "barbell",
        default_sets: 4,
      },
      {
        exercise_id: "Dumbbell_Shoulder_Press",
        exercise_name: "Dumbbell Shoulder Press",
        muscle: "shoulders",
        equipment: "dumbbell",
        default_sets: 3,
      },
      {
        exercise_id: "Dips_-_Triceps_Version",
        exercise_name: "Dips (Triceps Version)",
        muscle: "triceps",
        equipment: "body only",
        default_sets: 3,
      },
      {
        exercise_id: "Tricep_Dumbbell_Kickback",
        exercise_name: "Tricep Dumbbell Kickback",
        muscle: "triceps",
        equipment: "dumbbell",
        default_sets: 3,
      },
    ],
  },
  {
    id: "example-lower-strength",
    name: "Lower-body strength",
    date: EXAMPLE_SEED_DATE,
    exercises: [
      {
        exercise_id: "Barbell_Squat",
        exercise_name: "Barbell Squat",
        muscle: "quadriceps",
        equipment: "barbell",
        default_sets: 5,
      },
      {
        exercise_id: "Romanian_Deadlift",
        exercise_name: "Romanian Deadlift",
        muscle: "hamstrings",
        equipment: "barbell",
        default_sets: 4,
      },
      {
        exercise_id: "Dumbbell_Lunges",
        exercise_name: "Dumbbell Lunges",
        muscle: "quadriceps",
        equipment: "dumbbell",
        default_sets: 3,
      },
      {
        exercise_id: "Standing_Calf_Raises",
        exercise_name: "Standing Calf Raises",
        muscle: "calves",
        equipment: "machine",
        default_sets: 3,
      },
    ],
  },
  {
    id: "example-mobility-warmup",
    name: "Mobility + warm-up",
    date: EXAMPLE_SEED_DATE,
    exercises: [
      {
        exercise_id: "90_90_Hip_Stretch",
        exercise_name: "90/90 Hip Stretch",
        muscle: "hips",
        equipment: "body only",
        default_sets: 2,
      },
      {
        exercise_id: "A-Skip",
        exercise_name: "A-Skip",
        muscle: "full body",
        equipment: "body only",
        default_sets: 2,
      },
      {
        exercise_id: "Ankle_Circles",
        exercise_name: "Ankle Circles",
        muscle: "calves",
        equipment: "body only",
        default_sets: 2,
      },
      {
        exercise_id: "90_90_Hip_External_Rotation_RAILs",
        exercise_name: "Hip External Rotation RAILs",
        muscle: "hips",
        equipment: "body only",
        default_sets: 2,
      },
    ],
  },
];
