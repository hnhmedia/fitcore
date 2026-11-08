import React, { useState } from 'react';
import { X, Dumbbell, Calculator } from 'lucide-react';

interface PlateCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultWeight?: number;
  unit?: 'kg' | 'lbs';
}

const KG_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const LBS_PLATES = [45, 35, 25, 10, 5, 2.5];

const PLATE_COLORS: Record<number, string> = {
  25: 'bg-red-600 border-red-400 text-white',
  20: 'bg-blue-600 border-blue-400 text-white',
  15: 'bg-yellow-500 border-yellow-300 text-black',
  10: 'bg-green-600 border-green-400 text-white',
  5: 'bg-white border-zinc-300 text-black',
  2.5: 'bg-zinc-800 border-zinc-600 text-zinc-200',
  1.25: 'bg-zinc-700 border-zinc-500 text-zinc-300',
  // LBS
  45: 'bg-blue-600 border-blue-400 text-white',
  35: 'bg-yellow-500 border-yellow-300 text-black',
};

export const PlateCalculatorModal: React.FC<PlateCalculatorModalProps> = ({
  isOpen,
  onClose,
  defaultWeight = 80,
  unit = 'kg',
}) => {
  const [targetWeight, setTargetWeight] = useState(defaultWeight);
  const [barWeight, setBarWeight] = useState(unit === 'kg' ? 20 : 45);

  if (!isOpen) return null;

  const availablePlates = unit === 'kg' ? KG_PLATES : LBS_PLATES;

  // Calculate plates per side
  const calculatePlates = () => {
    let weightPerSide = Math.max(0, (targetWeight - barWeight) / 2);
    const result: { plate: number; count: number }[] = [];

    for (const plate of availablePlates) {
      if (weightPerSide >= plate) {
        const count = Math.floor(weightPerSide / plate);
        result.push({ plate, count });
        weightPerSide -= count * plate;
      }
    }

    const remainder = weightPerSide * 2;
    return { platesPerSide: result, remainder };
  };

  const { platesPerSide, remainder } = calculatePlates();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Barbell Plate Calculator</h3>
              <p className="text-xs text-zinc-400">Plates to load on each side of the bar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Target Total ({unit})</label>
            <input
              type="number"
              step="0.5"
              value={targetWeight}
              onChange={e => setTargetWeight(parseFloat(e.target.value) || 0)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-center font-mono font-bold text-lg text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Bar Weight ({unit})</label>
            <select
              value={barWeight}
              onChange={e => setBarWeight(parseFloat(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-emerald-500 h-[46px]"
            >
              {unit === 'kg' ? (
                <>
                  <option value={20}>Standard Olympic (20 kg)</option>
                  <option value={15}>Women / Technique Bar (15 kg)</option>
                  <option value={10}>EZ Curl Bar (10 kg)</option>
                </>
              ) : (
                <>
                  <option value={45}>Standard Olympic (45 lbs)</option>
                  <option value={35}>Women / Technique Bar (35 lbs)</option>
                  <option value={25}>EZ Curl Bar (25 lbs)</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Visual Barbell Representation */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 mb-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-3 text-center">
            Each Side Needs ({(Math.max(0, targetWeight - barWeight) / 2).toFixed(2)} {unit}):
          </p>

          {platesPerSide.length > 0 ? (
            <div className="flex items-center justify-center gap-1.5 flex-wrap min-h-[50px] p-2 bg-zinc-950/80 rounded-xl border border-zinc-800">
              {/* Bar sleeve */}
              <div className="w-4 h-12 bg-zinc-700 rounded-l-md border-r-2 border-zinc-500" />
              {/* Plates */}
              {platesPerSide.flatMap(({ plate, count }) =>
                Array.from({ length: count }).map((_, i) => (
                  <div
                    key={`${plate}-${i}`}
                    className={`px-2 py-3 rounded-md font-mono font-bold text-xs shadow-md border ${
                      PLATE_COLORS[plate] || 'bg-zinc-800 border-zinc-700 text-white'
                    }`}
                  >
                    {plate}
                  </div>
                ))
              )}
              {/* Collar */}
              <div className="w-2 h-8 bg-zinc-600 rounded-r-sm" />
            </div>
          ) : (
            <p className="text-center text-xs text-zinc-400 py-4">Bar only, no additional plates needed.</p>
          )}

          {/* Table of plates per side */}
          {platesPerSide.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-zinc-800/80">
              {platesPerSide.map(({ plate, count }) => (
                <div key={plate} className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60 text-xs">
                  <span className="font-mono font-bold text-zinc-200">{plate} {unit} plate</span>
                  <span className="font-bold text-emerald-400 font-mono">× {count}</span>
                </div>
              ))}
            </div>
          )}

          {remainder > 0.05 && (
            <p className="text-[11px] text-amber-400 text-center mt-2">
              Note: Unloadable remainder of {remainder.toFixed(2)} {unit} with available plates.
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs"
        >
          Close
        </button>

      </div>
    </div>
  );
};

