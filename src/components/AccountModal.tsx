import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, Loader2, LogOut, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { syncService, SyncState } from '../services/syncService';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function useSyncState(): SyncState {
  const [state, setState] = useState<SyncState>(syncService.getState());
  useEffect(() => syncService.subscribe(setState), []);
  return state;
}

function timeAgo(ts: number | null): string {
  if (!ts) return 'never';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(ts).toLocaleDateString();
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const sync = useSyncState();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') await syncService.signup(email, password);
      else await syncService.login(email, password);
      setPassword('');
    } catch (err) {
      setError((err as Error).message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const statusLine: Record<SyncState['status'], string> = {
    'signed-out': 'Not signed in',
    syncing: 'Syncing…',
    synced: `Synced ${timeAgo(sync.lastSyncedAt)}`,
    offline: 'Offline – changes are saved on this device and will sync when you are back online',
    error: sync.message || 'Sync failed, will retry',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Cloud size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Account & Backup</h2>
              <p className="text-xs text-zinc-400">Keep your workouts safe and synced across devices</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {sync.email ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
              <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-500">Signed in as</p>
              <p className="text-sm font-bold text-white mt-1 break-all">{sync.email}</p>
              <p
                className={`text-xs mt-3 flex items-center gap-1.5 ${
                  sync.status === 'error' ? 'text-red-400' : sync.status === 'offline' ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {sync.status === 'syncing' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : sync.status === 'offline' ? (
                  <CloudOff size={13} />
                ) : (
                  <ShieldCheck size={13} />
                )}
                {statusLine[sync.status]}
              </p>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Routines, workouts, body measurements and settings are backed up to your account. Your Gemini API key stays
              on this device only.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => void syncService.syncNow()}
                disabled={sync.status === 'syncing'}
                className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-extrabold text-sm flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} /> Sync now
              </button>
              <button
                onClick={() => void syncService.logout()}
                className="px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 font-bold text-sm flex items-center gap-2"
              >
                <LogOut size={16} /> Log out
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">Logging out keeps everything on this device.</p>
            <button
              onClick={async () => {
                const pw = prompt(
                  'Delete your account? This permanently removes your cloud backup, synced data and progress photos. Data on this device stays.\n\nEnter your password to confirm:'
                );
                if (!pw) return;
                try {
                  await syncService.deleteAccount(pw);
                  alert('Your account and cloud data have been deleted.');
                } catch (e) {
                  alert((e as Error).message || 'Could not delete the account.');
                }
              }}
              className="w-full pt-3 mt-1 border-t border-zinc-800 text-xs font-bold text-red-400/80 hover:text-red-400"
            >
              Delete account
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="flex p-1 rounded-2xl bg-zinc-900 border border-zinc-800 mb-2">
              {(['signup', 'login'] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    mode === m ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {m === 'signup' ? 'Create account' : 'Log in'}
                </button>
              ))}
            </div>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 outline-none text-sm text-white placeholder:text-zinc-500"
            />
            <input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Password (8+ characters)' : 'Password'}
              className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 outline-none text-sm text-white placeholder:text-zinc-500"
            />
            {(error || sync.message) && <p className="text-xs text-red-400">{error || sync.message}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-extrabold text-sm flex items-center justify-center gap-2"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {mode === 'signup' ? 'Create account & back up' : 'Log in & sync'}
            </button>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Everything already on this device is kept and uploaded to your account. Tip: create the account on the
              device that has your real workout history, then log in on the others.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
