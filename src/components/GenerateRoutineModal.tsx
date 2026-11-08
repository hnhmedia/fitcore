import React, { useState } from 'react';
import { Sparkles, Loader2, Dumbbell, Check, X, ShieldAlert } from 'lucide-react';
import { WorkoutRoutine } from '../types';
import { geminiService, RoutineGeneratorOptions } from '../services/geminiService';
import { storageService } from '../services/storageService';

interface GenerateRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoutineGenerated: (routine: WorkoutRoutine) => void;
  onOpenSettings: () => void;
}

export const GenerateRoutineModal: React.FC<GenerateRoutineModalProps> = ({
  isOpen,
  onClose,
  onRoutineGenerated,
  onOpenSettings,
}) => {
  const [split, setSplit] = useState<RoutineGeneratorOptions['split']>('Push');
  const [goal, setGoal] = useState<RoutineGeneratorOptions['goal']>('hypertrophy');
  const [experience, setExperience] = useState<RoutineGeneratorOptions['experienceLevel']>('intermediate');
  const [equipment, setEquipment] = useState<RoutineGeneratorOptions['equipment']>('full-gym');
  const [days, setDays] = useState(4);
  const [customNotes, setCustomNotes] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [generatedRoutine, setGeneratedRoutine] = useState<WorkoutRoutine | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasApiKey = Boolean(storageService.getGeminiApiKey());

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setGeneratedRoutine(null);

    try {
      const routine = await geminiService.generateRoutine({
        split,
        goal,
        experienceLevel: experience,
        equipment,
        daysPerWeek: days,
        customNotes: customNotes.trim() || undefined,
      });
      setGeneratedRoutine(routine);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to generate routine with Gemini');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!generatedRoutine) return;
    onRoutineGenerated(generatedRoutine);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl p-6 relative shadow-2xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Gemini AI Routine Architect</h2>
              <p className="text-xs text-zinc-400">Generate scientifically optimized workout programs</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          
          {!hasApiKey && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="shrink-0" />
                <span>Running in simulated AI mode. Connect your Gemini API key for live LLM generation.</span>
              </div>
              <button
                onClick={onOpenSettings}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-semibold text-[11px] shrink-0"
              >
                Connect Key
              </button>
            </div>
          )}

          {/* Split Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Focus Split
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body'] as const).map(item => (
                <button
                  key={item}
                  onClick={() => setSplit(item)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                    split === item
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Goal & Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Primary Goal
              </label>
              <select
                value={goal}
                onChange={e => setGoal(e.target.value as RoutineGeneratorOptions['goal'])}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="hypertrophy">Hypertrophy (Maximum Muscle Growth)</option>
                <option value="strength">Pure Strength & Power</option>
                <option value="fat-loss">Fat Loss & Conditioning (High Density)</option>
                <option value="endurance">Muscular Endurance & Stamina</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Experience Level
              </label>
              <select
                value={experience}
                onChange={e => setExperience(e.target.value as RoutineGeneratorOptions['experienceLevel'])}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="beginner">Beginner (&lt; 1 year lifting)</option>
                <option value="intermediate">Intermediate (1-3 years)</option>
                <option value="advanced">Advanced (3+ years solid training)</option>
              </select>
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Available Equipment
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'full-gym', label: 'Commercial Gym' },
                { id: 'dumbbells-only', label: 'Dumbbells Only' },
                { id: 'home-gym', label: 'Home Gym / Barbell' },
                { id: 'bodyweight', label: 'Bodyweight / Calisthenics' },
              ].map(eq => (
                <button
                  key={eq.id}
                  onClick={() => setEquipment(eq.id as RoutineGeneratorOptions['equipment'])}
                  className={`p-2.5 text-xs font-semibold rounded-xl border text-center transition-all ${
                    equipment === eq.id
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  {eq.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Specific Requests / Injuries / Emphasis
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={e => setCustomNotes(e.target.value)}
              placeholder="e.g. Focus on upper chest and lateral delts, prefer cable work"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Generated Result Preview */}
          {generatedRoutine && (
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-emerald-500/30 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-white text-base">{generatedRoutine.name}</h4>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                  {generatedRoutine.exercises.length} Exercises
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-3">{generatedRoutine.description}</p>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {generatedRoutine.exercises.map((ex, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs">
                    <div className="flex items-center gap-2">
                      <Dumbbell size={14} className="text-emerald-400" />
                      <span className="font-semibold text-zinc-200">{ex.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{ex.muscle}</span>
                    </div>
                    <span className="font-mono text-zinc-300">
                      {ex.targetSets} sets × {ex.targetReps} reps ({ex.restSeconds}s rest)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Actions */}
        <div className="pt-4 border-t border-zinc-800 flex items-center gap-3">
          {!generatedRoutine ? (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Synthesizing Training Plan with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Generate Workout with Gemini</span>
                </>
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs sm:text-sm"
              >
                Regenerate
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Check size={16} /> Save & Add Routine
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

