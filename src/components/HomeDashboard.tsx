import React, { useMemo, useState } from 'react';
import {
  Play,
  Plus,
  Flame,
  Trophy,
  Dumbbell,
  Clock,
  Layers,
  Cloud,
  Sparkles,
  Check,
  X,
  ChevronRight,
} from 'lucide-react';
import { CompletedWorkout, WorkoutRoutine } from '../types';
import { ActiveWorkoutState, storageService } from '../services/storageService';
import { useSyncState } from './AccountModal';
import {
  blankWorkout,
  daysAgo,
  isoDay,
  latestPR,
  startOfWeek,
  suggestRoutine,
  weekStats,
  weekStreak,
  workoutFromRoutine,
} from '../utils/history';

interface HomeDashboardProps {
  routines: WorkoutRoutine[];
  completedWorkouts: CompletedWorkout[];
  unit: 'kg' | 'lbs';
  onStartWorkout: (w: ActiveWorkoutState) => void;
  onGoToRoutines: () => void;
  onOpenAccount: () => void;
  onOpenSettings: () => void;
}

const ONBOARDING_KEY = 'aerofit_onboarding_dismissed';
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const compact = (n: number) =>
  n >= 10000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : Math.round(n).toLocaleString();

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Late session?' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  routines,
  completedWorkouts,
  unit,
  onStartWorkout,
  onGoToRoutines,
  onOpenAccount,
  onOpenSettings,
}) => {
  const sync = useSyncState();
  const [onboardingHidden, setOnboardingHidden] = useState(() => localStorage.getItem(ONBOARDING_KEY) === 'true');

  const stats = useMemo(() => {
    const thisWeekStart = startOfWeek(new Date());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    return {
      thisWeekStart,
      thisWeek: weekStats(completedWorkouts, thisWeekStart),
      lastWeek: weekStats(completedWorkouts, lastWeekStart),
      streak: weekStreak(completedWorkouts),
      pr: latestPR(completedWorkouts),
      next: suggestRoutine(completedWorkouts, routines),
      recent: [...completedWorkouts].sort((a, b) => (b.startTime || 0) - (a.startTime || 0)).slice(0, 3),
    };
  }, [completedWorkouts, routines]);

  const today = isoDay(new Date());
  const trainedToday = completedWorkouts.some((w) => w.date === today);
  const volumeDelta = stats.lastWeek.volume ? Math.round(((stats.thisWeek.volume - stats.lastWeek.volume) / stats.lastWeek.volume) * 100) : null;

  const steps = [
    { done: Boolean(sync.email), label: 'Back up your data', hint: 'Create a free account so nothing is lost', action: onOpenAccount, icon: Cloud },
    { done: Boolean(storageService.getGeminiApiKey()), label: 'Turn on the AI coach', hint: 'Add your free Gemini API key', action: onOpenSettings, icon: Sparkles },
    { done: completedWorkouts.length > 0, label: 'Log your first workout', hint: 'Start a routine below', action: undefined, icon: Dumbbell },
  ];
  const showOnboarding = !onboardingHidden && steps.some((s) => !s.done);

  const next = stats.next;

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 pb-28 animate-fade-in space-y-4">
      {/* Greeting + streak */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-zinc-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="text-2xl font-black text-white tracking-tight">{greeting()}</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400">
          <Flame size={15} />
          <span className="text-xs font-black">{stats.streak} week{stats.streak === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* Getting started */}
      {showOnboarding && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-black text-white">Get set up</h2>
            <button
              onClick={() => {
                localStorage.setItem(ONBOARDING_KEY, 'true');
                setOnboardingHidden(true);
              }}
              className="p-1 text-zinc-500 hover:text-white"
              aria-label="Hide setup checklist"
            >
              <X size={16} />
            </button>
          </div>
          <div className="space-y-1.5">
            {steps.map((s) => (
              <button
                key={s.label}
                onClick={s.action}
                disabled={s.done || !s.action}
                className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-left enabled:hover:border-zinc-700"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    s.done ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {s.done ? <Check size={15} strokeWidth={3} /> : <s.icon size={14} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-bold ${s.done ? 'text-zinc-500 line-through' : 'text-white'}`}>{s.label}</span>
                  {!s.done && <span className="block text-[11px] text-zinc-500">{s.hint}</span>}
                </span>
                {!s.done && s.action && <ChevronRight size={16} className="text-zinc-600" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Up next */}
      {next ? (
        <div className="rounded-3xl p-5 bg-gradient-to-br from-emerald-500/20 via-zinc-900 to-zinc-950 border border-emerald-500/30 relative overflow-hidden">
          <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
            {trainedToday ? 'Next session' : 'Up next'}
          </p>
          <h2 className="text-xl font-black text-white mt-1 leading-tight">{next.routine.name}</h2>
          <p className="text-xs text-zinc-400 mt-1">
            {next.last ? `Last done ${daysAgo(next.last)}` : 'Not done yet'} · {next.routine.exercises.length} exercises · ~
            {next.routine.estimatedMinutes} min
          </p>
          <p className="text-[11px] text-zinc-500 mt-2 line-clamp-1">
            {next.routine.exercises.map((e) => e.name).join(' · ')}
          </p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onStartWorkout(workoutFromRoutine(next.routine, completedWorkouts, unit))}
              className="flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              <Play size={18} fill="currentColor" /> Start workout
            </button>
            <button
              onClick={onGoToRoutines}
              className="px-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 text-xs font-bold"
            >
              Other
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl p-5 bg-zinc-900/60 border border-zinc-800 text-center">
          <Layers size={26} className="mx-auto text-emerald-400 mb-2" />
          <h2 className="text-base font-black text-white">No routines yet</h2>
          <p className="text-xs text-zinc-400 mt-1 mb-4">Build one yourself or let the AI create a split for you.</p>
          <button onClick={onGoToRoutines} className="px-5 py-3 rounded-2xl bg-emerald-500 text-black font-black text-sm">
            Create a routine
          </button>
        </div>
      )}

      <button
        onClick={() => onStartWorkout(blankWorkout())}
        className="w-full py-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-zinc-300 font-bold text-sm flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Start an empty workout
      </button>

      {/* This week */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-white">This week</h2>
          <span className="text-[11px] text-zinc-500">{stats.thisWeek.count} workout{stats.thisWeek.count === 1 ? '' : 's'}</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 mb-4">
          {DAYS.map((d, i) => {
            const day = new Date(stats.thisWeekStart);
            day.setDate(day.getDate() + i);
            const key = isoDay(day);
            const done = stats.thisWeek.days.has(key);
            const isToday = key === today;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className={`text-[10px] font-bold ${isToday ? 'text-white' : 'text-zinc-500'}`}>{d}</span>
                <span
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    done
                      ? 'bg-emerald-500 text-black'
                      : isToday
                      ? 'border-2 border-dashed border-emerald-500/50'
                      : 'bg-zinc-800/60'
                  }`}
                >
                  {done && <Check size={15} strokeWidth={3} />}
                </span>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-zinc-950/60 p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Volume</p>
            <p className="text-lg font-black text-white font-mono leading-tight mt-0.5">{compact(stats.thisWeek.volume)}</p>
            <p className={`text-[10px] font-bold ${volumeDelta === null ? 'text-zinc-600' : volumeDelta >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {volumeDelta === null ? unit : `${volumeDelta >= 0 ? '+' : ''}${volumeDelta}% vs last wk`}
            </p>
          </div>
          <div className="rounded-2xl bg-zinc-950/60 p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Time</p>
            <p className="text-lg font-black text-white font-mono leading-tight mt-0.5">{stats.thisWeek.minutes}</p>
            <p className="text-[10px] font-bold text-zinc-600">minutes</p>
          </div>
          <div className="rounded-2xl bg-zinc-950/60 p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Total</p>
            <p className="text-lg font-black text-white font-mono leading-tight mt-0.5">{completedWorkouts.length}</p>
            <p className="text-[10px] font-bold text-zinc-600">workouts</p>
          </div>
        </div>
      </div>

      {/* Latest PR */}
      {stats.pr && (
        <div className="rounded-3xl border border-amber-500/25 bg-amber-500/5 p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <Trophy size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-black text-amber-400">Latest PR · {daysAgo(stats.pr.date)}</p>
            <p className="text-sm font-bold text-white truncate">{stats.pr.exerciseName}</p>
            <p className="text-xs font-mono text-amber-200">{stats.pr.weight}{unit} × {stats.pr.reps}</p>
          </div>
        </div>
      )}

      {/* Recent */}
      {stats.recent.length > 0 && (
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-2 px-1">Recent workouts</h2>
          <div className="space-y-2">
            {stats.recent.map((w) => (
              <div key={w.id} className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/70 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-100 truncate">{w.routineName}</p>
                  <p className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                    <span>{daysAgo(w.date)}</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {w.durationMinutes}m</span>
                    <span>{w.totalSets} sets</span>
                    {w.prs?.length ? <span className="text-amber-400 flex items-center gap-0.5"><Trophy size={11} /> {w.prs.length}</span> : null}
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-400 shrink-0">
                  {compact(w.totalVolumeKg)} {unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
