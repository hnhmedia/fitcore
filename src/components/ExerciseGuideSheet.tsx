import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, PlayCircle, Sparkles, Loader2, AlertTriangle, Target } from 'lucide-react';
import { findGuide } from '../utils/exerciseGuides';
import { findLibraryExercise } from '../utils/exerciseLibrary';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';

interface Props {
  exerciseName: string | null;
  onClose: () => void;
}

const Section: React.FC<{ title: string; items: string[]; numbered?: boolean; tone?: 'warn' }> = ({ title, items, numbered, tone }) => (
  <div>
    <h4 className={`text-[11px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5 ${tone === 'warn' ? 'text-amber-400' : 'text-zinc-500'}`}>
      {tone === 'warn' && <AlertTriangle size={12} />} {title}
    </h4>
    <ol className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-zinc-200 leading-snug">
          <span
            className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 mt-px ${
              tone === 'warn' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
            }`}
          >
            {numbered ? i + 1 : tone === 'warn' ? '!' : '•'}
          </span>
          <span>{t}</span>
        </li>
      ))}
    </ol>
  </div>
);

/** Bottom sheet with setup, step-by-step technique and common mistakes for an exercise. */
export const ExerciseGuideSheet: React.FC<Props> = ({ exerciseName, onClose }) => {
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  if (!exerciseName) return null;
  const guide = findGuide(exerciseName);
  const lib = findLibraryExercise(exerciseName);
  const videoUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exerciseName} proper form`)}`;
  const hasKey = Boolean(storageService.getGeminiApiKey());

  const askAi = async () => {
    setAiLoading(true);
    try {
      setAiText(
        await geminiService.generateWithGemini(
          `Explain how to do "${exerciseName}" with good form. Use short plain sections: Muscles worked, Setup (2-3 steps), How to do it (3-4 steps), Common mistakes (2-3). No intro sentence.`,
          'You are a certified strength coach. Be accurate, brief and safety-conscious.'
        )
      );
    } catch {
      setAiText('Could not reach the AI coach. Check your Gemini key and internet connection.');
    } finally {
      setAiLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[88vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-zinc-950/95 backdrop-blur px-5 pt-4 pb-3 border-b border-zinc-800/80 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">How to do it</p>
            <h3 className="text-lg font-black text-white leading-tight">{exerciseName}</h3>
            {(guide || lib) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {guide && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 flex items-center gap-1">
                    <Target size={11} /> {guide.primary}
                  </span>
                )}
                {guide?.secondary && <span className="text-[11px] px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300">+ {guide.secondary}</span>}
                {lib && <span className="text-[11px] px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-400">{lib.equipment}</span>}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-zinc-400 hover:text-white shrink-0" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {guide ? (
            <>
              <Section title="Setup" items={guide.setup} numbered />
              <Section title="Doing the rep" items={guide.steps} numbered />
              <Section title="Common mistakes" items={guide.mistakes} tone="warn" />
              {lib && (
                <div className="p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                  <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500 mb-1">Quick cues mid-set</p>
                  <p className="text-sm text-zinc-200">{lib.cues.join(' · ')}</p>
                </div>
              )}
            </>
          ) : aiText ? (
            <div className="text-sm text-zinc-200 whitespace-pre-line leading-relaxed">{aiText}</div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-zinc-300">This is a custom exercise, so there’s no built-in guide yet.</p>
              {hasKey ? (
                <button
                  onClick={askAi}
                  disabled={aiLoading}
                  className="mt-4 px-5 py-3 rounded-2xl bg-emerald-500 text-black font-black text-sm inline-flex items-center gap-2 disabled:opacity-60"
                >
                  {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Ask the AI coach
                </button>
              ) : (
                <p className="text-xs text-zinc-500 mt-2">Add a Gemini key in Settings to get an AI-written guide, or watch a demo below.</p>
              )}
            </div>
          )}

          <a
            href={videoUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold text-sm flex items-center justify-center gap-2"
          >
            <PlayCircle size={17} className="text-red-400" /> Watch a demo video
          </a>
          <p className="text-[10px] text-zinc-600 text-center">
            General guidance, not medical advice. Stop if you feel sharp pain.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
