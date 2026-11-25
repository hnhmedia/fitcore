import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Check, Loader2, Trash2, X, Plus, ImageOff } from 'lucide-react';
import { CompletedWorkout, GymMachine } from '../types';
import { daysAgo, getLastPerformance, normName } from '../utils/history';

interface Props {
  exerciseName: string;
  machines: GymMachine[]; // all saved machines
  selectedId?: string;
  completedWorkouts: CompletedWorkout[];
  unit: 'kg' | 'lbs';
  onSelect: (machineId: string | undefined) => void;
  onSaveMachines: (machines: GymMachine[]) => void;
  onClose: () => void;
}

const MAX_MACHINES = 120;

// Small JPEG (max 480px) so photos fit in the app's storage and sync quickly.
async function toSmallJpeg(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, 480 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.7);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const MachinePicker: React.FC<Props> = ({
  exerciseName,
  machines,
  selectedId,
  completedWorkouts,
  unit,
  onSelect,
  onSaveMachines,
  onClose,
}) => {
  const key = normName(exerciseName);
  const forExercise = machines.filter((m) => m.exerciseKey === key);
  const [adding, setAdding] = useState(forExercise.length === 0);
  const [label, setLabel] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setPhoto(await toSmallJpeg(file));
    } catch {
      setError('Could not read that photo.');
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!photo && !label.trim()) {
      setError('Add a photo or a short name.');
      return;
    }
    if (machines.length >= MAX_MACHINES) {
      setError('You have a lot of machines saved. Delete a few old ones first.');
      return;
    }
    const m: GymMachine = {
      id: `mc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      exerciseKey: key,
      label: label.trim() || `Machine ${forExercise.length + 1}`,
      photo,
      createdAt: new Date().toISOString(),
    };
    try {
      onSaveMachines([...machines, m]);
    } catch {
      setError('Phone storage is full. Delete some machine photos and try again.');
      return;
    }
    onSelect(m.id);
    onClose();
  };

  const remove = (id: string) => {
    if (!confirm('Delete this machine? Past workouts keep their numbers.')) return;
    onSaveMachines(machines.filter((m) => m.id !== id));
    if (selectedId === id) onSelect(undefined);
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[88vh] overflow-y-auto shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Which machine?</p>
            <h3 className="text-lg font-black text-white leading-tight">{exerciseName}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Save each machine with a photo so you always know which one you used and what you lifted on it.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-zinc-400 hover:text-white shrink-0" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!adding && (
          <div className="space-y-2">
            {forExercise.map((m) => {
              const last = getLastPerformance(completedWorkouts, exerciseName, m.id, true);
              const selected = m.id === selectedId;
              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl border ${
                    selected ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900/60'
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelect(m.id);
                      onClose();
                    }}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left"
                  >
                    {m.photo ? (
                      <img src={m.photo} alt={m.label} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    ) : (
                      <span className="w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-500">
                        <ImageOff size={18} />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-white truncate">{m.label}</span>
                      <span className="block text-[11px] text-zinc-400 mt-0.5">
                        {last
                          ? `Last ${daysAgo(last.date)}: ${last.sets.map((s) => `${s.weight}×${s.reps}`).join(', ')} ${unit}`
                          : 'Not used yet'}
                      </span>
                    </span>
                  </button>
                  {selected ? (
                    <Check size={18} className="text-emerald-400 shrink-0" />
                  ) : (
                    <button onClick={() => remove(m.id)} className="p-2 text-zinc-600 hover:text-red-400 shrink-0" aria-label={`Delete ${m.label}`}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}
            {selectedId && (
              <button
                onClick={() => {
                  onSelect(undefined);
                  onClose();
                }}
                className="w-full py-2.5 rounded-2xl text-xs font-bold text-zinc-400 bg-zinc-900/60 border border-zinc-800"
              >
                Don’t track a specific machine
              </button>
            )}
            <button
              onClick={() => setAdding(true)}
              className="w-full py-3 rounded-2xl bg-emerald-500 text-black font-black text-sm flex items-center justify-center gap-2"
            >
              <Plus size={17} /> Add a machine
            </button>
          </div>
        )}

        {adding && (
          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => pickPhoto(e.target.files?.[0])}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 flex flex-col items-center justify-center gap-2 overflow-hidden"
            >
              {busy ? (
                <Loader2 size={24} className="animate-spin text-zinc-500" />
              ) : photo ? (
                <img src={photo} alt="Machine" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Camera size={28} className="text-emerald-400" />
                  <span className="text-sm font-bold text-zinc-200">Take a photo of the machine</span>
                  <span className="text-[11px] text-zinc-500">Include the brand plate or a nearby landmark</span>
                </>
              )}
            </button>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Name it, e.g. “Hammer Strength – by the window”"
              className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 outline-none text-sm text-white placeholder:text-zinc-500"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              {forExercise.length > 0 && (
                <button onClick={() => setAdding(false)} className="px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-bold">
                  Back
                </button>
              )}
              <button onClick={save} disabled={busy} className="flex-1 py-3 rounded-2xl bg-emerald-500 text-black font-black text-sm disabled:opacity-60">
                Save & use this machine
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
