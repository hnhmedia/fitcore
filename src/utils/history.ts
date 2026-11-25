// Helpers that read your workout history: last session numbers, personal bests,
// next-weight suggestions, weekly stats and streaks.
import { ActiveExercise, CompletedWorkout, ExerciseSet, MuscleGroup, WorkoutRoutine } from '../types';
import type { ActiveWorkoutState } from '../services/storageService';

export const normName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

/** Estimated 1-rep max (Epley). Reps above 12 are capped so high-rep sets don't inflate it. */
export const e1rm = (weight: number, reps: number) =>
  reps <= 0 || weight <= 0 ? 0 : reps === 1 ? weight : weight * (1 + Math.min(reps, 12) / 30);

const workingSets = (ex: ActiveExercise) =>
  ex.sets.filter((s) => s.isCompleted && s.type !== 'warmup' && s.weight > 0 && s.reps > 0);

const byNewest = (a: CompletedWorkout, b: CompletedWorkout) => (b.startTime || 0) - (a.startTime || 0);

export interface LastPerformance {
  date: string;
  sets: { weight: number; reps: number }[];
}

/** The most recent session that included this exercise (working sets only). */
export function getLastPerformance(workouts: CompletedWorkout[], exerciseName: string): LastPerformance | null {
  const key = normName(exerciseName);
  for (const w of [...workouts].sort(byNewest)) {
    const ex = w.exercises?.find((e) => normName(e.name) === key);
    if (!ex) continue;
    const sets = workingSets(ex).map((s) => ({ weight: s.weight, reps: s.reps }));
    if (sets.length) return { date: w.date, sets };
  }
  return null;
}

export interface PersonalBest {
  e1rm: number;
  weight: number;
  reps: number;
  heaviest: number;
}

/** Best estimated 1RM and heaviest weight ever logged for an exercise. */
export function getPersonalBest(workouts: CompletedWorkout[], exerciseName: string): PersonalBest | null {
  const key = normName(exerciseName);
  let found = false;
  const best: PersonalBest = { e1rm: 0, weight: 0, reps: 0, heaviest: 0 };
  for (const w of workouts) {
    for (const ex of w.exercises || []) {
      if (normName(ex.name) !== key) continue;
      for (const s of workingSets(ex)) {
        found = true;
        const est = e1rm(s.weight, s.reps);
        if (est > best.e1rm) Object.assign(best, { e1rm: est, weight: s.weight, reps: s.reps });
        if (s.weight > best.heaviest) best.heaviest = s.weight;
      }
    }
  }
  return found ? best : null;
}

/**
 * Double progression: if every working set last time reached the target reps,
 * suggest a small weight increase; otherwise repeat the weight and chase reps.
 */
