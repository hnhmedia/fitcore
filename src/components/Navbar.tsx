import React from 'react';
import { 
  Dumbbell, 
  Layers, 
  TrendingUp, 
  Ruler, 
  Settings, 
  Sparkles, 
  Flame,
  MessageSquare,
  Calculator
} from 'lucide-react';
import { storageService, ActiveWorkoutState } from '../services/storageService';

export type NavTab = 'workout' | 'routines' | 'progress' | 'body';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeWorkout: ActiveWorkoutState | null;
  onOpenSettings: () => void;
  onOpenCoachChat: () => void;
  onOpenPlateCalc: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  activeWorkout,
  onOpenSettings,
  onOpenCoachChat,
  onOpenPlateCalc,
}) => {
  const hasGeminiKey = Boolean(storageService.getGeminiApiKey());

  return (
    <>
      {/* Desktop / Tablet Header */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          
          {/* Logo */}
          <div 
            onClick={() => onSelectTab(activeWorkout ? 'workout' : 'routines')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-black font-black shadow-lg shadow-emerald-500/20">
              <Dumbbell size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">AeroFit</span>
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AI
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-950/80 p-1 rounded-2xl border border-zinc-800">
            <button
              onClick={() => onSelectTab('workout')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                currentTab === 'workout'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Dumbbell size={15} className={activeWorkout ? "text-emerald-400 animate-pulse" : ""} />
              <span>Workout</span>
              {activeWorkout && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}
            </button>

            <button
              onClick={() => onSelectTab('routines')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                currentTab === 'routines'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers size={15} />
              <span>Routines & AI</span>
            </button>

            <button
              onClick={() => onSelectTab('progress')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                currentTab === 'progress'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TrendingUp size={15} />
              <span>Progressive Overload</span>
            </button>

            <button
              onClick={() => onSelectTab('body')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                currentTab === 'body'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Ruler size={15} />
              <span>Body Composition</span>
            </button>
          </nav>

          {/* Right Status & Settings */}
          <div className="flex items-center gap-2">
            
            {/* Plate Calculator button */}
            <button
              onClick={onOpenPlateCalc}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-colors"
              title="Barbell Plate Calculator"
            >
              <Calculator size={17} />
            </button>

            {/* AI Coach Chat button */}
            <button
              onClick={onOpenCoachChat}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="Open Gemini Coach Chat"
            >
              <MessageSquare size={14} />
              <span className="hidden sm:inline">AI Coach</span>
            </button>

            {/* Active workout quick pill if not currently on workout tab */}
            {activeWorkout && currentTab !== 'workout' && (
              <button
                onClick={() => onSelectTab('workout')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 animate-pulse transition-all"
              >
                <Flame size={14} />
                <span>Resume Workout</span>
              </button>
            )}

            {/* Gemini Status Badge */}
            <button
              onClick={onOpenSettings}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                hasGeminiKey
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title={hasGeminiKey ? 'Gemini 3.8 Flash Active' : 'Configure Gemini API'}
            >
              <Sparkles size={14} className={hasGeminiKey ? 'text-emerald-400' : 'text-zinc-500'} />
              <span className="hidden sm:inline">
                {hasGeminiKey ? 'Gemini 3.8' : 'Setup Gemini'}
              </span>
            </button>

            {/* Settings Icon */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
              title="Settings"
            >
              <Settings size={17} />
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-lg border-t border-zinc-800/80 px-2 py-2 flex items-center justify-around">
        <button
          onClick={() => onSelectTab('workout')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all relative ${
            currentTab === 'workout' ? 'text-emerald-400' : 'text-zinc-500'
          }`}
        >
          <Dumbbell size={20} />
          <span className="text-[10px] font-bold">Workout</span>
          {activeWorkout && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          )}
        </button>

        <button
          onClick={() => onSelectTab('routines')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
            currentTab === 'routines' ? 'text-emerald-400' : 'text-zinc-500'
          }`}
        >
          <Layers size={20} />
          <span className="text-[10px] font-bold">Routines</span>
        </button>

        <button
          onClick={() => onSelectTab('progress')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
            currentTab === 'progress' ? 'text-emerald-400' : 'text-zinc-500'
          }`}
        >
          <TrendingUp size={20} />
          <span className="text-[10px] font-bold">Overload</span>
        </button>

        <button
          onClick={() => onSelectTab('body')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
            currentTab === 'body' ? 'text-emerald-400' : 'text-zinc-500'
          }`}
        >
          <Ruler size={20} />
          <span className="text-[10px] font-bold">Body</span>
        </button>
      </nav>
    </>
  );
};

