import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  TrendingDown, 
  TrendingUp, 
  Activity, 
  Ruler, 
  Flame, 
  Dumbbell, 
  Scale, 
  CheckCircle2, 
  X, 
  AlertCircle 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { BodyMeasurement, BodyCompositionAnalysis } from '../types';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';

interface BodyCompositionTrackerProps {
  measurements: BodyMeasurement[];
  onMeasurementsChanged: (measurements: BodyMeasurement[]) => void;
  unit?: 'kg' | 'lbs';
}

export const BodyCompositionTracker: React.FC<BodyCompositionTrackerProps> = ({
  measurements,
  onMeasurementsChanged,
  unit = 'kg',
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [analysis, setAnalysis] = useState<BodyCompositionAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Form State
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newWeight, setNewWeight] = useState(81.2);
  const [newChest, setNewChest] = useState(105);
  const [newStomach, setNewStomach] = useState(83.5);
  const [newHips, setNewHips] = useState(96.5);
  const [newArms, setNewArms] = useState(37.5);
  const [newThighs, setNewThighs] = useState(59.5);
  const [newBodyFat, setNewBodyFat] = useState(16.5);
  const [newNotes, setNewNotes] = useState('');

  // Run analysis whenever measurements update
  useEffect(() => {
    runAnalysis();
  }, [measurements]);

  const runAnalysis = async () => {
    setLoadingAnalysis(true);
    try {
      const res = await geminiService.analyzeBodyComposition(measurements);
      setAnalysis(res);
    } catch {
      // Fallback
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleAddMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: BodyMeasurement = {
      id: 'm-' + Date.now(),
      date: newDate,
      weightKg: Number(newWeight),
      chestCm: Number(newChest),
      stomachWaistCm: Number(newStomach),
      hipsCm: newHips ? Number(newHips) : undefined,
      armsCm: newArms ? Number(newArms) : undefined,
      thighsCm: newThighs ? Number(newThighs) : undefined,
      bodyFatPercentage: newBodyFat ? Number(newBodyFat) : undefined,
      notes: newNotes.trim() || undefined,
    };

    const updated = storageService.addBodyMeasurement(entry);
    onMeasurementsChanged(updated);
    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this measurement entry?')) {
      const updated = storageService.deleteBodyMeasurement(id);
      onMeasurementsChanged(updated);
    }
  };

  // Recharts formatted data
  const chartData = measurements.map(m => ({
    date: m.date.slice(5), // MM-DD
    fullDate: m.date,
    Weight: m.weightKg,
    Chest: m.chestCm,
    Stomach: m.stomachWaistCm,
    Arms: m.armsCm,
    BodyFat: m.bodyFatPercentage
  }));

  const latest = measurements[measurements.length - 1];
  const first = measurements[0];
  const stomachChange = latest && first ? +(latest.stomachWaistCm - first.stomachWaistCm).toFixed(1) : 0;
  const chestChange = latest && first ? +(latest.chestCm - first.chestCm).toFixed(1) : 0;
  const weightChange = latest && first ? +(latest.weightKg - first.weightKg).toFixed(1) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 animate-fade-in pb-28">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Body Composition & Measurements</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Track stomach waist reduction vs chest expansion to verify muscle gain vs fat loss.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
          >
            <Plus size={16} />
            <span>Log Measurements</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        
        {/* Stomach / Waist */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className={`p-3 rounded-xl ${stomachChange <= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
            <Flame size={22} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">Stomach / Waist</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{latest?.stomachWaistCm || 0} cm</span>
              <span className={`text-xs font-bold ${stomachChange <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {stomachChange > 0 ? `+${stomachChange}` : stomachChange} cm
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {stomachChange < 0 ? 'Losing abdominal fat 🔥' : 'Waist holding steady'}
            </p>
          </div>
        </div>

        {/* Chest */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Dumbbell size={22} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">Chest Expansion</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{latest?.chestCm || 0} cm</span>
              <span className={`text-xs font-bold ${chestChange >= 0 ? 'text-blue-400' : 'text-zinc-400'}`}>
                {chestChange > 0 ? `+${chestChange}` : chestChange} cm
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {chestChange > 0 ? 'Lean muscle tissue growing 💪' : 'Baseline chest size'}
            </p>
          </div>
        </div>

        {/* Weight */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Scale size={22} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">Total Body Weight</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{latest?.weightKg || 0} {unit}</span>
              <span className="text-xs font-bold text-zinc-400">
                {weightChange > 0 ? `+${weightChange}` : weightChange} {unit}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Net scale weight delta</p>
          </div>
        </div>

      </div>

      {/* AI Body Composition Verdict Box */}
      {analysis && (
        <div className={`p-5 rounded-2xl border mb-6 relative overflow-hidden transition-all ${
          analysis.status === 'recomposition'
            ? 'bg-gradient-to-br from-emerald-950/40 via-zinc-900/90 to-zinc-950 border-emerald-500/40 shadow-xl shadow-emerald-500/5'
            : analysis.status === 'fat-loss'
            ? 'bg-gradient-to-br from-blue-950/40 via-zinc-900/90 to-zinc-950 border-blue-500/40'
            : 'bg-zinc-900/90 border-zinc-800'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles size={18} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  AI Body Composition Verdict
                </span>
                <h3 className="text-lg font-black text-white">{analysis.headline}</h3>
              </div>
            </div>

            <button
              onClick={runAnalysis}
              disabled={loadingAnalysis}
              className="text-xs font-semibold text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800/80"
            >
              {loadingAnalysis ? 'Refreshing...' : 'Re-analyze'}
            </button>
          </div>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
            {analysis.summary}
          </p>

          {/* Rates if available */}
          {(analysis.estimatedMuscleGainRate || analysis.estimatedFatLossRate) && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {analysis.estimatedMuscleGainRate && (
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs">
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold">Estimated Muscle Gain</span>
                  <span className="font-mono font-bold text-emerald-400">{analysis.estimatedMuscleGainRate}</span>
                </div>
              )}
              {analysis.estimatedFatLossRate && (
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs">
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold">Estimated Fat Loss</span>
                  <span className="font-mono font-bold text-blue-400">{analysis.estimatedFatLossRate}</span>
                </div>
              )}
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="pt-3 border-t border-zinc-800/80">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Action Plan & Recommendations:
              </p>
              <ul className="space-y-1.5">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Recharts Timeline: Stomach vs Chest vs Weight */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 mb-6">
        <h3 className="text-base font-bold text-white mb-1">Measurements Progression Chart</h3>
        <p className="text-xs text-zinc-400 mb-4">
          Notice the divergent lines: Stomach declining (fat drop) vs Chest rising (muscle gain)
        </p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                labelStyle={{ color: '#a1a1aa', fontWeight: 'bold', fontSize: '11px' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Line
                type="monotone"
                dataKey="Stomach"
                name="Stomach / Waist (cm)"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ r: 4, fill: '#ef4444' }}
              />
              <Line
                type="monotone"
                dataKey="Chest"
                name="Chest (cm)"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4, fill: '#3b82f6' }}
              />
              <Line
                type="monotone"
                dataKey="Weight"
                name={`Weight (${unit})`}
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={{ r: 3, fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Measurements Log Table */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-3">
          Historical Measurement Logs
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] font-bold uppercase text-zinc-400">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Weight</th>
                <th className="py-2.5 px-3">Waist/Stomach</th>
                <th className="py-2.5 px-3">Chest</th>
                <th className="py-2.5 px-3">Arms</th>
                <th className="py-2.5 px-3">Body Fat</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {[...measurements].reverse().map(m => (
                <tr key={m.id} className="hover:bg-zinc-950/40">
                  <td className="py-2.5 px-3 font-semibold text-zinc-100">{m.date}</td>
                  <td className="py-2.5 px-3">{m.weightKg} {unit}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">{m.stomachWaistCm} cm</td>
                  <td className="py-2.5 px-3 text-blue-400 font-bold">{m.chestCm} cm</td>
                  <td className="py-2.5 px-3">{m.armsCm ? `${m.armsCm} cm` : '—'}</td>
                  <td className="py-2.5 px-3">{m.bodyFatPercentage ? `${m.bodyFatPercentage}%` : '—'}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete log"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Measurement Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Ruler size={18} />
                </div>
                <h3 className="font-bold text-white text-base">Log New Measurements</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddMeasurement} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Weight ({unit})</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newWeight}
                    onChange={e => setNewWeight(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Crucial Measurements */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-zinc-900/70 border border-emerald-500/30">
                <div>
                  <label className="block text-xs font-bold text-emerald-400 mb-1">
                    Stomach / Waist (cm) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newStomach}
                    onChange={e => setNewStomach(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2.5 text-sm font-bold text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">At navel height</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-400 mb-1">
                    Chest (cm) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newChest}
                    onChange={e => setNewChest(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-2.5 text-sm font-bold text-white font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">At nipple line relaxed</span>
                </div>
              </div>

              {/* Secondary Measurements */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Arms (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newArms}
                    onChange={e => setNewArms(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-xs text-zinc-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Thighs (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newThighs}
                    onChange={e => setNewThighs(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-xs text-zinc-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Body Fat %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newBodyFat}
                    onChange={e => setNewBodyFat(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-xs text-zinc-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Notes</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="e.g. Measured empty stomach before breakfast"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20"
                >
                  Save Entry
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

