/**
 * PR detection for the workout logger.
 *
 * A set qualifies as a PR if its `weight * reps` score *strictly* exceeds
 * the previous best. The previous best is the max of:
 *   - the all-time PR carried in `history` (from prior workouts), and
 *   - any other completed set in the current session for the same
 *     exercise_id (a single exercise can appear in multiple workout_-
 *     exercise slots; all of them count toward the session baseline).
 *
 * Reading history alone — the original bug — let two identical sets in a
 * row both flash NEW PR, because the second comparison still saw the
 * stale pre-session baseline.
 *
 * Strict `>` means ties don't count: 60×15 followed by 60×15 → only the
 * first is a PR.
 */

export interface PRSetSnapshot {
  is_completed: boolean;
  weight: string;
  reps: string;
}

export interface PRExerciseSnapshot {
  id: string;
  exercise_id: string;
  sets: PRSetSnapshot[];
}

export interface PRHistory {
  weight: number;
  reps: number;
}

function score(weight: number, reps: number): number {
  return weight * reps;
}

export function computeIsPR(args: {
  exercises: PRExerciseSnapshot[];
  completingExerciseId: string;
  completingSetIdx: number;
  newWeight: number;
  newReps: number;
  historyPR: PRHistory | null;
}): boolean {
  const {
    exercises,
    completingExerciseId,
    completingSetIdx,
    newWeight,
    newReps,
    historyPR,
  } = args;

  const newScore = score(newWeight, newReps);
  if (newScore <= 0) return false;

  // Find the workout_exercise we're completing into and read its
  // exercise_id — the comparison is across every other slot that uses the
  // same exercise_id (e.g., the user added Bench Press twice).
  const target = exercises.find((e) => e.id === completingExerciseId);
  if (!target) return false;

  let sessionBest = 0;
  for (const ex of exercises) {
    if (ex.exercise_id !== target.exercise_id) continue;
    for (let i = 0; i < ex.sets.length; i++) {
      const s = ex.sets[i];
      if (!s.is_completed) continue;
      // Skip the set being toggled — its is_completed may or may not have
      // been flipped yet by the caller, doesn't matter.
      if (ex.id === completingExerciseId && i === completingSetIdx) continue;
      const w = Number(s.weight) || 0;
      const r = Number(s.reps) || 0;
      sessionBest = Math.max(sessionBest, score(w, r));
    }
  }

  const historyBest = historyPR ? score(historyPR.weight, historyPR.reps) : 0;
  const baseline = Math.max(sessionBest, historyBest);
  return newScore > baseline;
}
