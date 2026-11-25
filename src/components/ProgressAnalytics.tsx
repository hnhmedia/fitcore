import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Sparkles, Trophy, BarChart3, CalendarDays, Dumbbell } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CompletedWorkout, MuscleGroup } from '../types';
import { geminiService } from '../services/geminiService';
import { e1rm, isoDay, muscleVolume, normName, startOfWeek, weekStats } from '../utils/history';
import { MUSCLE_GROUPS } from '../utils/exerciseLibrary';

interface ProgressAnalyticsProps {
  completedWorkouts: CompletedWorkout[];
  unit?: 'kg' | 'lbs';
}

const tooltipStyle = {
  contentStyle: { backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' },
  labelStyle: { color: '#a1a1aa', fontWeight: 'bold', fontSize: '11px' },
  itemStyle: { fontSize: '12px' },
};

const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]}`;
};

const Card: React.FC<{ title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }> = ({
  title,
  subtitle,
  icon,
  children,
  right,
}) => (
  <section className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {subtitle && <p className="text-[11px] text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
    {children}
  </section>
);

export const ProgressAnalytics: React.FC<ProgressAnalyticsProps> = ({ completedWorkouts, unit = 'kg' }) => {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [geminiAdvice, setGeminiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  const sorted = useMemo(
    () => [...completedWorkouts].sort((a, b) => (a.startTime || 0) - (b.startTime || 0) || a.date.localeCompare(b.date)),
    [completedWorkouts]
  );

  // Exercises, most frequently logged first.
  const exerciseNames = useMemo(() => {
    const counts = new Map<string, { name: string; n: number }>();
    for (const w of sorted)
      for (const ex of w.exercises || []) {
        if (!ex.sets.some((s) => s.isCompleted && s.type !== 'warmup' && s.weight > 0)) continue;
        const k = normName(ex.name);
        const c = counts.get(k);
        counts.set(k, { name: c?.name ?? ex.name, n: (c?.n ?? 0) + 1 });
      }
    return [...counts.values()].sort((a, b) => b.n - a.n).map((c) => c.name);
  }, [sorted]);

  const activeExercise = selectedExercise && exerciseNames.includes(selectedExercise) ? selectedExercise : exerciseNames[0];

  const exerciseHistory = useMemo(() => {
    if (!activeExercise) return [];
    const key = normName(activeExercise);
    return sorted
      .map((w) => {
        const ex = w.exercises?.find((e) => normName(e.name) === key);
        if (!ex) return null;
        const sets = ex.sets.filter((s) => s.isCompleted && s.type !== 'warmup' && s.weight > 0);
        if (!sets.length) return null;
        const top = sets.reduce((a, b) => (e1rm(b.weight, b.reps) > e1rm(a.weight, a.reps) ? b : a));
        return {
          date: shortDate(w.date),
          topWeight: top.weight,
          est1RM: Math.round(e1rm(top.weight, top.reps) * 10) / 10,
          label: `${top.weight}${unit} × ${top.reps}`,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [sorted, activeExercise, unit]);

  // Calendar heatmap: last 16 weeks.
  const heatmap = useMemo(() => {
    const perDay = new Map<string, number>();
    for (const w of completedWorkouts) perDay.set(w.date, (perDay.get(w.date) || 0) + (w.totalVolumeKg || 1));
    const max = Math.max(1, ...perDay.values());
    const weeks: { date: string; level: number; future: boolean }[][] = [];
    const start = startOfWeek(new Date());
    start.setDate(start.getDate() - 7 * 15);
    const today = isoDay(new Date());
    for (let wk = 0; wk < 16; wk++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(start);
        day.setDate(start.getDate() + wk * 7 + d);
        const key = isoDay(day);
        const v = perDay.get(key) || 0;
        col.push({ date: key, level: v ? Math.max(1, Math.ceil((v / max) * 4)) : 0, future: key > today });
      }
      weeks.push(col);
    }
    const daysTrained = [...perDay.keys()].filter((k) => k >= isoDay(start)).length;
    return { weeks, daysTrained };
  }, [completedWorkouts]);

  // Weekly volume, last 12 weeks.
  const weeklyVolume = useMemo(() => {
    const out = [];
    const cur = startOfWeek(new Date());
    cur.setDate(cur.getDate() - 7 * 11);
    for (let i = 0; i < 12; i++) {
      const s = weekStats(completedWorkouts, cur);
      out.push({ week: shortDate(isoDay(cur)), volume: Math.round(s.volume) });
      cur.setDate(cur.getDate() + 7);
    }
    return out;
  }, [completedWorkouts]);

  // Hard sets per muscle: this week vs average of the 4 weeks before.
  const muscleSets = useMemo(() => {
    const ws = startOfWeek(new Date());
    const next = new Date(ws);
    next.setDate(ws.getDate() + 7);
    const prev = new Date(ws);
    prev.setDate(ws.getDate() - 28);
    const now = muscleVolume(completedWorkouts, isoDay(ws), isoDay(next));
    const before = muscleVolume(completedWorkouts, isoDay(prev), isoDay(ws));
    return MUSCLE_GROUPS.filter((m) => m !== 'Full Body').map((m: MuscleGroup) => ({
      muscle: m,
      sets: now[m] || 0,
      avg: Math.round(((before[m] || 0) / 4) * 10) / 10,
    }));
  }, [completedWorkouts]);

  const overload = useMemo(
    () =>
      exerciseNames.map((name) => {
        const key = normName(name);
        const tops = sorted
          .map((w) => w.exercises?.find((e) => normName(e.name) === key))
          .filter(Boolean)
          .map((ex) => Math.max(0, ...ex!.sets.filter((s) => s.isCompleted && s.type !== 'warmup').map((s) => e1rm(s.weight, s.reps))))
          .filter((v) => v > 0);
        if (tops.length < 2) return { name, status: 'need-data' as const, text: 'Log it once more to see a trend' };
        const recent = tops.slice(-3);
        const earlier = tops.slice(0, -3).length ? tops.slice(0, -3) : tops.slice(0, 1);
        const delta = Math.max(...recent) - Math.max(...earlier);
        const pct = Math.round((delta / Math.max(...earlier)) * 100);
        return delta > 0.5
          ? { name, status: 'up' as const, text: `Est. 1RM up ${pct}%` }
          : delta < -0.5
          ? { name, status: 'down' as const, text: `Est. 1RM down ${Math.abs(pct)}%` }
          : { name, status: 'flat' as const, text: 'Holding steady' };
      }),
    [exerciseNames, sorted]
  );

  const totalPRs = completedWorkouts.reduce((a, w) => a + (w.prs?.length || 0), 0);
  const thisMonth = isoDay(new Date()).slice(0, 7);
  const monthCount = completedWorkouts.filter((w) => w.date.startsWith(thisMonth)).length;
  const upCount = overload.filter((o) => o.status === 'up').length;
  const rated = overload.filter((o) => o.status !== 'need-data').length;

  const handleAskGeminiAdvice = async () => {
    setLoadingAdvice(true);
    try {
      setGeminiAdvice(await geminiService.analyzeProgressiveOverload(completedWorkouts));
    } catch {
      setGeminiAdvice('Add your Gemini API key in Settings to get personalised advice. Rule of thumb: when you hit the top of your rep range on every set, add 2.5kg next time.');
    } finally {
      setLoadingAdvice(false);
    }
  };

  const heatColor = ['bg-zinc-800/70', 'bg-emerald-900', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-300'];

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 animate-fade-in pb-28 space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Progress</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Are you getting stronger? Here’s the proof.</p>
        </div>
        {completedWorkouts.length > 0 && (
          <button
            onClick={handleAskGeminiAdvice}
            disabled={loadingAdvice}
            className="px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles size={14} /> {loadingAdvice ? 'Thinking…' : 'AI review'}
          </button>
        )}
      </div>

      {completedWorkouts.length === 0 ? (
        <div className="text-center py-14 px-6 rounded-3xl border border-dashed border-zinc-800">
          <BarChart3 size={30} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-base font-black text-white">No workouts logged yet</p>
          <p className="text-xs text-zinc-400 mt-1.5 max-w-xs mx-auto">
            Finish your first workout and your strength charts, training calendar and personal records will appear here.
          </p>
        </div>
      ) : (
        <>
          {geminiAdvice && (
            <div className="p-4 rounded-3xl bg-zinc-900 border border-emerald-500/30 animate-fade-in">
              <p className="text-[11px] font-black uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                <Sparkles size={13} /> AI coach review
              </p>
              <div className="text-xs sm:text-sm text-zinc-300 whitespace-pre-line leading-relaxed">{geminiAdvice}</div>
            </div>
          )}

          {/* Headline stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Workouts', value: completedWorkouts.length, sub: `${monthCount} this month` },
              { label: 'PRs', value: totalPRs, sub: 'all time' },
              { label: 'Improving', value: rated ? `${upCount}/${rated}` : '–', sub: rated ? 'lifts trending up' : 'need 2+ sessions' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-3">
                <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">{s.label}</p>
                <p className="text-xl font-black text-white font-mono mt-0.5">{s.value}</p>
                <p className="text-[10px] text-zinc-500">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Heatmap */}
          <Card
            title="Training calendar"
            subtitle={`${heatmap.daysTrained} days trained in the last 16 weeks`}
            icon={<CalendarDays size={15} className="text-emerald-400" />}
          >
            <div className="flex gap-[3px] overflow-x-auto pb-1">
              {heatmap.weeks.map((col, i) => (
                <div key={i} className="flex flex-col gap-[3px] flex-1 min-w-[14px]">
                  {col.map((d) => (
                    <div
                      key={d.date}
                      title={d.date}
                      className={`aspect-square rounded-[4px] ${d.future ? 'bg-transparent' : heatColor[d.level]}`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-zinc-500">
              Less {heatColor.map((c) => <span key={c} className={`w-2.5 h-2.5 rounded-[3px] ${c}`} />)} More
            </div>
          </Card>

          {/* Exercise strength chart */}
          <Card
            title="Strength by exercise"
            subtitle="Best set and estimated 1-rep max each session"
            icon={<Dumbbell size={15} className="text-emerald-400" />}
          >
            <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1">
              {exerciseNames.slice(0, 12).map((name) => (
                <button
                  key={name}
                  onClick={() => setSelectedExercise(name)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border ${
                    name === activeExercise ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            {exerciseHistory.length >= 2 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={exerciseHistory} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#52525b" fontSize={10} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip {...tooltipStyle} />
                    <Line type="monotone" dataKey="est1RM" name={`Est. 1RM (${unit})`} stroke="#34d399" strokeWidth={3} dot={{ r: 3, fill: '#34d399' }} />
                    <Line type="monotone" dataKey="topWeight" name={`Top set (${unit})`} stroke="#60a5fa" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2, fill: '#60a5fa' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 text-center py-8">
                {exerciseHistory.length === 1
                  ? `Logged once so far (${exerciseHistory[0].label}). Do it again to start the chart.`
                  : 'No completed sets for this exercise yet.'}
              </p>
            )}
          </Card>

          {/* Sets per muscle */}
          <Card
            title="Sets per muscle this week"
            subtitle="Most people grow well on about 10–20 hard sets per muscle a week"
            icon={<BarChart3 size={15} className="text-emerald-400" />}
          >
            <div className="space-y-2">
              {muscleSets.map((m) => (
                <div key={m.muscle} className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-zinc-400 font-semibold shrink-0">{m.muscle}</span>
                  <div className="flex-1 h-5 rounded-lg bg-zinc-950 relative overflow-hidden">
                    <div className="absolute inset-y-0 bg-zinc-800/80" style={{ left: `${(10 / 25) * 100}%`, width: `${(10 / 25) * 100}%` }} />
                    <div
                      className={`absolute inset-y-0 left-0 rounded-lg ${m.sets >= 10 ? 'bg-emerald-500' : m.sets > 0 ? 'bg-emerald-700' : ''}`}
                      style={{ width: `${Math.min(100, (m.sets / 25) * 100)}%` }}
                    />
                    {m.avg > 0 && (
                      <div className="absolute inset-y-0 w-0.5 bg-white/60" style={{ left: `${Math.min(100, (m.avg / 25) * 100)}%` }} title="4-week average" />
                    )}
                  </div>
                  <span className="w-8 text-right font-mono font-bold text-zinc-200">{m.sets}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">Shaded band = 10–20 sets · white line = your 4-week average</p>
          </Card>

          {/* Weekly volume */}
          <Card title="Weekly volume" subtitle={`Total ${unit} lifted per week (weight × reps)`} icon={<TrendingUp size={15} className="text-emerald-400" />}>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyVolume} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="week" stroke="#52525b" fontSize={9} tickLine={false} interval={1} />
                  <YAxis stroke="#52525b" fontSize={10} tickLine={false} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                  <Tooltip {...tooltipStyle} formatter={(val: number) => [`${val.toLocaleString()} ${unit}`, 'Volume']} />
                  <Bar dataKey="volume" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Trend per exercise */}
          <Card title="Lift trends" subtitle="Recent sessions compared with earlier ones" icon={<Trophy size={15} className="text-emerald-400" />}>
            <div className="space-y-1.5">
              {overload.map((o) => (
                <button
                  key={o.name}
                  onClick={() => setSelectedExercise(o.name)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950/70 flex items-center gap-2.5 text-left"
                >
                  <span
                    className={`p-1.5 rounded-lg ${
                      o.status === 'up'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : o.status === 'down'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {o.status === 'up' ? <TrendingUp size={14} /> : o.status === 'down' ? <TrendingDown size={14} /> : <Minus size={14} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-zinc-200 truncate">{o.name}</span>
                    <span className="block text-[11px] text-zinc-500">{o.text}</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
