import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Check,
  Plus,
  Minus,
  Trash2,
  Timer as TimerIcon,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  Shuffle,
  Loader2,
  Sparkles,
  Calculator,
  X,
  ArrowUp,
  ArrowDown,
  Trophy,
  Info,
  TrendingUp,
  Dumbbell,
} from 'lucide-react';
import { ActiveExercise, ExerciseSet, MuscleGroup, CompletedWorkout } from '../types';
import { storageService, ActiveWorkoutState } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { FinishWorkoutModal } from './FinishWorkoutModal';
import { PlateCalculatorModal } from './PlateCalculatorModal';
import { RestBar } from './RestBar';
import { soundEffects } from '../utils/audio';
import {
  buildSets,
  daysAgo,
  e1rm,
  getLastPerformance,
  getPersonalBest,
  suggestNextWeight,
} from '../utils/history';
import { EXERCISE_LIBRARY, MUSCLE_GROUPS, findLibraryExercise } from '../utils/exerciseLibrary';

interface ActiveWorkoutPlayerProps {
  workout: ActiveWorkoutState;
  completedWorkouts: CompletedWorkout[];
  onWorkoutFinished: (completed: CompletedWorkout) => void;
  onWorkoutDiscarded: () => void;
  unit?: 'kg' | 'lbs';
}

const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));

