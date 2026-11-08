import React, { useState } from 'react';
import { Trophy, Clock, Dumbbell, Flame, CheckCircle2, X } from 'lucide-react';
import { ActiveExercise, CompletedWorkout } from '../types';
import { soundEffects } from '../utils/audio';

interface FinishWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (summary: CompletedWorkout) => void;
  routineName: string;
  startTime: number;
  exercises: ActiveExercise[];
  unit?: 'kg' | 'lbs';
}

export const FinishWorkoutModal: React.FC<FinishWorkoutModalProps> = ({
  isOpen,
  onClose,
  onSave,
  routineName,
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

  const handleSave = () => {
    soundEffects.playCelebration();
    const completedWorkout: CompletedWorkout = {
      id: 'cw-' + Date.now(),
      routineName: routineName || 'Workout Session',
      date: new Date().toISOString().split('T')[0],
      startTime,
      endTime,
      durationMinutes,
      totalVolumeKg: totalVolume,
      totalSets,
      totalReps,
      exercises,
      notes: notes.trim() || undefined,
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

