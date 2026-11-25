import React, { useEffect, useRef, useState } from 'react';
import { Timer, X } from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface RestBarProps {
  /** When the rest ends (ms timestamp). null = no rest running. */
  endsAt: number | null;
  total: number; // seconds
  label?: string;
  sound: boolean;
  vibration: boolean;
  onChange: (endsAt: number | null, total: number) => void;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// A slim, non-blocking rest timer pinned above the bottom nav. It uses an end time,
// so it stays correct even if the phone locks or the tab sleeps.
export const RestBar: React.FC<RestBarProps> = ({ endsAt, total, label, sound, vibration, onChange }) => {
  const [now, setNow] = useState(Date.now());
  const [doneFlash, setDoneFlash] = useState(false);
  const firedFor = useRef<number | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);

  const left = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (!endsAt || left > 0 || firedFor.current === endsAt) return;
    firedFor.current = endsAt;
    if (sound) soundEffects.playTimerDone();
    if (vibration && 'vibrate' in navigator) navigator.vibrate([250, 120, 250]);
    setDoneFlash(true);
    onChange(null, total);
  }, [left, endsAt, sound, vibration, onChange, total]);

  useEffect(() => {
    if (!doneFlash) return;
    const t = setTimeout(() => setDoneFlash(false), 2500);
    return () => clearTimeout(t);
  }, [doneFlash]);

  // A new rest started while the "rest over" message was showing.
  useEffect(() => {
    if (endsAt) setDoneFlash(false);
  }, [endsAt]);

  if (!endsAt && !doneFlash) return null;

  const pct = endsAt ? Math.min(100, ((total - left) / Math.max(1, total)) * 100) : 100;

  return (
    <div className="fixed left-0 right-0 bottom-[68px] md:bottom-4 z-40 px-3 pointer-events-none">
      <div
        className={`pointer-events-auto max-w-xl mx-auto rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-lg ${
          doneFlash ? 'bg-emerald-500 border-emerald-400 text-black' : 'bg-zinc-900/95 border-zinc-700 text-white'
        }`}
      >
        {doneFlash ? (
          <div className="px-4 py-3 text-sm font-black text-center">Rest over – next set! 💪</div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 py-2.5">
              <Timer size={18} className="text-emerald-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xl font-black leading-none">{fmt(left)}</div>
                {label && <div className="text-[10px] text-zinc-400 truncate mt-0.5">Rest · next: {label}</div>}
              </div>
              <button
                onClick={() => onChange(Math.max(Date.now(), (endsAt || Date.now()) - 15000), Math.max(15, total - 15))}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-200 active:scale-95"
              >
                −15
              </button>
              <button
                onClick={() => onChange((endsAt || Date.now()) + 15000, total + 15)}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-200 active:scale-95"
              >
                +15
              </button>
              <button
                onClick={() => onChange(null, total)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-black active:scale-95 flex items-center gap-1"
                aria-label="Skip rest"
              >
                Skip <X size={13} />
              </button>
            </div>
            <div className="h-1 bg-zinc-800">
              <div className="h-full bg-emerald-400 transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