export function suggestNextWeight(
  last: LastPerformance | null,
  targetReps: number,
  unit: 'kg' | 'lbs',
): { weight: number; increased: boolean } | null {
  if (!last || !last.sets.length) return null;
  const top = Math.max(...last.sets.map((s) => s.weight));
  const topSets = last.sets.filter((s) => s.weight === top);
  const hitAll = topSets.every((s) => s.reps >= targetReps);
  const step = unit === 'kg' ? (top >= 40 ? 2.5 : 1) : top >= 90 ? 5 : 2.5;
  return hitAll ? { weight: round(top + step), increased: true } : { weight: top, increased: false };
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Build the sets for an exercise, prefilled from last time when there is history. */
export function buildSets(
  workouts: CompletedWorkout[],
  exerciseName: string,
  targetSets: number,
  targetReps: number,
  defaultWeight: number,
  unit: 'kg' | 'lbs',
): ExerciseSet[] {
  const last = getLastPerformance(workouts, exerciseName);
  const suggestion = suggestNextWeight(last, targetReps, unit);
  const stamp = Date.now();
  return Array.from({ length: Math.max(1, targetSets) }).map((_, i) => {
    const prev = last?.sets[i] ?? last?.sets[last.sets.length - 1];
    return {
      id: `s-${i}-${stamp}-${Math.random().toString(36).slice(2, 6)}`,
      setNumber: i + 1,
      weight: suggestion ? suggestion.weight : defaultWeight || 20,
      reps: targetReps || prev?.reps || 10,
      targetReps: targetReps || undefined,
      isCompleted: false,
      type: 'normal' as const,
      previousWeight: prev?.weight,
      previousReps: prev?.reps,
    };
  });
}

/** Turn a saved routine into a workout ready to start. */
export function workoutFromRoutine(
  routine: WorkoutRoutine,
  workouts: CompletedWorkout[],
  unit: 'kg' | 'lbs',
): ActiveWorkoutState {
  const stamp = Date.now();
  return {
    routineId: routine.id,
    routineName: routine.name,
    startTime: stamp,
    exercises: routine.exercises.map((e) => ({
      id: `act-${e.id}-${stamp}`,
      name: e.name,
      muscle: e.muscle,
      restSeconds: e.restSeconds || 90,
      notes: e.notes,
      isFinished: false,
      sets: buildSets(workouts, e.name, e.targetSets || 3, e.targetReps || 10, e.defaultWeight || 20, unit),
    })),
  };
}

export function blankWorkout(): ActiveWorkoutState {
  return { routineName: 'Freeform Workout', startTime: Date.now(), exercises: [] };
}

// ---------- calendar / stats ----------
export const isoDay = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Monday of the week containing d. */
export function startOfWeek(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

export const workoutVolume = (w: CompletedWorkout) =>
  w.totalVolumeKg ??
  (w.exercises || []).reduce((a, ex) => a + workingSets(ex).reduce((b, s) => b + s.weight * s.reps, 0), 0);

export function weekStats(workouts: CompletedWorkout[], weekStart: Date) {
  const from = isoDay(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 7);
  const to = isoDay(end);
  const inWeek = workouts.filter((w) => w.date >= from && w.date < to);
  return {
    count: inWeek.length,
    volume: inWeek.reduce((a, w) => a + workoutVolume(w), 0),
    minutes: inWeek.reduce((a, w) => a + (w.durationMinutes || 0), 0),
    days: new Set(inWeek.map((w) => w.date)),
  };
}

/** Consecutive weeks (ending this week, or last week if this week is empty so far) with at least one workout. */
export function weekStreak(workouts: CompletedWorkout[]) {
  let streak = 0;
  const cursor = startOfWeek(new Date());
  if (weekStats(workouts, cursor).count === 0) cursor.setDate(cursor.getDate() - 7);
  while (weekStats(workouts, cursor).count > 0) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

export function lastDoneDate(workouts: CompletedWorkout[], routine: WorkoutRoutine): string | null {
  const w = [...workouts]
    .sort(byNewest)
    .find((x) => x.routineId === routine.id || normName(x.routineName) === normName(routine.name));
  return w?.date ?? null;
}

/** Suggest the routine you have gone longest without doing (never-done ones first, in your order). */
export function suggestRoutine(workouts: CompletedWorkout[], routines: WorkoutRoutine[]) {
  if (!routines.length) return null;
  let pick: { routine: WorkoutRoutine; last: string | null } | null = null;
  for (const r of routines) {
    const last = lastDoneDate(workouts, r);
    if (!last) return { routine: r, last: null };
    if (!pick || (pick.last && last < pick.last)) pick = { routine: r, last };
  }
  return pick;
}

export function daysAgo(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const then = new Date(y, m - 1, d).getTime();
  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
  const n = Math.round((today - then) / 864e5);
  return n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`;
}

/** Most recent personal record across all workouts. */
export function latestPR(workouts: CompletedWorkout[]) {
  for (const w of [...workouts].sort(byNewest)) {
    if (w.prs && w.prs.length) return { ...w.prs[0], date: w.date };
  }
  return null;
}

/** Working-set volume per muscle group for workouts in [from, to). */
export function muscleVolume(workouts: CompletedWorkout[], from: string, to: string) {
  const out: Partial<Record<MuscleGroup, number>> = {};
  for (const w of workouts) {
    if (w.date < from || w.date >= to) continue;
    for (const ex of w.exercises || []) {
      const sets = workingSets(ex).length;
      if (sets) out[ex.muscle] = (out[ex.muscle] || 0) + sets;
    }
  }
  return out;
}