export const ActiveWorkoutPlayer: React.FC<ActiveWorkoutPlayerProps> = ({
  workout,
  completedWorkouts,
  onWorkoutFinished,
  onWorkoutDiscarded,
  unit = 'kg',
}) => {
  const prefs = useMemo(() => storageService.getPreferences(), []);
  const [exercises, setExercises] = useState<ActiveExercise[]>(workout.exercises);
  const [elapsedSeconds, setElapsedSeconds] = useState(
    Math.max(0, Math.floor((Date.now() - workout.startTime) / 1000))
  );

  // Rest timer (bottom bar)
  const [rest, setRest] = useState<{ endsAt: number | null; total: number; label?: string }>({
    endsAt: null,
    total: prefs.defaultRestSeconds || 90,
  });

  const onRestChange = useCallback(
    (endsAt: number | null, total: number) => setRest((r) => ({ ...r, endsAt, total })),
    []
  );

  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [addExerciseOpen, setAddExerciseOpen] = useState(workout.exercises.length === 0);
  const [searchExercise, setSearchExercise] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'All'>('All');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [cuesOpen, setCuesOpen] = useState<Record<string, boolean>>({});
  const [plateCalcOpen, setPlateCalcOpen] = useState(false);
  const [swapExIndex, setSwapExIndex] = useState<number | null>(null);
  const [swapAlternatives, setSwapAlternatives] = useState<{ name: string; equipment: string; reason: string }[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [prToast, setPrToast] = useState<string | null>(null);

  // Save progress so a refresh or closed tab never loses the workout.
  useEffect(() => {
    storageService.saveActiveWorkout({ ...workout, exercises });
  }, [exercises, workout]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - workout.startTime) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [workout.startTime]);

  useEffect(() => {
    if (!prToast) return;
    const t = setTimeout(() => setPrToast(null), 3500);
    return () => clearTimeout(t);
  }, [prToast]);

  // History per exercise name: last session, best set, today's suggestion.
  const historyFor = useCallback(
    (ex: ActiveExercise) => {
      const last = getLastPerformance(completedWorkouts, ex.name);
      const best = getPersonalBest(completedWorkouts, ex.name);
      const target = ex.sets.find((s) => s.type !== 'warmup')?.targetReps || ex.sets.find((s) => s.type !== 'warmup')?.reps || 10;
      return { last, best, suggestion: suggestNextWeight(last, target, unit) };
    },
    [completedWorkouts, unit]
  );

  const formatElapsed = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  };

  const updateExercise = (exIndex: number, fn: (ex: ActiveExercise) => ActiveExercise) =>
    setExercises((prev) => prev.map((ex, i) => (i === exIndex ? fn(ex) : ex)));

  const startRest = (seconds: number, label?: string) =>
    setRest({ endsAt: Date.now() + seconds * 1000, total: seconds, label });

  // Tick a set: checks for a personal record and starts the rest timer.
  const handleToggleSet = (exIndex: number, setIndex: number) => {
    const ex = exercises[exIndex];
    const set = ex.sets[setIndex];
    const completing = !set.isCompleted;
    let isPR = false;

    if (completing && set.type !== 'warmup' && set.weight > 0 && set.reps > 0) {
      const best = getPersonalBest(completedWorkouts, ex.name);
      const sessionBest = Math.max(
        0,
        ...ex.sets.filter((s, i) => i !== setIndex && s.isCompleted && s.type !== 'warmup').map((s) => e1rm(s.weight, s.reps))
      );
      const thisE1rm = e1rm(set.weight, set.reps);
      if (best && thisE1rm > Math.max(best.e1rm, sessionBest) + 0.01) {
        isPR = true;
        soundEffects.playCelebration();
        if (prefs.vibrationEnabled && 'vibrate' in navigator) navigator.vibrate([80, 60, 80, 60, 160]);
        setPrToast(`${ex.name}: ${fmtNum(set.weight)}${unit} × ${set.reps} (est. 1RM ${fmtNum(Math.round(thisE1rm))}${unit})`);
      }
    }

    updateExercise(exIndex, (e) => {
      const sets = e.sets.map((s, i) => (i === setIndex ? { ...s, isCompleted: completing, isPR: completing ? isPR : false } : s));
      return { ...e, sets, isFinished: completing ? e.isFinished || sets.every((s) => s.isCompleted) : false };
    });

    if (completing) {
      if (!isPR && prefs.soundEnabled) soundEffects.playCountdownPip();
      if (prefs.autoStartRestTimer !== false) {
        const nextSetIdx = ex.sets.findIndex((s, i) => i > setIndex && !s.isCompleted);
        const nextEx = exercises.find((e, i) => i > exIndex && !e.isFinished);
        const label = nextSetIdx >= 0 ? `${ex.name} · set ${nextSetIdx + 1}` : nextEx ? nextEx.name : undefined;
        if (nextSetIdx >= 0 || nextEx) startRest(ex.restSeconds || prefs.defaultRestSeconds || 90, label);
      }
    }
  };

  const handleUpdateSet = (exIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) =>
    updateExercise(exIndex, (ex) => ({
      ...ex,
      sets: ex.sets.map((s, i) => (i === setIndex ? { ...s, [field]: Math.max(0, value) } : s)),
    }));

  const copyPrevious = (exIndex: number, setIndex: number) =>
    updateExercise(exIndex, (ex) => ({
      ...ex,
      sets: ex.sets.map((s, i) =>
        i === setIndex && s.previousWeight !== undefined
          ? { ...s, weight: s.previousWeight, reps: s.previousReps ?? s.reps }
          : s
      ),
    }));

  const toggleWarmup = (exIndex: number, setIndex: number) =>
    updateExercise(exIndex, (ex) => ({
      ...ex,
      sets: ex.sets.map((s, i) => (i === setIndex ? { ...s, type: s.type === 'warmup' ? 'normal' : 'warmup', isPR: false } : s)),
    }));

  const handleAddSet = (exIndex: number) =>
    updateExercise(exIndex, (ex) => {
      const lastSet = ex.sets[ex.sets.length - 1];
      const newSet: ExerciseSet = {
        id: `set-${Date.now()}`,
        setNumber: ex.sets.length + 1,
        weight: lastSet ? lastSet.weight : 20,
        reps: lastSet ? lastSet.reps : 10,
        targetReps: lastSet?.targetReps,
        isCompleted: false,
        type: 'normal',
      };
      return { ...ex, isFinished: false, sets: [...ex.sets, newSet] };
    });

  const handleRemoveLastSet = (exIndex: number) =>
    updateExercise(exIndex, (ex) =>
      ex.sets.length <= 1 ? ex : { ...ex, sets: ex.sets.slice(0, -1).map((s, i) => ({ ...s, setNumber: i + 1 })) }
    );

  const handleAddWarmupSets = (exIndex: number) => {
    updateExercise(exIndex, (ex) => {
      const workWeight = ex.sets.find((s) => s.type !== 'warmup')?.weight || 60;
      const step = unit === 'kg' ? 2.5 : 5;
      const r = (x: number) => Math.max(step * 4, Math.round(x / step) * step);
      const stamp = Date.now();
      const warmups: ExerciseSet[] = [
        { id: `w1-${stamp}`, setNumber: 1, weight: r(workWeight * 0.45), reps: 8, isCompleted: false, type: 'warmup' },
        { id: `w2-${stamp}`, setNumber: 2, weight: r(workWeight * 0.65), reps: 4, isCompleted: false, type: 'warmup' },
        { id: `w3-${stamp}`, setNumber: 3, weight: r(workWeight * 0.85), reps: 2, isCompleted: false, type: 'warmup' },
      ];
      return { ...ex, sets: [...warmups, ...ex.sets.filter((s) => s.type !== 'warmup')].map((s, i) => ({ ...s, setNumber: i + 1 })) };
    });
    if (prefs.soundEnabled) soundEffects.playCountdownPip();
  };

  const handleToggleFinishExercise = (exIndex: number) => {
    updateExercise(exIndex, (ex) =>
      ex.isFinished ? { ...ex, isFinished: false } : { ...ex, isFinished: true, sets: ex.sets.map((s) => ({ ...s, isCompleted: true })) }
    );
  };

  const handleRemoveExercise = (exIndex: number) => {
    if (confirm('Remove this exercise from current workout?')) {
      setExercises((prev) => prev.filter((_, idx) => idx !== exIndex));
    }
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= exercises.length) return;
    const updated = [...exercises];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setExercises(updated);
  };

  const handleSelectNewExercise = (name: string, muscle: MuscleGroup) => {
    const newEx: ActiveExercise = {
      id: `ex-added-${Date.now()}`,
      name,
      muscle,
      restSeconds: prefs.defaultRestSeconds || 90,
      isFinished: false,
      sets: buildSets(completedWorkouts, name, 3, 10, 20, unit),
    };
    setExercises((prev) => [...prev, newEx]);
    setAddExerciseOpen(false);
    setSearchExercise('');
    setMuscleFilter('All');
  };

  const handleOpenSwap = async (exIndex: number) => {
    setSwapExIndex(exIndex);
    const targetEx = exercises[exIndex];
    setLoadingAlternatives(true);
    setSwapAlternatives([]);
    try {
      setSwapAlternatives(await geminiService.suggestExerciseAlternatives(targetEx.name));
    } catch {
      // No Gemini key or offline: suggest library exercises for the same muscle instead.
      setSwapAlternatives(
        EXERCISE_LIBRARY.filter((e) => e.muscle === targetEx.muscle && e.name !== targetEx.name)
          .slice(0, 5)
          .map((e) => ({ name: e.name, equipment: e.equipment, reason: e.cues[0] }))
      );
    } finally {
      setLoadingAlternatives(false);
    }
  };

  const handleSelectAlternative = (newExerciseName: string) => {
    if (swapExIndex === null) return;
    const last = getLastPerformance(completedWorkouts, newExerciseName);
    updateExercise(swapExIndex, (ex) => ({
      ...ex,
      name: newExerciseName,
      muscle: findLibraryExercise(newExerciseName)?.muscle ?? geminiService.inferMuscle(newExerciseName, ex.muscle),
      sets: ex.sets.map((s, i) => {
        const prev = last?.sets[i] ?? last?.sets[last.sets.length - 1];
        return { ...s, previousWeight: prev?.weight, previousReps: prev?.reps, isPR: false };
      }),
    }));
    setSwapExIndex(null);
  };

  const totalVolume = exercises.reduce(
    (acc, ex) => acc + ex.sets.reduce((sAcc, s) => (s.isCompleted ? sAcc + s.weight * s.reps : sAcc), 0),
    0
  );
  const completedSetsCount = exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.isCompleted).length, 0);
  const totalSetsCount = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const progressPct = totalSetsCount ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0;

  const libraryMatches = EXERCISE_LIBRARY.filter(
    (e) =>
      (muscleFilter === 'All' || e.muscle === muscleFilter) &&
      e.name.toLowerCase().includes(searchExercise.trim().toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto pb-44 animate-fade-in px-1 sm:px-4">
      {/* PR toast */}
      {prToast && (
        <div className="fixed top-20 left-0 right-0 z-[60] px-4 pointer-events-none animate-fade-in">
          <div className="max-w-md mx-auto rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black p-3 shadow-2xl shadow-amber-500/30 flex items-center gap-3">
            <Trophy size={26} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-black">New personal record!</p>
              <p className="text-xs font-semibold truncate">{prToast}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sticky workout header */}
      <div className="sticky top-[61px] z-30 bg-black/90 backdrop-blur-md border-b border-zinc-800 -mx-1 sm:-mx-4 px-3 sm:px-4 pt-3 pb-2 mb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-extrabold text-white truncate">{workout.routineName}</h1>
            <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400 mt-0.5">
              <span className="text-emerald-400 font-bold">{formatElapsed(elapsedSeconds)}</span>
              <span>{Math.round(totalVolume).toLocaleString()} {unit}</span>
              <span>{completedSetsCount}/{totalSetsCount} sets</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setPlateCalcOpen(true)}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300"
              title="Plate calculator"
              aria-label="Plate calculator"
            >
              <Calculator size={16} />
            </button>
            <button
              onClick={() => startRest(prefs.defaultRestSeconds || 90)}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400"
              title="Start rest timer"
              aria-label="Start rest timer"
            >
              <TimerIcon size={16} />
            </button>
            <button
              onClick={() => setFinishModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5"
            >
              <Check size={16} /> Finish
            </button>
          </div>
        </div>
        <div className="h-1 rounded-full bg-zinc-800 mt-2 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {exercises.length === 0 && (
        <div className="text-center py-12 px-6 rounded-3xl border border-dashed border-zinc-800">
          <Dumbbell size={28} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-sm font-bold text-white">Empty workout</p>
          <p className="text-xs text-zinc-400 mt-1">Add your first exercise to start logging.</p>
        </div>
      )}

      {/* Exercises */}
      <div className="space-y-4">
        {exercises.map((ex, exIndex) => {
          const isCollapsed = collapsed[ex.id];
          const { last, best, suggestion } = historyFor(ex);
          const lib = findLibraryExercise(ex.name);
          const doneSets = ex.sets.filter((s) => s.isCompleted).length;

          return (
            <div
              key={ex.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                ex.isFinished ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-zinc-900/70 border-zinc-800'
              }`}
            >
              {/* Exercise header */}
              <div className="p-3.5 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <button
                    className="min-w-0 text-left flex-1"
                    onClick={() => setCollapsed((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }))}
                  >
                    <div className="flex items-center gap-2">
                      {ex.isFinished && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
                      <h3 className={`font-bold text-[15px] leading-tight ${ex.isFinished ? 'text-emerald-300' : 'text-white'}`}>
                        {ex.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">{ex.muscle}</span>
                      <span>{doneSets}/{ex.sets.length} sets</span>
                      <span>· rest {ex.restSeconds}s</span>
                    </div>
                  </button>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {lib && (
                      <button
                        onClick={() => setCuesOpen((p) => ({ ...p, [ex.id]: !p[ex.id] }))}
                        className={`p-1.5 rounded-lg hover:bg-zinc-800 ${cuesOpen[ex.id] ? 'text-emerald-400' : 'text-zinc-400'}`}
                        title="Form tips"
                        aria-label="Form tips"
                      >
                        <Info size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenSwap(exIndex)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800"
                      title="Swap exercise"
                      aria-label="Swap exercise"
                    >
                      <Shuffle size={15} />
                    </button>
                    <button
                      onClick={() => handleMoveExercise(exIndex, 'up')}
                      disabled={exIndex === 0}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-20"
                      aria-label="Move exercise up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMoveExercise(exIndex, 'down')}
                      disabled={exIndex === exercises.length - 1}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-20"
                      aria-label="Move exercise down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => setCollapsed((prev) => ({ ...prev, [ex.id]: !prev[ex.id] }))}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
                      aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                    >
                      {isCollapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
                    </button>
                  </div>
                </div>

                {/* Last time + suggestion */}
                {!isCollapsed && (
                  <div className="mt-2.5 space-y-1.5">
                    {last ? (
                      <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold text-zinc-500">Last ({daysAgo(last.date)}):</span>
                        <span className="font-mono text-zinc-300">
                          {last.sets.map((s) => `${fmtNum(s.weight)}×${s.reps}`).join('  ')}
                        </span>
                        {best && (
                          <span className="text-zinc-500">· best {fmtNum(best.weight)}×{best.reps}</span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500">First time logging this one – pick a weight you can do with good form.</p>
                    )}
                    {suggestion?.increased && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-2 py-1">
                        <TrendingUp size={12} /> You hit all reps last time – try {fmtNum(suggestion.weight)}{unit} today
                      </div>
                    )}
                    {cuesOpen[ex.id] && lib && (
                      <ul className="mt-1 p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
                        {lib.cues.map((c) => (
                          <li key={c} className="flex gap-1.5"><span className="text-emerald-400">•</span>{c}</li>
                        ))}
                        <li className="text-zinc-500 pt-0.5">{lib.equipment}</li>
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Sets */}
              {!isCollapsed && (
                <div className="px-2.5 sm:px-4 pb-3">
                  <div className="grid grid-cols-12 gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 px-1 text-center">
                    <span className="col-span-2 text-left pl-1">Set</span>
                    <span className="col-span-3">Previous</span>
                    <span className="col-span-3">{unit}</span>
                    <span className="col-span-2">Reps</span>
                    <span className="col-span-2" />
                  </div>

                  <div className="space-y-1.5">
                    {ex.sets.map((set, sIndex) => {
                      const workingNo = ex.sets.slice(0, sIndex + 1).filter((s) => s.type !== 'warmup').length;
                      return (
                        <div
                          key={set.id}
                          className={`grid grid-cols-12 gap-1.5 items-center px-1 py-1.5 rounded-xl transition-all ${
                            set.isPR
                              ? 'bg-amber-500/10 ring-1 ring-amber-500/40'
                              : set.isCompleted
                              ? 'bg-emerald-500/10'
                              : 'bg-zinc-950/50'
                          }`}
                        >
                          <div className="col-span-2">
                            <button
                              onClick={() => toggleWarmup(exIndex, sIndex)}
                              title="Tap to switch warm-up / working set"
                              className={`w-8 h-8 rounded-lg text-xs font-mono font-bold flex items-center justify-center ${
                                set.type === 'warmup'
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-zinc-800 text-zinc-300'
                              }`}
                            >
                              {set.isPR ? <Trophy size={14} className="text-amber-400" /> : set.type === 'warmup' ? 'W' : workingNo}
                            </button>
                          </div>

                          <button
                            onClick={() => copyPrevious(exIndex, sIndex)}
                            disabled={set.previousWeight === undefined}
                            className="col-span-3 text-center font-mono text-[12px] text-zinc-500 disabled:cursor-default enabled:active:text-white truncate"
                            title={set.previousWeight !== undefined ? 'Tap to use last time’s numbers' : undefined}
                          >
                            {set.previousWeight !== undefined ? `${fmtNum(set.previousWeight)}×${set.previousReps ?? '-'}` : '—'}
                          </button>

                          <div className="col-span-3">
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.5"
                              value={set.weight}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handleUpdateSet(exIndex, sIndex, 'weight', parseFloat(e.target.value) || 0)}
                              className={`w-full py-2 px-1 text-center font-mono font-bold text-[15px] rounded-lg border focus:outline-none focus:border-emerald-500 ${
                                set.isCompleted ? 'bg-transparent border-transparent text-emerald-200' : 'bg-zinc-900 border-zinc-700 text-white'
                              }`}
                            />
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              inputMode="numeric"
                              value={set.reps}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handleUpdateSet(exIndex, sIndex, 'reps', parseInt(e.target.value, 10) || 0)}
                              className={`w-full py-2 px-1 text-center font-mono font-bold text-[15px] rounded-lg border focus:outline-none focus:border-emerald-500 ${
                                set.isCompleted ? 'bg-transparent border-transparent text-emerald-200' : 'bg-zinc-900 border-zinc-700 text-white'
                              }`}
                            />
                          </div>

                          <div className="col-span-2 flex justify-end">
                            <button
                              onClick={() => handleToggleSet(exIndex, sIndex)}
                              aria-label={set.isCompleted ? 'Mark set not done' : 'Mark set done'}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                                set.isCompleted
                                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/25'
                                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                              }`}
                            >
                              <Check size={20} strokeWidth={set.isCompleted ? 3.5 : 2.5} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <button
                      onClick={() => handleAddSet(exIndex)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-800/80 text-zinc-200 text-xs font-semibold"
                    >
                      <Plus size={14} /> Set
                    </button>
                    <button
                      onClick={() => handleRemoveLastSet(exIndex)}
                      disabled={ex.sets.length <= 1}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-800/80 text-zinc-400 text-xs font-semibold disabled:opacity-30"
                      aria-label="Remove last set"
                    >
                      <Minus size={14} /> Set
                    </button>
                    <button
                      onClick={() => handleAddWarmupSets(exIndex)}
                      className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold"
                      title="Add 3 progressive warm-up sets"
                    >
                      <Flame size={13} /> Warm-up
                    </button>
                    <button
                      onClick={() => handleRemoveExercise(exIndex)}
                      className="p-2 rounded-xl text-zinc-500 hover:text-red-400"
                      aria-label="Remove exercise"
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      onClick={() => handleToggleFinishExercise(exIndex)}
                      className={`ml-auto text-xs font-bold px-3 py-2 rounded-xl ${
                        ex.isFinished
                          ? 'bg-zinc-800 text-zinc-400'
                          : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      }`}
                    >
                      {ex.isFinished ? 'Reopen' : 'Done ✓'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => setAddExerciseOpen(true)}
          className="w-full sm:flex-1 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold text-sm flex items-center justify-center gap-2"
        >
          <Plus size={18} className="text-emerald-400" /> Add Exercise
        </button>
        <button
          onClick={() => setFinishModalOpen(true)}
          className="w-full sm:flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm flex items-center justify-center gap-2"
        >
          <Check size={18} /> Finish Workout
        </button>
        <button
          onClick={() => {
            if (confirm('Discard this workout? Nothing from it will be saved.')) {
              storageService.clearActiveWorkout();
              onWorkoutDiscarded();
            }
          }}
          className="py-2.5 px-4 text-xs font-semibold text-zinc-500 hover:text-red-400"
        >
          Discard Workout
        </button>
      </div>

      <RestBar
        endsAt={rest.endsAt}
        total={rest.total}
        label={rest.label}
        sound={prefs.soundEnabled !== false}
        vibration={prefs.vibrationEnabled !== false}
        onChange={onRestChange}
      />

      <FinishWorkoutModal
        isOpen={finishModalOpen}
        onClose={() => setFinishModalOpen(false)}
        onSave={(completed) => {
          storageService.clearActiveWorkout();
          onWorkoutFinished(completed);
        }}
        routineName={workout.routineName}
        routineId={workout.routineId}
        startTime={workout.startTime}
        exercises={exercises}
        unit={unit}
      />

      {/* Add exercise: searchable library */}
      {addExerciseOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 h-[85vh] sm:h-auto sm:max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">Add Exercise</h3>
              <button onClick={() => setAddExerciseOpen(false)} className="p-2 rounded-xl text-zinc-400 hover:text-white" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <input
              type="text"
              value={searchExercise}
              onChange={(e) => setSearchExercise(e.target.value)}
              placeholder="Search or type a custom exercise…"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex gap-1.5 overflow-x-auto py-3 -mx-1 px-1 shrink-0">
              {(['All', ...MUSCLE_GROUPS] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMuscleFilter(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${
                    muscleFilter === m ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {searchExercise.trim().length > 0 &&
                !EXERCISE_LIBRARY.some((e) => e.name.toLowerCase() === searchExercise.trim().toLowerCase()) && (
                  <button
                    onClick={() => handleSelectNewExercise(searchExercise.trim(), muscleFilter === 'All' ? 'Full Body' : muscleFilter)}
                    className="w-full text-left p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-sm flex items-center gap-2"
                  >
                    <Plus size={16} /> Add custom: “{searchExercise.trim()}”
                  </button>
                )}
              {libraryMatches.map((item) => {
                const lastP = getLastPerformance(completedWorkouts, item.name);
                return (
                  <button
                    key={item.name}
                    onClick={() => handleSelectNewExercise(item.name, item.muscle)}
                    className="w-full text-left p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-zinc-200 truncate">{item.name}</p>
                      <p className="text-[11px] text-zinc-500">
                        {item.equipment}
                        {lastP ? ` · last ${fmtNum(lastP.sets[0].weight)}${unit} × ${lastP.sets[0].reps}` : ''}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">{item.muscle}</span>
                  </button>
                );
              })}
              {libraryMatches.length === 0 && !searchExercise.trim() && (
                <p className="text-xs text-zinc-500 text-center py-6">No exercises in this group.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <PlateCalculatorModal
        isOpen={plateCalcOpen}
        onClose={() => setPlateCalcOpen(false)}
        defaultWeight={unit === 'kg' ? 80 : 185}
        unit={unit}
      />

      {/* Swap exercise */}
      {swapExIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Swap Exercise</h3>
                  <p className="text-xs text-zinc-400">Alternatives that train the same muscles</p>
                </div>
              </div>
              <button onClick={() => setSwapExIndex(null)} className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-3">
              Replacing: <span className="font-bold text-white">{exercises[swapExIndex]?.name}</span>
            </p>
            {loadingAlternatives ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-zinc-400">
                <Loader2 size={24} className="animate-spin text-emerald-400" />
                <span>Finding alternatives…</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {swapAlternatives.map((alt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectAlternative(alt.name)}
                    className="w-full text-left p-3 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/40 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-sm">{alt.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 font-semibold">{alt.equipment}</span>
                    </div>
                    <p className="text-xs text-zinc-400">{alt.reason}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
