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
import { workoutFromRoutine, blankWorkout, lastDoneDate, isoDay, daysAgo } from '../utils/history';
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
    const unit = storageService.getPreferences().unit || 'kg';
    onStartWorkout(workoutFromRoutine(routine, completedWorkouts, unit));
  };

  const handleStartBlankWorkout = () => onStartWorkout(blankWorkout());

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
      
      {/* Header */}
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Routines</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{routines.length} saved · tap one to see its exercises</p>
        </div>
        <button
          onClick={() => setIsImportOpen(true)}
          className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300"
          title="Import from Gemini / backup"
          aria-label="Import routine"
        >
          <Upload size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          onClick={() => {
            setEditingRoutine(null);
            setIsCreateOpen(true);
          }}
          className="py-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-white font-bold text-sm flex items-center justify-center gap-1.5"
        >
          <Plus size={16} className="text-emerald-400" /> New routine
        </button>
        <button
          onClick={() => setIsGenerateOpen(true)}
          className="py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm flex items-center justify-center gap-1.5"
        >
          <Sparkles size={16} /> AI routine
        </button>
      </div>

      {routines.length === 0 && (
        <div className="text-center py-12 px-6 rounded-3xl border border-dashed border-zinc-800">
          <Dumbbell size={28} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-sm font-bold text-white">No routines yet</p>
          <p className="text-xs text-zinc-400 mt-1">Create your own split, or let the AI build one for your goal.</p>
          <button onClick={handleStartBlankWorkout} className="mt-4 text-xs font-bold text-emerald-400">
            Or just start an empty workout →
          </button>
        </div>
      )}

      {/* Routine list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {routines.map((routine, rIndex) => {
          const isSelected = selectedRoutine?.id === routine.id;
          const last = lastDoneDate(completedWorkouts, routine);
          const isDoneToday = last === isoDay(new Date());

          return (
            <div
              key={routine.id}
              className={`rounded-2xl border transition-all ${
                isDoneToday
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : isSelected
                  ? 'bg-zinc-900 border-zinc-700'
                  : 'bg-zinc-900/60 border-zinc-800'
              }`}
            >
              <div className="p-3.5 flex items-center gap-3">
                <button className="min-w-0 flex-1 text-left" onClick={() => setSelectedRoutine(isSelected ? null : routine)}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">{routine.splitType}</span>
                    {routine.source === 'gemini-ai' && <Sparkles size={10} className="text-emerald-400" />}
                    {isDoneToday && (
                      <span className="text-[10px] font-black text-emerald-300 flex items-center gap-0.5">
                        <CheckCircle2 size={11} /> DONE TODAY
                      </span>
                    )}
                  </div>
                  <h3 className="text-[15px] font-bold text-white leading-snug line-clamp-2">{routine.name}</h3>
                  <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1"><Dumbbell size={11} /> {routine.exercises.length}</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {routine.estimatedMinutes}m</span>
                    <span>{last ? `last done ${daysAgo(last)}` : 'never done'}</span>
                  </p>
                </button>
                <button
                  onClick={() => handleStart(routine)}
                  className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center active:scale-95 ${
                    isDoneToday ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-500 text-black'
                  }`}
                  title={isDoneToday ? 'Repeat workout' : 'Start workout'}
                  aria-label={`Start ${routine.name}`}
                >
                  {isDoneToday ? <RotateCcw size={18} /> : <Play size={20} fill="currentColor" />}
                </button>
              </div>

              {isSelected && (
                <div className="px-3.5 pb-3.5 pt-1 border-t border-zinc-800/80 animate-fade-in">
                  {routine.description && <p className="text-xs text-zinc-400 my-2">{routine.description}</p>}
                  <div className="space-y-1.5 mt-2">
                    {routine.exercises.map((ex, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/70 text-xs">
                        <div className="flex flex-col">
                          <button
                            onClick={(e) => handleMoveExerciseInsideRoutine(routine.id, idx, 'up', e)}
                            disabled={idx === 0}
                            className="text-zinc-500 hover:text-white disabled:opacity-20 p-0.5"
                            aria-label="Move exercise up"
                          >
                            <ArrowUp size={11} />
                          </button>
                          <button
                            onClick={(e) => handleMoveExerciseInsideRoutine(routine.id, idx, 'down', e)}
                            disabled={idx === routine.exercises.length - 1}
                            className="text-zinc-500 hover:text-white disabled:opacity-20 p-0.5"
                            aria-label="Move exercise down"
                          >
                            <ArrowDown size={11} />
                          </button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-zinc-200 truncate">{ex.name}</p>
                          <p className="text-[10px] text-zinc-500">{ex.muscle}</p>
                        </div>
                        <span className="font-mono text-zinc-400 shrink-0">{ex.targetSets}×{ex.targetReps}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 mt-3">
                    <button
                      onClick={(e) => handleMoveRoutine(rIndex, 'up', e)}
                      disabled={rIndex === 0}
                      className="p-2 rounded-xl bg-zinc-800/70 text-zinc-400 disabled:opacity-25"
                      aria-label="Move routine up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={(e) => handleMoveRoutine(rIndex, 'down', e)}
                      disabled={rIndex === routines.length - 1}
                      className="p-2 rounded-xl bg-zinc-800/70 text-zinc-400 disabled:opacity-25"
                      aria-label="Move routine down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingRoutine(routine);
                        setIsCreateOpen(true);
                      }}
                      className="ml-auto px-3 py-2 rounded-xl bg-zinc-800/70 text-zinc-200 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={(e) => handleDelete(routine.id, e)}
                      className="px-3 py-2 rounded-xl bg-zinc-800/70 text-red-400 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
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

