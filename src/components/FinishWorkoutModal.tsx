import React, { useState } from 'react';
import { Trophy, Clock, Dumbbell, Flame, CheckCircle2, X } from 'lucide-react';
import { ActiveExercise, CompletedWorkout } from '../types';
import { soundEffects } from '../utils/audio';
import { isoDay } from '../utils/history';

interface FinishWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (summary: CompletedWorkout) => void;
  routineName: string;
  routineId?: string;
  startTime: number;
  exercises: ActiveExercise[];
  unit?: 'kg' | 'lbs';
}

export const FinishWorkoutModal: React.FC<FinishWorkoutModalProps> = ({
  isOpen,
  onClose,
  onSave,
  routineName,
  routineId,
  startTime,
  exercises,
  unit = 'kg',
}) => {
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const endTime = Date.now();
  const durationMinutes = Math.max(1, Math.round((endTime - startTime) / (1000 * 60)));

  // Calculate statistics
  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;

  exercises.forEach(ex => {
    ex.sets.forEach(s => {
      if (s.isCompleted) {
        totalSets++;
        totalReps += s.reps;
        totalVolume += s.weight * s.reps;
      }
    });
  });

  // Personal records hit during this session (best set per exercise).
  const prs = exercises
    .map(ex => {
      const prSets = ex.sets.filter(s => s.isCompleted && s.isPR);
      if (!prSets.length) return null;
      const best = prSets.reduce((a, b) => (b.weight * (1 + b.reps / 30) > a.weight * (1 + a.reps / 30) ? b : a));
      return { exerciseName: ex.name, weight: best.weight, reps: best.reps };
    })
    .filter((p): p is { exerciseName: string; weight: number; reps: number } => p !== null);

  const handleSave = () => {
    soundEffects.playCelebration();
    const completedWorkout: CompletedWorkout = {
      id: 'cw-' + Date.now(),
      routineId,
      routineName: routineName || 'Workout Session',
      date: isoDay(new Date(startTime)),
      startTime,
      endTime,
      durationMinutes,
      totalVolumeKg: totalVolume,
      totalSets,
      totalReps,
      exercises,
      notes: notes.trim() || undefined,
      prs: prs.length ? prs : undefined,
    };

    onSave(completedWorkout);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
        >
          <X size={18} />
        </button>

        {/* Hero Banner */}
        <div className="text-center mt-2 mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3 animate-bounce">
            <Trophy size={32} />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Workout Crushed!</h2>
          <p className="text-sm text-zinc-400 mt-1">{routineName}</p>
        </div>

        {/* 3 Key Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center text-emerald-400 mb-1">
              <Clock size={18} />
            </div>
            <span className="text-xl font-bold font-mono text-white">{durationMinutes}m</span>
            <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mt-0.5">Duration</p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center text-emerald-400 mb-1">
              <Dumbbell size={18} />
            </div>
            <span className="text-xl font-bold font-mono text-white">
              {totalVolume.toLocaleString()} <span className="text-xs text-zinc-400">{unit}</span>
            </span>
            <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mt-0.5">Volume</p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center text-emerald-400 mb-1">
              <Flame size={18} />
            </div>
            <span className="text-xl font-bold font-mono text-white">{totalSets}</span>
            <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mt-0.5">Sets Done</p>
          </div>
        </div>

        {/* Personal records */}
        {prs.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
              <Trophy size={14} /> {prs.length} new personal record{prs.length > 1 ? 's' : ''}
            </h4>
            <div className="space-y-1">
              {prs.map(pr => (
                <div key={pr.exerciseName} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-200 font-semibold">{pr.exerciseName}</span>
                  <span className="font-mono font-bold text-amber-300">{pr.weight}{unit} × {pr.reps}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exercises Logged Summary */}
        <div className="mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Completed Exercises</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {exercises.map((ex, idx) => {
              const completedCount = ex.sets.filter(s => s.isCompleted).length;
              return (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className={completedCount > 0 ? "text-emerald-400" : "text-zinc-600"} />
                    <span className="font-semibold text-zinc-200">{ex.name}</span>
                  </div>
                  <span className="font-mono text-xs text-zinc-400">
                    {completedCount} / {ex.sets.length} sets
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Workout Notes */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
            Workout Notes (RPE, energy level, thoughts)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Felt strong on bench today, increased weight by 2.5kg smoothly..."
            rows={2}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-sm transition-all"
          >
            Keep Editing
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm transition-all shadow-lg shadow-emerald-500/20"
          >
            Save & Finish
          </button>
        </div>

      </div>
    </div>
  );
};

