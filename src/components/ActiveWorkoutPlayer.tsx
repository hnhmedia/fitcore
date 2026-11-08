import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Check, 
  Plus, 
  Trash2, 
  Timer as TimerIcon, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Flame, 
  Dumbbell, 
  AlertCircle,
  Shuffle,
  Loader2,
  Sparkles,
  Calculator,
  X,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { ActiveExercise, ExerciseSet, MuscleGroup, CompletedWorkout } from '../types';
import { storageService, ActiveWorkoutState } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { RestTimerModal } from './RestTimerModal';
import { FinishWorkoutModal } from './FinishWorkoutModal';
import { PlateCalculatorModal } from './PlateCalculatorModal';
import { soundEffects } from '../utils/audio';

interface ActiveWorkoutPlayerProps {
  workout: ActiveWorkoutState;
  onWorkoutFinished: (completed: CompletedWorkout) => void;
  onWorkoutDiscarded: () => void;
  unit?: 'kg' | 'lbs';
}

const COMMON_EXERCISES: { name: string; muscle: MuscleGroup }[] = [
  { name: 'Barbell Flat Bench Press', muscle: 'Chest' },
  { name: 'Incline Dumbbell Press', muscle: 'Chest' },
  { name: 'Chest Cable Flyes', muscle: 'Chest' },
  { name: 'Push-ups', muscle: 'Chest' },
  { name: 'Barbell Bent-Over Row', muscle: 'Back' },
  { name: 'Lat Pulldown', muscle: 'Back' },
  { name: 'Seated Cable Row', muscle: 'Back' },
  { name: 'Pull-ups / Chin-ups', muscle: 'Back' },
  { name: 'Standing Barbell Overhead Press', muscle: 'Shoulders' },
  { name: 'Dumbbell Lateral Raises', muscle: 'Shoulders' },
  { name: 'Face Pulls', muscle: 'Shoulders' },
  { name: 'Barbell Back Squat', muscle: 'Legs' },
  { name: 'Romanian Deadlift (RDL)', muscle: 'Legs' },
  { name: 'Leg Press', muscle: 'Legs' },
  { name: 'Lying Leg Curl', muscle: 'Legs' },
  { name: 'Standing Calf Raises', muscle: 'Legs' },
  { name: 'Barbell Bicep Curl', muscle: 'Biceps' },
  { name: 'Dumbbell Hammer Curls', muscle: 'Biceps' },
  { name: 'Tricep Rope Pushdown', muscle: 'Triceps' },
  { name: 'Overhead Tricep Extension', muscle: 'Triceps' },
  { name: 'Hanging Leg Raise', muscle: 'Abs' },
  { name: 'Plank', muscle: 'Abs' },
];

