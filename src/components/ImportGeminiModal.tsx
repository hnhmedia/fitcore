import React, { useState } from 'react';
import { Sparkles, Copy, Check, Upload, AlertCircle, Dumbbell, X } from 'lucide-react';
import { WorkoutRoutine } from '../types';
import { geminiService } from '../services/geminiService';

interface ImportGeminiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (routine: WorkoutRoutine) => void;
}

export const ImportGeminiModal: React.FC<ImportGeminiModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [inputText, setInputText] = useState('');
  const [previewRoutine, setPreviewRoutine] = useState<WorkoutRoutine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setInputText(text);
    setError(null);
    if (!text.trim()) {
      setPreviewRoutine(null);
      return;
    }

    try {
      const parsed = geminiService.parseRoutineTextOrJson(text);
      if (parsed.exercises && parsed.exercises.length > 0) {
        setPreviewRoutine(parsed);
      } else {
        setPreviewRoutine(null);
      }
    } catch {
      setError('Could not automatically parse routine. Ensure it contains exercise names and sets/reps.');
      setPreviewRoutine(null);
    }
  };

  const handleCopyPrompt = () => {
    const prompt = geminiService.generateGeminiWebExportPrompt();
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleConfirmImport = () => {
    if (!previewRoutine) return;
    onImport(previewRoutine);
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
              <h2 className="text-lg font-bold text-white">Import Routine from Gemini</h2>
              <p className="text-xs text-zinc-400">Paste any text or JSON exported from Gemini / ChatGPT</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          
          {/* Quick Helper Banner */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-zinc-200">Asking Gemini in web chat?</p>
              <p className="text-[11px] text-zinc-400">Copy our optimized prompt, paste into Gemini, and copy back the answer.</p>
            </div>
            <button
              onClick={handleCopyPrompt}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto shrink-0"
            >
              {copiedPrompt ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedPrompt ? 'Prompt Copied!' : 'Copy Gemini Prompt'}</span>
            </button>
          </div>

          {/* Paste Input Area */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Paste Routine Text or JSON Here:
            </label>
            <textarea
              value={inputText}
              onChange={e => handleTextChange(e.target.value)}
              placeholder={`Example JSON or Text:\n\n1. Barbell Flat Bench Press: 4 sets x 8 reps @ 80kg\n2. Incline Dumbbell Press: 3 sets x 10 reps @ 28kg\n3. Dumbbell Lateral Raises: 4 sets x 12 reps\n4. Tricep Pushdowns: 3 sets x 12 reps`}
              rows={6}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-xs sm:text-sm font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/40 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Live Preview */}
          {previewRoutine && (
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-emerald-500/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <h4 className="font-bold text-white text-sm">{previewRoutine.name}</h4>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                  {previewRoutine.exercises.length} Exercises Detected
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {previewRoutine.exercises.map((ex, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs">
                    <div className="flex items-center gap-2">
                      <Dumbbell size={14} className="text-emerald-400" />
                      <span className="font-semibold text-zinc-200">{ex.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{ex.muscle}</span>
                    </div>
                    <span className="font-mono text-zinc-300">
                      {ex.targetSets} sets × {ex.targetReps} reps @ {ex.defaultWeight}kg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Actions */}
        <div className="pt-4 border-t border-zinc-800 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!previewRoutine}
            className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Upload size={16} /> Import into App
          </button>
        </div>

      </div>
    </div>
  );
};

