import { capture } from "./client";

export const track = {
  demoViewed: (path: string) => capture("demo_viewed", { path }),
  exampleWorkoutOpened: (slug: string) =>
    capture("example_workout_opened", { slug }),
  exerciseDetailOpened: (id: string) =>
    capture("exercise_detail_opened", { id }),
  forkClicked: (source: string) => capture("fork_clicked", { source }),
  apiKeyClicked: (source: string) => capture("api_key_clicked", { source }),
  signinStarted: () => capture("signin_started"),
  workoutCreatedAnon: (exerciseCount: number) =>
    capture("workout_created_anon", { exercise_count: exerciseCount }),
  workoutCreatedSignedIn: (exerciseCount: number) =>
    capture("workout_created_signed_in", { exercise_count: exerciseCount }),
  setLogged: () => capture("set_logged"),
  tutorialShown: () => capture("tutorial_shown"),
  tutorialDismissed: (step: number) =>
    capture("tutorial_dismissed", { step }),
  tutorialCompleted: () => capture("tutorial_completed"),
  videoFilterToggled: (enabled: boolean) =>
    capture("video_filter_toggled", { enabled }),
  localStorageError: (code: string) =>
    capture("local_storage_error", { code }),
};
