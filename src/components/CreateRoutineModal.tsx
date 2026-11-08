import React, { useState } from 'react';
import { Plus, Trash2, Dumbbell, Clock, X, Check } from 'lucide-react';
import { WorkoutRoutine, MuscleGroup } from '../types';

interface CreateRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (routine: WorkoutRoutine) => void;
  initialRoutine?: WorkoutRoutine | null;
}

export const CreateRoutineModal: React.FC<CreateRoutineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRoutine,
}) => {
  const [name, setName] = useState(initialRoutine?.name || '');
  const [description, setDescription] = useState(initialRoutine?.description || '');
  const [splitType, setSplitType] = useState<WorkoutRoutine['splitType']>(initialRoutine?.splitType || 'Push');
  const [estimatedMinutes, setEstimatedMinutes] = useState(initialRoutine?.estimatedMinutes || 55);
  const [exercises, setExercises] = useState<WorkoutRoutine['exercises']>(
    initialRoutine?.exercises || [
      {
        id: `ex-cr-${Date.now()}-1`,
        name: 'Barbell Flat Bench Press',
        muscle: 'Chest',
        targetSets: 4,
        targetReps: 8,
        defaultWeight: 80,
        restSeconds: 90,
        notes: ''
      }
    ]
  );

  if (!isOpen) return null;

  const handleAddExercise = () => {
    setExercises(prev => [
      ...prev,
      {
        id: `ex-cr-${Date.now()}-${prev.length + 1}`,
        name: 'New Exercise',
        muscle: 'Chest',
        targetSets: 3,
        targetReps: 10,
        defaultWeight: 20,
        restSeconds: 90,
        notes: ''
      }
    ]);
  };

  const handleRemoveExercise = (idx: number) => {
    if (exercises.length <= 1) return;
    setExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateExercise = <K extends keyof WorkoutRoutine['exercises'][0]>(
    idx: number,
    field: K,
    value: WorkoutRoutine['exercises'][0][K]
  ) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const routine: WorkoutRoutine = {
      id: initialRoutine?.id || `routine-custom-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || 'Custom created workout routine',
      splitType,
      estimatedMinutes: Number(estimatedMinutes) || 50,
      createdAt: initialRoutine?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'user',
      exercises
    };

    onSave(routine);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl p-6 relative shadow-2xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Dumbbell size={18} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {initialRoutine ? 'Edit Routine' : 'Create Custom Routine'}
              </h3>
              <p className="text-xs text-zinc-400">Configure exercises, sets, reps, and target weights</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Routine Title *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Chest & Tricep Hypertrophy"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Split Type
              </label>
              <select
                value={splitType}
                onChange={e => setSplitType(e.target.value as WorkoutRoutine['splitType'])}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 h-[42px]"
              >
                <option value="Push">Push</option>
                <option value="Pull">Pull</option>
                <option value="Legs">Legs</option>
                <option value="Upper">Upper</option>
                <option value="Lower">Lower</option>
                <option value="Full Body">Full Body</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Description / Notes
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Heavy compound bench followed by tricep volume"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Exercises Header */}
          <div className="flex items-center justify-between pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Exercises ({exercises.length})
            </h4>
            <button
              type="button"
              onClick={handleAddExercise}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-1 transition-all"
            >
              <Plus size={14} /> Add Exercise
            </button>
          </div>

          {/* Exercises List */}
          <div className="space-y-3">
            {exercises.map((ex, idx) => (
              <div
                key={ex.id || idx}
                className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="w-5 h-5 rounded-md bg-zinc-800 font-mono font-bold flex items-center justify-center text-[10px] text-zinc-300">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={ex.name}
                    onChange={e => handleUpdateExercise(idx, 'name', e.target.value)}
                    placeholder="Exercise Name"
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <select
                    value={ex.muscle}
                    onChange={e => handleUpdateExercise(idx, 'muscle', e.target.value as MuscleGroup)}
                    className="bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
                  >
                    {['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Abs', 'Full Body'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(idx)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 mb-0.5">Sets</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={ex.targetSets}
                      onChange={e => handleUpdateExercise(idx, 'targetSets', parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-center font-mono font-bold text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 mb-0.5">Reps</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={ex.targetReps}
                      onChange={e => handleUpdateExercise(idx, 'targetReps', parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-center font-mono font-bold text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 mb-0.5">Weight (kg/lbs)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={ex.defaultWeight}
                      onChange={e => handleUpdateExercise(idx, 'defaultWeight', parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-center font-mono font-bold text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-400 mb-0.5">Rest (s)</label>
                    <input
                      type="number"
                      step="15"
                      value={ex.restSeconds}
                      onChange={e => handleUpdateExercise(idx, 'restSeconds', parseInt(e.target.value, 10) || 60)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-1.5 text-center font-mono font-bold text-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-zinc-800 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Check size={16} /> Save Routine
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

