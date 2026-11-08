import React, { useState } from 'react';
import { 
  Plus, 
  Play, 
  Sparkles, 
  Upload, 
  Trash2, 
  Clock, 
  Dumbbell, 
  ChevronRight, 
  Layers, 
  FileText,
  Edit2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Check,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { WorkoutRoutine, ActiveExercise, CompletedWorkout } from '../types';
import { storageService, ActiveWorkoutState } from '../services/storageService';
import { ImportGeminiModal } from './ImportGeminiModal';
import { GenerateRoutineModal } from './GenerateRoutineModal';
import { CreateRoutineModal } from './CreateRoutineModal';

interface RoutineManagerProps {
  routines: WorkoutRoutine[];
  completedWorkouts?: CompletedWorkout[];
  onStartWorkout: (workout: ActiveWorkoutState) => void;
  onRoutinesChanged: (routines: WorkoutRoutine[]) => void;
  onOpenSettings: () => void;
}

export const RoutineManager: React.FC<RoutineManagerProps> = ({
  routines,
  completedWorkouts = [],
  onStartWorkout,
  onRoutinesChanged,
  onOpenSettings,
}) => {
  const [selectedRoutine, setSelectedRoutine] = useState<WorkoutRoutine | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<WorkoutRoutine | null>(null);

  const handleStart = (routine: WorkoutRoutine) => {
    const activeExercises: ActiveExercise[] = routine.exercises.map(e => ({
      id: `act-${e.id}-${Date.now()}`,
      name: e.name,
      muscle: e.muscle,
      restSeconds: e.restSeconds || 90,
      notes: e.notes,
      isFinished: false,
      sets: Array.from({ length: e.targetSets || 3 }).map((_, idx) => ({
        id: `s-${idx}-${Date.now()}`,
        setNumber: idx + 1,
        weight: e.defaultWeight || 20,
        reps: e.targetReps || 10,
        isCompleted: false,
        type: 'normal'
      }))
    }));

    const workoutState: ActiveWorkoutState = {
      routineId: routine.id,
      routineName: routine.name,
      startTime: Date.now(),
      exercises: activeExercises
    };

    onStartWorkout(workoutState);
  };

  const handleStartBlankWorkout = () => {
    const workoutState: ActiveWorkoutState = {
      routineName: 'Freeform Workout',
      startTime: Date.now(),
      exercises: [
        {
          id: `ex-blank-${Date.now()}`,
          name: 'Barbell Flat Bench Press',
          muscle: 'Chest',
          restSeconds: 90,
          isFinished: false,
          sets: [
            { id: `s1-${Date.now()}`, setNumber: 1, weight: 60, reps: 10, isCompleted: false, type: 'normal' },
            { id: `s2-${Date.now()}`, setNumber: 2, weight: 60, reps: 10, isCompleted: false, type: 'normal' },
            { id: `s3-${Date.now()}`, setNumber: 3, weight: 60, reps: 10, isCompleted: false, type: 'normal' },
          ]
        }
      ]
    };
    onStartWorkout(workoutState);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this workout routine?')) {
      const updated = storageService.deleteRoutine(id);
      onRoutinesChanged(updated);
      if (selectedRoutine?.id === id) {
        setSelectedRoutine(null);
      }
    }
  };

  const handleImportRoutine = (routine: WorkoutRoutine) => {
    const updated = storageService.addRoutine(routine);
    onRoutinesChanged(updated);
  };

  const handleGeneratedRoutine = (routine: WorkoutRoutine) => {
    const updated = storageService.addRoutine(routine);
    onRoutinesChanged(updated);
  };

  // Reorder routines up / down
  const handleMoveRoutine = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= routines.length) return;
    const updated = [...routines];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, movedItem);
    storageService.saveRoutines(updated);
    onRoutinesChanged(updated);
  };

  // Reorder exercises inside a routine
  const handleMoveExerciseInsideRoutine = (
    routineId: string,
    exerciseIndex: number,
    direction: 'up' | 'down',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;
    const targetIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;
    if (targetIndex < 0 || targetIndex >= routine.exercises.length) return;
    
    const updatedExercises = [...routine.exercises];
    const [moved] = updatedExercises.splice(exerciseIndex, 1);
    updatedExercises.splice(targetIndex, 0, moved);

    const updatedRoutine = { ...routine, exercises: updatedExercises };
    const allRoutines = routines.map(r => r.id === routineId ? updatedRoutine : r);
    storageService.saveRoutines(allRoutines);
    onRoutinesChanged(allRoutines);
    if (selectedRoutine?.id === routineId) {
      setSelectedRoutine(updatedRoutine);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 animate-fade-in pb-24">
      
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Workout Routines</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
              {routines.length} saved
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Build routines, reload Gemini exports, or generate new splits with AI.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setEditingRoutine(null);
              setIsCreateOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus size={16} className="text-emerald-400" />
            <span>Create Routine</span>
          </button>

          <button
            onClick={() => setIsGenerateOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
          >
            <Sparkles size={16} />
            <span>AI Routine</span>
          </button>

          <button
            onClick={() => setIsImportOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-zinc-200 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-all"
          >
            <Upload size={16} className="text-emerald-400" />
            <span>Reload / Import</span>
          </button>

          <button
            onClick={handleStartBlankWorkout}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs flex items-center gap-1.5 transition-all"
          >
            <Plus size={16} />
            <span>Quick Start</span>
          </button>
        </div>
      </div>

      {/* Routines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {routines.map((routine, rIndex) => {
          const isSelected = selectedRoutine?.id === routine.id;
          const todayStr = new Date().toISOString().split('T')[0];
          const lastWorkout = completedWorkouts.find(w => 
            w.routineId === routine.id || 
            w.routineName.toLowerCase() === routine.name.toLowerCase()
          );
          const isDoneToday = lastWorkout?.date === todayStr;

          return (
            <div
              key={routine.id}
              onClick={() => setSelectedRoutine(isSelected ? null : routine)}
              className={`rounded-2xl border p-5 cursor-pointer transition-all flex flex-col justify-between relative ${
                isDoneToday
                  ? 'bg-gradient-to-br from-emerald-950/40 via-zinc-900/90 to-zinc-950 border-emerald-500/70 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                  : isSelected
                  ? 'bg-zinc-900/90 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80'
              }`}
            >
              <div>
                {/* Completed Today Banner */}
                {isDoneToday && (
                  <div className="mb-3 p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs font-bold text-emerald-400 animate-fade-in">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={16} /> COMPLETED TODAY
                    </span>
                    <span className="text-[10px] text-zinc-300 font-medium">Done for the day!</span>
                  </div>
                )}

                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    {/* Move routine up / down */}
                    <div className="flex items-center bg-zinc-950/80 rounded-lg border border-zinc-800 p-0.5">
                      <button
                        onClick={(e) => handleMoveRoutine(rIndex, 'up', e)}
                        disabled={rIndex === 0}
                        className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-400 rounded"
                        title="Move Routine Up"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={(e) => handleMoveRoutine(rIndex, 'down', e)}
                        disabled={rIndex === routines.length - 1}
                        className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-400 rounded"
                        title="Move Routine Down"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>

                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-zinc-800 text-emerald-400 border border-zinc-700/60">
                      {routine.splitType}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {routine.source === 'gemini-ai' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Sparkles size={10} /> Gemini
                      </span>
                    )}
                    {routine.source === 'gemini-import' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Imported
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRoutine(routine);
                        setIsCreateOpen(true);
                      }}
                      className="p-1 text-zinc-500 hover:text-white ml-1"
                      title="Edit routine"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(routine.id, e)}
                      className="p-1 text-zinc-600 hover:text-red-400 ml-1"
                      title="Delete routine"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-white mb-1.5 flex items-center justify-between">
                  <span className={isDoneToday ? "text-emerald-100" : ""}>{routine.name}</span>
                  {isDoneToday && <Check size={18} className="text-emerald-400 shrink-0" />}
                </h3>
                <p className="text-xs text-zinc-400 line-clamp-2 mb-4">
                  {routine.description}
                </p>

                {/* Exercises Preview Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {routine.exercises.slice(0, 4).map((ex, i) => (
                    <span
                      key={i}
                      className={`text-[11px] px-2 py-0.5 rounded-md border ${
                        isDoneToday 
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                          : 'bg-zinc-950/80 text-zinc-300 border border-zinc-800/80'
                      }`}
                    >
                      {ex.name}
                    </span>
                  ))}
                  {routine.exercises.length > 4 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-950/80 text-zinc-400 border border-zinc-800/80">
                      +{routine.exercises.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> {routine.estimatedMinutes}m
                  </span>
                  <span className="flex items-center gap-1">
                    <Dumbbell size={13} /> {routine.exercises.length} lifts
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStart(routine);
                  }}
                  className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                    isDoneToday
                      ? 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/40'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                  }`}
                  title={isDoneToday ? "Already finished today - click to repeat if needed" : "Start Workout"}
                >
                  {isDoneToday ? (
                    <><RotateCcw size={13} /> Repeat</>
                  ) : (
                    <><Play size={14} /> Start</>
                  )}
                </button>
              </div>

              {/* Expanded details with exercise reordering */}
              {isSelected && (
                <div className="mt-4 pt-3 border-t border-zinc-800 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Exercise Breakdown (Reorderable)
                    </h4>
                    <span className="text-[10px] text-zinc-500">Use ↑ ↓ to reorder</span>
                  </div>

                  {routine.exercises.map((ex, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        {/* Move exercise up/down */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={(e) => handleMoveExerciseInsideRoutine(routine.id, idx, 'up', e)}
                            disabled={idx === 0}
                            className="text-zinc-500 hover:text-white disabled:opacity-20"
                            title="Move Exercise Up"
                          >
                            <ArrowUp size={11} />
                          </button>
                          <button
                            onClick={(e) => handleMoveExerciseInsideRoutine(routine.id, idx, 'down', e)}
                            disabled={idx === routine.exercises.length - 1}
                            className="text-zinc-500 hover:text-white disabled:opacity-20"
                            title="Move Exercise Down"
                          >
                            <ArrowDown size={11} />
                          </button>
                        </div>

                        <div>
                          <p className="font-semibold text-zinc-200">{ex.name}</p>
                          <p className="text-[10px] text-zinc-400">{ex.notes || ex.muscle}</p>
                        </div>
                      </div>

                      <div className="text-right font-mono text-zinc-300">
                        {ex.targetSets} sets × {ex.targetReps} reps ({ex.defaultWeight}kg)
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Modals */}
      <ImportGeminiModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportRoutine}
      />

      <GenerateRoutineModal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        onRoutineGenerated={handleGeneratedRoutine}
        onOpenSettings={onOpenSettings}
      />

      <CreateRoutineModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingRoutine(null);
        }}
        onSave={(routine) => {
          if (editingRoutine) {
            const current = storageService.getRoutines();
            const updated = current.map(r => r.id === routine.id ? routine : r);
            storageService.saveRoutines(updated);
            onRoutinesChanged(updated);
          } else {
            const updated = storageService.addRoutine(routine);
            onRoutinesChanged(updated);
          }
        }}
        initialRoutine={editingRoutine}
      />

    </div>
  );
};