export const ActiveWorkoutPlayer: React.FC<ActiveWorkoutPlayerProps> = ({
  workout,
  onWorkoutFinished,
  onWorkoutDiscarded,
  unit = 'kg',
}) => {
  const [exercises, setExercises] = useState<ActiveExercise[]>(workout.exercises);
  const [elapsedSeconds, setElapsedSeconds] = useState(
    Math.max(0, Math.floor((Date.now() - workout.startTime) / 1000))
  );
  
  // Timer state
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(90);

  // Finish modal
  const [finishModalOpen, setFinishModalOpen] = useState(false);

  // Add exercise modal
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [searchExercise, setSearchExercise] = useState('');

  // Expand / collapse exercises
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Plate Calculator & Exercise Swap states
  const [plateCalcOpen, setPlateCalcOpen] = useState(false);
  const [swapExIndex, setSwapExIndex] = useState<number | null>(null);
  const [swapAlternatives, setSwapAlternatives] = useState<{ name: string; equipment: string; reason: string }[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);

  // Auto-sync state to localStorage so refresh doesn't lose anything
  useEffect(() => {
    storageService.saveActiveWorkout({
      ...workout,
      exercises
    });
  }, [exercises, workout]);

  // Elapsed stopwatch
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - workout.startTime) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [workout.startTime]);

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Toggle set completed
  const handleToggleSet = (exIndex: number, setIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      const targetEx = { ...updated[exIndex] };
      const targetSets = [...targetEx.sets];
      const targetSet = { ...targetSets[setIndex] };

      const willBeCompleted = !targetSet.isCompleted;
      targetSet.isCompleted = willBeCompleted;
      targetSets[setIndex] = targetSet;
      targetEx.sets = targetSets;

      // Auto start rest timer on completion
      if (willBeCompleted) {
        soundEffects.playCountdownPip();
        setTimerSeconds(targetEx.restSeconds || 90);
        setTimerOpen(true);
      }

      updated[exIndex] = targetEx;
      return updated;
    });
  };

  // Update set weight / reps
  const handleUpdateSet = (exIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => {
    setExercises(prev => {
      const updated = [...prev];
      const targetEx = { ...updated[exIndex] };
      const targetSets = [...targetEx.sets];
      targetSets[setIndex] = {
        ...targetSets[setIndex],
        [field]: Math.max(0, value)
      };
      targetEx.sets = targetSets;
      updated[exIndex] = targetEx;
      return updated;
    });
  };

  // Add a set to an exercise
  const handleAddSet = (exIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      const targetEx = { ...updated[exIndex] };
      const lastSet = targetEx.sets[targetEx.sets.length - 1];
      const newSet: ExerciseSet = {
        id: `set-${Date.now()}`,
        setNumber: targetEx.sets.length + 1,
        weight: lastSet ? lastSet.weight : 20,
        reps: lastSet ? lastSet.reps : 10,
        isCompleted: false,
        type: 'normal'
      };
      targetEx.sets = [...targetEx.sets, newSet];
      updated[exIndex] = targetEx;
      return updated;
    });
  };

  // Delete a set
  const handleDeleteSet = (exIndex: number, setIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      const targetEx = { ...updated[exIndex] };
      if (targetEx.sets.length <= 1) return prev; // keep at least 1 set
      const targetSets = targetEx.sets.filter((_, idx) => idx !== setIndex).map((s, idx) => ({
        ...s,
        setNumber: idx + 1
      }));
      targetEx.sets = targetSets;
      updated[exIndex] = targetEx;
      return updated;
    });
  };

  // Generate 3 progressive warm-up sets based on working weight
  const handleAddWarmupSets = (exIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      const targetEx = { ...updated[exIndex] };
      const workWeight = targetEx.sets[0]?.weight || 60;

      const warmups: ExerciseSet[] = [
        {
          id: `w1-${Date.now()}`,
          setNumber: 1,
          weight: Math.max(10, Math.round((workWeight * 0.45) / 2.5) * 2.5),
          reps: 8,
          isCompleted: false,
          type: 'warmup'
        },
        {
          id: `w2-${Date.now()}`,
          setNumber: 2,
          weight: Math.max(15, Math.round((workWeight * 0.65) / 2.5) * 2.5),
          reps: 4,
          isCompleted: false,
          type: 'warmup'
        },
        {
          id: `w3-${Date.now()}`,
          setNumber: 3,
          weight: Math.max(20, Math.round((workWeight * 0.85) / 2.5) * 2.5),
          reps: 2,
          isCompleted: false,
          type: 'warmup'
        }
      ];

      // Combine warmups before working sets and re-index set numbers
      const combined = [...warmups, ...targetEx.sets].map((s, idx) => ({
        ...s,
        setNumber: idx + 1
      }));

      targetEx.sets = combined;
      updated[exIndex] = targetEx;
      soundEffects.playCountdownPip();
      return updated;
    });
  };

  // Toggle Finish Exercise
  const handleToggleFinishExercise = (exIndex: number) => {
    setExercises(prev => {
      const updated = [...prev];
      const targetEx = { ...updated[exIndex] };
      targetEx.isFinished = !targetEx.isFinished;
      
      // If marking as finished, mark remaining sets as completed too
      if (targetEx.isFinished) {
        targetEx.sets = targetEx.sets.map(s => ({ ...s, isCompleted: true }));
        soundEffects.playCountdownPip();
      }

      updated[exIndex] = targetEx;
      return updated;
    });
  };

  // Remove entire exercise
  const handleRemoveExercise = (exIndex: number) => {
    if (confirm('Remove this exercise from current workout?')) {
      setExercises(prev => prev.filter((_, idx) => idx !== exIndex));
    }
  };

  // Reorder exercises during active workout
  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= exercises.length) return;
    const updated = [...exercises];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setExercises(updated);
  };

  // Add custom or library exercise
  const handleSelectNewExercise = (name: string, muscle: MuscleGroup) => {
    const newEx: ActiveExercise = {
      id: `ex-added-${Date.now()}`,
      name,
      muscle,
      restSeconds: 90,
      isFinished: false,
      sets: [
        { id: `s1-${Date.now()}`, setNumber: 1, weight: 20, reps: 10, isCompleted: false, type: 'normal' },
        { id: `s2-${Date.now()}`, setNumber: 2, weight: 20, reps: 10, isCompleted: false, type: 'normal' },
        { id: `s3-${Date.now()}`, setNumber: 3, weight: 20, reps: 10, isCompleted: false, type: 'normal' },
      ]
    };
    setExercises(prev => [...prev, newEx]);
    setAddExerciseOpen(false);
    setSearchExercise('');
  };

  // Open Gemini Exercise Swap
  const handleOpenSwap = async (exIndex: number) => {
    setSwapExIndex(exIndex);
    const targetEx = exercises[exIndex];
    setLoadingAlternatives(true);
    setSwapAlternatives([]);

    try {
      const suggestions = await geminiService.suggestExerciseAlternatives(targetEx.name);
      setSwapAlternatives(suggestions);
    } catch {
      // Fallback
      setSwapAlternatives([
        { name: `Dumbbell ${targetEx.name}`, equipment: 'Dumbbells', reason: 'Unilateral free weight variation' }
      ]);
    } finally {
      setLoadingAlternatives(false);
    }
  };

  const handleSelectAlternative = (newExerciseName: string) => {
    if (swapExIndex === null) return;
    setExercises(prev => {
      const updated = [...prev];
      const targetEx = { ...updated[swapExIndex] };
      targetEx.name = newExerciseName;
      targetEx.muscle = geminiService.inferMuscle(newExerciseName, targetEx.muscle);
      updated[swapExIndex] = targetEx;
      return updated;
    });
    setSwapExIndex(null);
  };

  // Calculate live summary
  const totalVolume = exercises.reduce((acc, ex) => {
    return acc + ex.sets.reduce((sAcc, s) => s.isCompleted ? sAcc + (s.weight * s.reps) : sAcc, 0);
  }, 0);

  const completedSetsCount = exercises.reduce((acc, ex) => {
    return acc + ex.sets.filter(s => s.isCompleted).length;
  }, 0);

  const totalSetsCount = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  return (
    <div className="max-w-3xl mx-auto pb-28 animate-fade-in px-3 sm:px-4">
      
      {/* Top Sticky Workout Header */}
      <div className="sticky top-16 z-30 bg-black/90 backdrop-blur-md border-b border-zinc-800 -mx-3 sm:-mx-4 px-4 py-3 mb-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-lg sm:text-xl font-extrabold text-white truncate max-w-[200px] sm:max-w-md">
                {workout.routineName}
              </h1>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 mt-1">
              <span>⏱️ {formatElapsed(elapsedSeconds)}</span>
              <span>⚡ {totalVolume.toLocaleString()} {unit}</span>
              <span>✅ {completedSetsCount}/{totalSetsCount} sets</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlateCalcOpen(true)}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-semibold text-xs flex items-center gap-1.5 transition-all"
              title="Barbell Plate Calculator"
            >
              <Calculator size={16} />
              <span className="hidden sm:inline">Plates</span>
            </button>

            <button
              onClick={() => {
                setTimerSeconds(90);
                setTimerOpen(true);
              }}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 text-emerald-400 font-semibold text-xs flex items-center gap-1.5 transition-all"
              title="Open Rest Timer"
            >
              <TimerIcon size={16} />
              <span className="hidden sm:inline">Rest Timer</span>
            </button>

            <button
              onClick={() => setFinishModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
            >
              <Check size={16} />
              <span>Finish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Exercises List */}
      <div className="space-y-4">
        {exercises.map((ex, exIndex) => {
          const isCollapsed = collapsed[ex.id];
          const allCompleted = ex.sets.every(s => s.isCompleted);

          return (
            <div
              key={ex.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                ex.isFinished
                  ? 'bg-gradient-to-br from-emerald-950/40 via-zinc-900/90 to-zinc-950 border-emerald-500/70 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                  : 'bg-zinc-900/70 border-zinc-800'
              }`}
            >
              {/* Exercise Completed Banner */}
              {ex.isFinished && (
                <div className="px-4 py-2 bg-emerald-500/20 border-b border-emerald-500/30 flex items-center justify-between text-xs font-bold text-emerald-400 animate-fade-in">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> EXERCISE DONE FOR TODAY
                  </span>
                  <span className="text-[10px] text-zinc-300 font-medium">Finished! Ready for next lift</span>
                </div>
              )}

              {/* Exercise Header */}
              <div className="p-4 flex items-center justify-between border-b border-zinc-800/60">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleFinishExercise(exIndex)}
                    className={`p-2 rounded-xl transition-all ${
                      ex.isFinished
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30'
                        : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                    }`}
                    title={ex.isFinished ? 'Exercise Completed! Click to reopen' : 'Mark Exercise Finished'}
                  >
                    <CheckCircle2 size={18} />
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold text-base ${ex.isFinished ? 'text-emerald-300' : 'text-white'}`}>
                        {ex.name}
                      </h3>
                      {ex.isFinished && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Done
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">
                        {ex.muscle}
                      </span>
                      <span>Rest: {ex.restSeconds}s</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Reorder Exercise Cards Up / Down */}
                  <div className="flex items-center bg-zinc-950/80 rounded-lg border border-zinc-800 p-0.5 mr-1">
                    <button
                      onClick={() => handleMoveExercise(exIndex, 'up')}
                      disabled={exIndex === 0}
                      className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 rounded"
                      title="Move Exercise Up"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      onClick={() => handleMoveExercise(exIndex, 'down')}
                      disabled={exIndex === exercises.length - 1}
                      className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 rounded"
                      title="Move Exercise Down"
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>

                  <button
                    onClick={() => handleOpenSwap(exIndex)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800"
                    title="Swap exercise with Gemini AI"
                  >
                    <Shuffle size={15} />
                  </button>
                  <button
                    onClick={() => {
                      setTimerSeconds(ex.restSeconds || 90);
                      setTimerOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800"
                    title="Rest Timer"
                  >
                    <TimerIcon size={16} />
                  </button>
                  <button
                    onClick={() => handleRemoveExercise(exIndex)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                    title="Remove exercise"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => setCollapsed(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                  >
                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                </div>
              </div>

              {/* Sets Table */}
              {!isCollapsed && (
                <div className="p-3 sm:p-4">
                  {/* Table Headers */}
                  <div className="grid grid-cols-12 gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 px-2 text-center">
                    <span className="col-span-2 text-left">Set</span>
                    <span className="col-span-4">{unit.toUpperCase()}</span>
                    <span className="col-span-3">Reps</span>
                    <span className="col-span-3 text-right">Done</span>
                  </div>

                  {/* Set Rows */}
                  <div className="space-y-2">
                    {ex.sets.map((set, sIndex) => (
                      <div
                        key={set.id}
                        className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl border transition-all ${
                          set.isCompleted
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : 'bg-zinc-950/60 border-zinc-800/60'
                        }`}
                      >
                        {/* Set Number */}
                        <div className="col-span-2 flex items-center gap-1.5">
                          {set.type === 'warmup' ? (
                            <span
                              className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center justify-center"
                              title="Warm-up Set"
                            >
                              W
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded-lg bg-zinc-800 text-xs font-mono font-bold flex items-center justify-center text-zinc-300">
                              {set.setNumber}
                            </span>
                          )}
                        </div>

                        {/* Weight Input */}
                        <div className="col-span-4 flex items-center justify-center">
                          <input
                            type="number"
                            step="0.5"
                            value={set.weight}
                            onChange={e => handleUpdateSet(exIndex, sIndex, 'weight', parseFloat(e.target.value) || 0)}
                            className="w-full max-w-[90px] py-1.5 px-2 text-center font-mono font-bold text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        {/* Reps Input */}
                        <div className="col-span-3 flex items-center justify-center">
                          <input
                            type="number"
                            value={set.reps}
                            onChange={e => handleUpdateSet(exIndex, sIndex, 'reps', parseInt(e.target.value, 10) || 0)}
                            className="w-full max-w-[70px] py-1.5 px-2 text-center font-mono font-bold text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        {/* Checkbox / Action */}
                        <div className="col-span-3 flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleSet(exIndex, sIndex)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-all shadow-sm ${
                              set.isCompleted
                                ? 'bg-emerald-500 text-black shadow-emerald-500/20'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                            }`}
                          >
                            <Check size={18} strokeWidth={set.isCompleted ? 3 : 2} />
                          </button>

                          <button
                            onClick={() => handleDeleteSet(exIndex, sIndex)}
                            className="p-1 text-zinc-600 hover:text-red-400"
                            title="Delete set"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Exercise Footer: Add Set & Finish Exercise button */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/40">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddSet(exIndex)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition-colors"
                      >
                        <Plus size={14} /> Add Set
                      </button>

                      <button
                        onClick={() => handleAddWarmupSets(exIndex)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold transition-colors"
                        title="Add 3 progressive warm-up sets"
                      >
                        <Flame size={13} /> + Warm-up
                      </button>
                    </div>

                    <button
                      onClick={() => handleToggleFinishExercise(exIndex)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                        ex.isFinished
                          ? 'bg-zinc-800 text-zinc-400'
                          : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {ex.isFinished ? 'Reopen Exercise' : 'Finish Exercise ✓'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Workout Action Bar */}
      <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => setAddExerciseOpen(true)}
          className="w-full sm:flex-1 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md"
        >
          <Plus size={18} className="text-emerald-400" /> Add Another Exercise
        </button>

        <button
          onClick={() => setFinishModalOpen(true)}
          className="w-full sm:flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Check size={18} /> Finish Workout
        </button>

        <button
          onClick={() => {
            if (confirm('Are you sure you want to cancel and discard this active workout?')) {
              storageService.clearActiveWorkout();
              onWorkoutDiscarded();
            }
          }}
          className="py-2.5 px-4 text-xs font-semibold text-zinc-500 hover:text-red-400 transition-colors"
        >
          Discard Workout
        </button>
      </div>

      {/* Rest Timer Modal */}
      <RestTimerModal
        initialSeconds={timerSeconds}
        isOpen={timerOpen}
        onClose={() => setTimerOpen(false)}
      />

      {/* Finish Workout Modal */}
      <FinishWorkoutModal
        isOpen={finishModalOpen}
        onClose={() => setFinishModalOpen(false)}
        onSave={(completed) => {
          storageService.clearActiveWorkout();
          onWorkoutFinished(completed);
        }}
        routineName={workout.routineName}
        startTime={workout.startTime}
        exercises={exercises}
        unit={unit}
      />

      {/* Add Exercise Modal */}
      {addExerciseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md p-6 max-h-[85vh] flex flex-col shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-3">Add Exercise</h3>
            
            <input
              type="text"
              value={searchExercise}
              onChange={e => setSearchExercise(e.target.value)}
              placeholder="Search or type custom exercise..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 mb-4"
              autoFocus
            />

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {COMMON_EXERCISES.filter(e => e.name.toLowerCase().includes(searchExercise.toLowerCase())).map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectNewExercise(item.name, item.muscle)}
                  className="w-full text-left p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 flex items-center justify-between text-sm transition-colors"
                >
                  <span className="font-semibold text-zinc-200">{item.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{item.muscle}</span>
                </button>
              ))}

              {searchExercise.trim().length > 0 && !COMMON_EXERCISES.some(e => e.name.toLowerCase() === searchExercise.trim().toLowerCase()) && (
                <button
                  onClick={() => handleSelectNewExercise(searchExercise.trim(), 'Full Body')}
                  className="w-full text-left p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-sm flex items-center gap-2"
                >
                  <Plus size={16} /> Add custom: "{searchExercise.trim()}"
                </button>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setAddExerciseOpen(false)}
                className="w-full py-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barbell Plate Calculator Modal */}
      <PlateCalculatorModal
        isOpen={plateCalcOpen}
        onClose={() => setPlateCalcOpen(false)}
        defaultWeight={unit === 'kg' ? 80 : 185}
        unit={unit}
      />

      {/* Gemini Exercise Swap Modal */}
      {swapExIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Swap Exercise with Gemini</h3>
                  <p className="text-xs text-zinc-400">Biomechanically equivalent alternatives</p>
                </div>
              </div>
              <button onClick={() => setSwapExIndex(null)} className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-3">
              Replacing: <span className="font-bold text-white">{exercises[swapExIndex]?.name}</span>
            </p>

            {loadingAlternatives ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-zinc-400">
                <Loader2 size={24} className="animate-spin text-emerald-400" />
                <span>Gemini 3.8 Flash is analyzing biomechanical variations...</span>
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

            <button
              onClick={() => setSwapExIndex(null)}
              className="w-full mt-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

