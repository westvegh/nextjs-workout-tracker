/**
 * Exercise-history lookup for the workout logger.
 *
 * One scan over the last ~30 workouts yields the three numbers the logger
 * cards display: the most recent top set (`last`), the all-time top set
 * inside the scan window (`pr`), and a rolling array of top-set weights for
 * the sparkline (`history`, up to 7 entries, oldest → newest).
 *
 * PR heuristic: max `weight * reps` across completed sets. Spec flagged this
 * as intentionally naive. Any smarter 1RM estimate would be a follow-up and
 * shouldn't change the call shape.
 *
 * Supersedes `previous-performance.ts`, which only returned `last`. The
 * logger is the only caller of either helper.
 */

import type { WorkoutStore } from "./workout-store";

export interface ExerciseHistoryEntry {
  weight: number;
  reps: number;
  date: string;
}

export interface ExerciseHistory {
  last: ExerciseHistoryEntry | null;
  pr: ExerciseHistoryEntry | null;
  history: number[];
}

const MAX_WORKOUTS_TO_SCAN = 30;
const HISTORY_CAP = 7;

function topSet(
  ex: { sets: { weight: number | null; reps: number | null; is_completed: boolean }[] }
): { weight: number; reps: number } | null {
  let best: { weight: number; reps: number; score: number } | null = null;
  for (const s of ex.sets) {
    if (!s.is_completed) continue;
    if (s.weight == null || s.reps == null) continue;
    const score = s.weight * s.reps;
    if (!best || score > best.score) {
      best = { weight: s.weight, reps: s.reps, score };
    }
  }
  return best ? { weight: best.weight, reps: best.reps } : null;
}

export async function getExerciseHistory(
  store: WorkoutStore,
  exerciseId: string
): Promise<ExerciseHistory> {
  let list;
  try {
    list = await store.listWorkouts();
  } catch {
    return { last: null, pr: null, history: [] };
  }

  const recent = list.slice(0, MAX_WORKOUTS_TO_SCAN);
  const matches: ExerciseHistoryEntry[] = [];

  for (const summary of recent) {
    let detail;
    try {
      detail = await store.getWorkout(summary.id);
    } catch {
      continue;
    }
    if (!detail) continue;

    for (const ex of detail.exercises) {
      if (ex.exercise_id !== exerciseId) continue;
      const top = topSet(ex);
      if (!top) continue;
      matches.push({ weight: top.weight, reps: top.reps, date: summary.date });
      break;
    }
    if (matches.length >= HISTORY_CAP) break;
  }

  if (matches.length === 0) {
    return { last: null, pr: null, history: [] };
  }

  // matches[0] is the most recent (store returns newest-first).
  const last = matches[0];
  let pr = matches[0];
  for (const m of matches) {
    if (m.weight * m.reps > pr.weight * pr.reps) pr = m;
  }

  // Sparkline wants oldest → newest.
  const history = matches.map((m) => m.weight).reverse();

  return { last, pr, history };
}
