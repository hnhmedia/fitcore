import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Dumbbell, 
  Sparkles, 
  Calendar, 
  Award, 
  ChevronRight, 
  Zap, 
  AlertTriangle 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { CompletedWorkout } from '../types';
import { geminiService } from '../services/geminiService';

interface ProgressAnalyticsProps {
  completedWorkouts: CompletedWorkout[];
  unit?: 'kg' | 'lbs';
}

export const ProgressAnalytics: React.FC<ProgressAnalyticsProps> = ({
  completedWorkouts,
  unit = 'kg',
}) => {
  const [selectedExercise, setSelectedExercise] = useState<string>('Barbell Flat Bench Press');
  const [geminiAdvice, setGeminiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  // Extract all unique exercises logged across history
  const allExerciseNames = Array.from(
    new Set(
      completedWorkouts.flatMap(w => w.exercises.map(e => e.name))
    )
  );

  // Ensure default selected exercise exists
  const activeExerciseName = allExerciseNames.includes(selectedExercise)
    ? selectedExercise
    : (allExerciseNames[0] || 'Barbell Flat Bench Press');

  // Build progression series for selected exercise
  // Sorted chronologically
  const sortedWorkouts = [...completedWorkouts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const exerciseHistory = sortedWorkouts
    .map(w => {
      const match = w.exercises.find(e => e.name === activeExerciseName);
      if (!match) return null;

      // Find top set
      let maxWeight = 0;
      let maxReps = 0;
      let totalVolume = 0;

      match.sets.forEach(s => {
        if (s.isCompleted || s.weight > 0) {
          totalVolume += s.weight * s.reps;
          if (s.weight > maxWeight || (s.weight === maxWeight && s.reps > maxReps)) {
            maxWeight = s.weight;
            maxReps = s.reps;
          }
        }
      });

      // Epley Formula for 1RM: 1RM = weight * (1 + reps/30)
      const estimated1RM = maxWeight > 0 ? Math.round(maxWeight * (1 + maxReps / 30)) : 0;

      return {
        date: w.date.slice(5), // MM-DD
        fullDate: w.date,
        maxWeight,
        maxReps,
        totalVolume,
        estimated1RM,
        label: `${maxWeight}${unit} × ${maxReps}`
      };
    })
    .filter(Boolean) as {
      date: string;
      fullDate: string;
      maxWeight: number;
      maxReps: number;
      totalVolume: number;
      estimated1RM: number;
      label: string;
    }[];

  // Weekly volume aggregation
  const weeklyVolumeMap: Record<string, number> = {};
  sortedWorkouts.forEach(w => {
    // Generate week key, e.g. "W41" or "Oct 12"
    const d = new Date(w.date);
    const weekKey = `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
    weeklyVolumeMap[weekKey] = (weeklyVolumeMap[weekKey] || 0) + w.totalVolumeKg;
  });

  const weeklyVolumeData = Object.entries(weeklyVolumeMap).map(([week, volume]) => ({
    week,
    volume
  }));

  // Analyze Progressive Overload status for all exercises
  const overloadStatuses = allExerciseNames.map(name => {
    const logs = sortedWorkouts
      .map(w => w.exercises.find(e => e.name === name))
      .filter(Boolean);

    if (logs.length < 2) {
      return {
        name,
        status: 'need-data' as const,
        changeText: '1 session logged',
        weightDelta: 0
      };
    }

    const first = logs[0]!;
    const latest = logs[logs.length - 1]!;

    const firstMax = Math.max(...first.sets.map(s => s.weight), 0);
    const latestMax = Math.max(...latest.sets.map(s => s.weight), 0);

    const delta = latestMax - firstMax;

    if (delta > 0) {
      return {
        name,
        status: 'increasing' as const,
        changeText: `+${delta}${unit} increase`,
        weightDelta: delta,
        firstMax,
        latestMax
      };
    } else if (delta === 0) {
      return {
        name,
        status: 'stable' as const,
        changeText: `Holding steady at ${latestMax}${unit}`,
        weightDelta: 0,
        firstMax,
        latestMax
      };
    } else {
      return {
        name,
        status: 'decreasing' as const,
        changeText: `${delta}${unit} (deload)`,
        weightDelta: delta,
        firstMax,
        latestMax
      };
    }
  });

  const increasingCount = overloadStatuses.filter(s => s.status === 'increasing').length;
  const totalAnalyzed = overloadStatuses.filter(s => s.status !== 'need-data').length;
  const progressRatio = totalAnalyzed > 0 ? Math.round((increasingCount / totalAnalyzed) * 100) : 0;

  const handleAskGeminiAdvice = async () => {
    setLoadingAdvice(true);
    try {
      const advice = await geminiService.analyzeProgressiveOverload(completedWorkouts);
      setGeminiAdvice(advice);
    } catch {
      setGeminiAdvice("Focus on progressive overload: If you hit the top of your rep range (e.g. 3x8), add 2.5kg next session!");
    } finally {
      setLoadingAdvice(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 animate-fade-in pb-28">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Progressive Overload & Weekly Data</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time verification of whether you are lifting heavier weights over time.
          </p>
        </div>

        <button
          onClick={handleAskGeminiAdvice}
          disabled={loadingAdvice}
          className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Sparkles size={16} />
          <span>{loadingAdvice ? 'Analyzing...' : 'AI Overload Coach'}</span>
        </button>
      </div>

      {/* Overload Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        
        {/* Progression Rate Card */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Zap size={22} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">Progression Rate</p>
            <p className="text-2xl font-black text-emerald-400 font-mono">
              {progressRatio}% <span className="text-xs font-semibold text-zinc-400">increasing</span>
            </p>
            <p className="text-[11px] text-zinc-400">{increasingCount} of {totalAnalyzed} lifts heavier</p>
          </div>
        </div>

        {/* Total Sessions Logged */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Calendar size={22} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">Sessions Logged</p>
            <p className="text-2xl font-black text-white font-mono">{completedWorkouts.length}</p>
            <p className="text-[11px] text-zinc-400">Consistent tracking history</p>
          </div>
        </div>

        {/* Verdict Badge */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className={`p-3 rounded-xl border ${
            progressRatio >= 50
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            <Award size={22} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">Overload Verdict</p>
            <p className="text-base font-bold text-white">
              {progressRatio >= 50 ? 'Lifting Heavier Weights 🔥' : 'Plateau / Adaptation Phase'}
            </p>
            <p className="text-[11px] text-zinc-400">
              {progressRatio >= 50 ? 'Hypertrophy stimulus verified' : 'Time to increase load by 1-2.5kg'}
            </p>
          </div>
        </div>

      </div>

      {/* AI Advice Callout */}
      {geminiAdvice && (
        <div className="mb-6 p-4 rounded-2xl bg-zinc-900 border border-emerald-500/40 shadow-lg shadow-emerald-500/5 animate-fade-in">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
            <Sparkles size={16} />
            <span>Gemini Progressive Overload Guidance</span>
          </div>
          <div className="text-xs sm:text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
            {geminiAdvice}
          </div>
        </div>
      )}

      {/* Exercise Specific Progression Chart */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Dumbbell size={18} className="text-emerald-400" />
              <span>Exercise Weight Progression</span>
            </h3>
            <p className="text-xs text-zinc-400">Track top set weight and estimated 1-Rep Max over time</p>
          </div>

          {/* Exercise Selector */}
          <select
            value={activeExerciseName}
            onChange={e => setSelectedExercise(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-emerald-500"
          >
            {allExerciseNames.map((name, i) => (
              <option key={i} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* Chart */}
        {exerciseHistory.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={exerciseHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                  labelStyle={{ color: '#a1a1aa', fontWeight: 'bold', fontSize: '11px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="maxWeight"
                  name={`Top Set Weight (${unit})`}
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="estimated1RM"
                  name={`Estimated 1RM (${unit})`}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 text-center py-10">No workout sessions logged for this exercise yet.</p>
        )}
      </div>

      {/* Exercises Overload Status Cards List */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-3">
          Weekly Weight Tracking Breakdown
        </h3>
        <div className="space-y-2">
          {overloadStatuses.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${
                  item.status === 'increasing'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : item.status === 'stable'
                    ? 'bg-zinc-800 text-zinc-400'
                    : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {item.status === 'increasing' ? (
                    <TrendingUp size={16} />
                  ) : item.status === 'stable' ? (
                    <Minus size={16} />
                  ) : (
                    <TrendingDown size={16} />
                  )}
                </div>
                <div>
                  <p className="font-bold text-zinc-200">{item.name}</p>
                  <p className="text-[11px] text-zinc-400">{item.changeText}</p>
                </div>
              </div>

              <div>
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                  item.status === 'increasing'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : item.status === 'stable'
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {item.status === 'increasing' ? 'Increasing Weights ↑' : item.status === 'stable' ? 'Holding Steady →' : 'Plateau / Deload'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Total Volume Chart */}
      {weeklyVolumeData.length > 0 && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-base font-bold text-white mb-1">Weekly Total Volume Lifted</h3>
          <p className="text-xs text-zinc-400 mb-4">Total kg/lbs moved across all completed workouts</p>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="week" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                  labelStyle={{ color: '#a1a1aa', fontWeight: 'bold', fontSize: '11px' }}
                  formatter={(val: number) => [`${val.toLocaleString()} ${unit}`, 'Total Volume']}
                />
                <Bar dataKey="volume" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
};

