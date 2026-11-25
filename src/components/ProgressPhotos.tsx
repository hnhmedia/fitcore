import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Loader2, Lock, Trash2, X, Columns2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSyncState } from './AccountModal';
import { isoDay } from '../utils/history';

interface Photo {
  id: string;
  date: string;
}

/** Ask the app to open the account screen (handled in App). */
export const openAccountScreen = () => window.dispatchEvent(new Event('aerofit:open-account'));

// Shrink to max 1280px on the long side as JPEG so uploads are small and fast.
async function compress(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const niceDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const ProgressPhotos: React.FC = () => {
  const sync = useSyncState();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [compare, setCompare] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sync.email) {
      setPhotos([]);
      return;
    }
    setLoading(true);
    fetch('/api/photos', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not load photos'))))
      .then((d) => setPhotos(d.photos || []))
      .catch(() => setError(navigator.onLine ? 'Could not load photos.' : 'Photos need an internet connection.'))
      .finally(() => setLoading(false));
  }, [sync.email]);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const dataUrl = await compress(file);
      const res = await fetch('/api/photos', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: isoDay(new Date()), dataUrl }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Upload failed');
      setPhotos((p) => [body.photo, ...p]);
    } catch (e) {
      setError((e as Error).message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    await fetch(`/api/photos/${id}`, { method: 'DELETE', credentials: 'same-origin' });
    setPhotos((p) => p.filter((x) => x.id !== id));
    setViewIndex(null);
  };

  const oldest = photos[photos.length - 1];
  const newest = photos[0];

  return (
    <section className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 mt-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Camera size={17} className="text-emerald-400" /> Progress photos
          </h3>
          <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
            <Lock size={11} /> Private to your account – only you can see them
          </p>
        </div>
        {sync.email && (
          <div className="flex gap-1.5">
            {photos.length >= 2 && (
              <button
                onClick={() => setCompare(true)}
                className="p-2.5 rounded-xl bg-zinc-800 text-zinc-200"
                title="Compare first and latest"
                aria-label="Compare first and latest photo"
              >
                <Columns2 size={16} />
              </button>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-500 text-black font-extrabold text-xs flex items-center gap-1.5 disabled:opacity-60"
            >
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />} Add
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />

      {!sync.email ? (
        <button
          onClick={openAccountScreen}
          className="w-full p-4 rounded-2xl border border-dashed border-zinc-700 text-sm text-zinc-300 font-semibold"
        >
          Sign in to save progress photos privately →
        </button>
      ) : loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 size={20} className="animate-spin text-zinc-500" />
        </div>
      ) : photos.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-6">
          Take one photo every 2–4 weeks: same spot, same lighting, same pose. Small changes are easy to miss in the mirror.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <button key={p.id} onClick={() => setViewIndex(i)} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-950">
              <img src={`/api/photos/${p.id}`} alt={`Progress photo ${p.date}`} loading="lazy" className="w-full h-full object-cover" />
              <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent text-[10px] font-bold text-white px-1.5 py-1 text-left">
                {niceDate(p.date)}
              </span>
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

      {/* Full-screen viewer */}
      {viewIndex !== null && photos[viewIndex] && createPortal(
        <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-fade-in">
          <div className="flex items-center justify-between p-3">
            <span className="text-sm font-bold text-white">{niceDate(photos[viewIndex].date)}</span>
            <div className="flex gap-1">
              <button onClick={() => remove(photos[viewIndex].id)} className="p-2.5 rounded-xl text-red-400" aria-label="Delete photo">
                <Trash2 size={18} />
              </button>
              <button onClick={() => setViewIndex(null)} className="p-2.5 rounded-xl text-white" aria-label="Close">
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 relative flex items-center justify-center min-h-0">
            <img src={`/api/photos/${photos[viewIndex].id}`} alt="" className="max-w-full max-h-full object-contain" />
            {viewIndex > 0 && (
              <button onClick={() => setViewIndex(viewIndex - 1)} className="absolute left-2 p-2 rounded-full bg-black/60 text-white" aria-label="Newer">
                <ChevronLeft size={22} />
              </button>
            )}
            {viewIndex < photos.length - 1 && (
              <button onClick={() => setViewIndex(viewIndex + 1)} className="absolute right-2 p-2 rounded-full bg-black/60 text-white" aria-label="Older">
                <ChevronRight size={22} />
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Before / after */}
      {compare && oldest && newest && createPortal(
        <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-fade-in">
          <div className="flex items-center justify-between p-3">
            <span className="text-sm font-bold text-white">Before vs now</span>
            <button onClick={() => setCompare(false)} className="p-2.5 rounded-xl text-white" aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-1 min-h-0 p-1">
            {[oldest, newest].map((p) => (
              <div key={p.id} className="relative flex items-center justify-center min-h-0 bg-zinc-950 rounded-lg overflow-hidden">
                <img src={`/api/photos/${p.id}`} alt="" className="max-w-full max-h-full object-contain" />
                <span className="absolute top-2 left-2 text-[11px] font-black bg-black/70 text-white px-2 py-1 rounded-lg">{niceDate(p.date)}</span>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};
