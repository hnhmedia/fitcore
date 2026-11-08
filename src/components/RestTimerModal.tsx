import React, { useEffect, useState } from 'react';
import { Play, Pause, Plus, Minus, X, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface RestTimerModalProps {
  initialSeconds: number;
  isOpen: boolean;
  onClose: () => void;
  soundEnabled?: boolean;
}

export const RestTimerModal: React.FC<RestTimerModalProps> = ({
  initialSeconds,
  isOpen,
  onClose,
  soundEnabled = true,
}) => {
  const [totalTime, setTotalTime] = useState(initialSeconds);
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [muted, setMuted] = useState(!soundEnabled);

  useEffect(() => {
    if (isOpen) {
      setTotalTime(initialSeconds);
      setTimeLeft(initialSeconds);
      setIsRunning(true);
      setIsMinimized(false);
    }
  }, [isOpen, initialSeconds]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isOpen && isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 4 && prev > 1 && !muted) {
            soundEffects.playCountdownPip();
          } else if (prev === 1) {
            if (!muted) soundEffects.playTimerDone();
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && isOpen) {
      // Finished
      setIsRunning(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, isRunning, timeLeft, muted]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  const progressPercent = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 100;

  const adjustTime = (delta: number) => {
    setTimeLeft(prev => {
      const next = Math.max(0, prev + delta);
      if (next > totalTime) setTotalTime(next);
      return next;
    });
  };

  const setPreset = (sec: number) => {
    setTotalTime(sec);
    setTimeLeft(sec);
    setIsRunning(true);
  };

  // Minimized floating banner
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-zinc-900 border border-emerald-500/40 shadow-2xl shadow-emerald-500/10 rounded-2xl p-3 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-zinc-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-500 transition-all duration-300"
                strokeDasharray={`${progressPercent}, 100`}
                strokeLinecap="round"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-mono font-bold text-emerald-400">
              {timeLeft}s
            </span>
          </div>
          <div>
            <p className="text-xs text-zinc-400 font-medium">Resting...</p>
            <p className="text-base font-bold font-mono text-zinc-100">{formattedTime}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustTime(30)}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            +30s
          </button>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <Maximize2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Full Screen / Modal view
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-sm p-6 flex flex-col items-center relative shadow-2xl shadow-emerald-500/5">
        
        {/* Top Controls */}
        <div className="w-full flex items-center justify-between mb-2">
          <button
            onClick={() => setMuted(!muted)}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Rest Interval
          </h3>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              title="Minimize to floating pill"
            >
              <Minimize2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              title="Close Timer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Circular Progress Display */}
        <div className="relative w-56 h-56 my-4 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-zinc-900"
              strokeWidth="6"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-emerald-500 transition-all duration-500"
              strokeWidth="6"
              strokeDasharray={276.46}
              strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-5xl font-extrabold font-mono tracking-tight text-white">
              {formattedTime}
            </span>
            <span className="text-xs font-medium text-zinc-400 mt-1">
              {timeLeft === 0 ? 'READY FOR NEXT SET!' : isRunning ? 'Recovery Phase' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Quick Add / Minus Seconds */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => adjustTime(-15)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
          >
            <Minus size={14} /> 15s
          </button>
          <button
            onClick={() => adjustTime(15)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
          >
            <Plus size={14} /> 15s
          </button>
          <button
            onClick={() => adjustTime(30)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
          >
            <Plus size={14} /> 30s
          </button>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-4 gap-2 w-full mb-6">
          {[30, 60, 90, 120].map(sec => (
            <button
              key={sec}
              onClick={() => setPreset(sec)}
              className={`py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                totalTime === sec && timeLeft > 0
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              {sec}s
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex-1 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
              isRunning
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
            }`}
          >
            {isRunning ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Resume</>}
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-sm transition-all"
          >
            Skip Rest
          </button>
        </div>

      </div>
    </div>
  );
};

