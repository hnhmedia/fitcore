// Account + cloud sync.
//
// The browser's localStorage stays the working copy, so the app keeps working offline.
// When logged in, each synced collection is merged with the server copy:
//   - lists (routines, workouts, measurements) are merged item by item using their id,
//     deletions travel as "tombstones" so a deleted item doesn't come back from another device;
//   - single values (preferences, model) use whichever side changed last.
// Data that was already on a device before the first login is kept and uploaded.

export type SyncKey =
  | 'routines'
  | 'completedWorkouts'
  | 'bodyMeasurements'
  | 'preferences'
  | 'geminiModel';

export const LOCAL_KEYS: Record<SyncKey, string> = {
  routines: 'aerofit_routines',
  completedWorkouts: 'aerofit_completed_workouts',
  bodyMeasurements: 'aerofit_body_measurements',
  preferences: 'aerofit_user_preferences',
  geminiModel: 'aerofit_gemini_model',
};

const LIST_KEYS: SyncKey[] = ['routines', 'completedWorkouts', 'bodyMeasurements'];
const ALL_KEYS = Object.keys(LOCAL_KEYS) as SyncKey[];

const META_KEY = 'fitcore_sync_meta';
const TOMBSTONES_KEY = 'fitcore_tombstones';
const ACCOUNT_KEY = 'fitcore_account';
const LAST_SYNC_KEY = 'fitcore_last_sync';
const BACKUP_KEY = 'fitcore_backup_before_first_sync';
const MAX_TOMBSTONES = 3000;

type Meta = Partial<Record<SyncKey, { updatedAt: number; seeded?: boolean }>>;
type Tombstones = Partial<Record<SyncKey, string[]>>;
interface ServerDoc { value: unknown; updatedAt: number }
type ServerDocs = Partial<Record<SyncKey | 'tombstones', ServerDoc>>;

export type SyncStatus = 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error';
export interface SyncState {
  email: string | null;
  status: SyncStatus;
  lastSyncedAt: number | null;
  message?: string;
}

// ---------- small localStorage helpers ----------
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
const writeJson = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

// geminiModel is stored as a plain string, everything else as JSON.
function readLocal(key: SyncKey): unknown {
  const raw = localStorage.getItem(LOCAL_KEYS[key]);
  if (raw === null) return undefined;
  if (key === 'geminiModel') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
function writeLocalRaw(key: SyncKey, value: unknown) {
  if (key === 'geminiModel') localStorage.setItem(LOCAL_KEYS[key], String(value));
  else writeJson(LOCAL_KEYS[key], value);
}

const getMeta = () => readJson<Meta>(META_KEY, {});
const getTombstones = () => readJson<Tombstones>(TOMBSTONES_KEY, {});

// ---------- state + listeners ----------
let state: SyncState = {
  email: readJson<{ email: string } | null>(ACCOUNT_KEY, null)?.email ?? null,
  status: readJson<{ email: string } | null>(ACCOUNT_KEY, null) ? 'synced' : 'signed-out',
  lastSyncedAt: readJson<number | null>(LAST_SYNC_KEY, null),
};
const stateListeners = new Set<(s: SyncState) => void>();
const dataListeners = new Set<() => void>();

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  stateListeners.forEach((l) => l(state));
}

// ---------- hooks called by storageService ----------
const keyForLocal = (localKey: string) =>
  (Object.keys(LOCAL_KEYS) as SyncKey[]).find((k) => LOCAL_KEYS[k] === localKey);

/** Call after the app writes a synced key itself (a real user change). */
function noteLocalWrite(localKey: string, previous: unknown, next: unknown) {
  const key = keyForLocal(localKey);
  if (!key) return;
  if (LIST_KEYS.includes(key) && Array.isArray(previous) && Array.isArray(next)) {
    const kept = new Set(next.map((i: { id?: string }) => i?.id));
    const removed = previous.map((i: { id?: string }) => i?.id).filter((id): id is string => !!id && !kept.has(id));
    if (removed.length) addTombstones(key, removed);
  }
  const meta = getMeta();
  meta[key] = { updatedAt: Date.now() };
  writeJson(META_KEY, meta);
  scheduleSync();
}

/** Call when the app writes demo/sample data, so it never overrides real data from the account. */
function noteSeed(localKey: string) {
  const key = keyForLocal(localKey);
  if (!key) return;
  const meta = getMeta();
  meta[key] = { updatedAt: 0, seeded: true };
  writeJson(META_KEY, meta);
}

function addTombstones(key: SyncKey, ids: string[]) {
  const t = getTombstones();
  const set = new Set([...(t[key] || []), ...ids]);
  t[key] = [...set].slice(-MAX_TOMBSTONES);
  writeJson(TOMBSTONES_KEY, t);
}

// ---------- merging ----------
type Item = { id: string; [k: string]: unknown };

function mergeLists(key: SyncKey, local: Item[], server: Item[], localNewer: boolean, dead: Set<string>): Item[] {
  const [primary, secondary] = localNewer ? [local, server] : [server, local];
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const item of [...primary, ...secondary]) {
    if (!item || typeof item.id !== 'string' || seen.has(item.id) || dead.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  if (key === 'bodyMeasurements') {
    out.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  } else if (key === 'completedWorkouts') {
    out.sort((a, b) => (Number(b.startTime) || 0) - (Number(a.startTime) || 0));
  }
  return out;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// ---------- API ----------
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error || `Request failed (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return body as T;
}

let started = false;
let running: Promise<void> | null = null;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;

function scheduleSync(delay = 1500) {
  if (!state.email) return;
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delay);
}

async function doSync() {
  if (!state.email) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setState({ status: 'offline' });
    return;
  }
  setState({ status: 'syncing', message: undefined });
  let docs: ServerDocs;
  try {
    docs = (await api<{ docs: ServerDocs }>('/api/sync')).docs || {};
  } catch (e) {
    handleError(e);
    return;
  }

  // First sync on this device: keep a copy of what was here, just in case.
  if (!localStorage.getItem(BACKUP_KEY)) {
    const backup: Record<string, unknown> = {};
    ALL_KEYS.forEach((k) => (backup[k] = readLocal(k)));
    writeJson(BACKUP_KEY, { savedAt: new Date().toISOString(), data: backup });
  }

  // Everything below runs synchronously so it sees the freshest local data.
  const meta = getMeta();
  const now = Date.now();
  const toPush: ServerDocs = {};
  let localChanged = false;

  // Tombstones: union of both sides.
  const serverDead = (docs.tombstones?.value || {}) as Tombstones;
  const localDead = getTombstones();
  const mergedDead: Tombstones = {};
  for (const k of LIST_KEYS) {
    const set = new Set([...(localDead[k] || []), ...(serverDead[k] || [])]);
    if (set.size) mergedDead[k] = [...set].slice(-MAX_TOMBSTONES);
  }
  writeJson(TOMBSTONES_KEY, mergedDead);
  if (!same(mergedDead, serverDead)) toPush.tombstones = { value: mergedDead, updatedAt: now };

  for (const key of ALL_KEYS) {
    const local = readLocal(key);
    const server = docs[key];
    const m = meta[key];
    const localAt = m?.updatedAt ?? 0; // data from before sync existed counts as oldest
    let merged: unknown;

    if (!server) {
      if (local === undefined) continue;
      merged = local;
    } else if (local === undefined || (m?.seeded && server)) {
      merged = server.value;
    } else if (LIST_KEYS.includes(key) && Array.isArray(local) && Array.isArray(server.value)) {
      merged = mergeLists(key, local as Item[], server.value as Item[], localAt >= server.updatedAt, new Set(mergedDead[key] || []));
    } else {
      merged = localAt >= server.updatedAt ? local : server.value;
    }

    if (!same(merged, local)) {
      writeLocalRaw(key, merged);
      localChanged = true;
    }
    const serverAt = server?.updatedAt ?? 0;
    if (!server || !same(merged, server.value)) {
      // Untouched demo data goes up with time 0 so it never beats real data elsewhere.
      const at = m?.seeded && !server ? 0 : Math.max(now, serverAt + 1);
      toPush[key] = { value: merged, updatedAt: at };
      meta[key] = { updatedAt: at, ...(at === 0 ? { seeded: true } : {}) };
    } else {
      meta[key] = { updatedAt: serverAt, ...(m?.seeded && serverAt === 0 ? { seeded: true } : {}) };
    }
  }
  writeJson(META_KEY, meta);
  if (localChanged) dataListeners.forEach((l) => l());

  try {
    if (Object.keys(toPush).length) {
      await api('/api/sync', { method: 'PUT', body: JSON.stringify({ docs: toPush }) });
    }
    const at = Date.now();
    writeJson(LAST_SYNC_KEY, at);
    setState({ status: 'synced', lastSyncedAt: at });
  } catch (e) {
    handleError(e);
  }
}

function handleError(e: unknown) {
  const err = e as Error & { status?: number };
  if (err.status === 401) {
    // Session ended (logged out elsewhere or expired). Local data stays.
    localStorage.removeItem(ACCOUNT_KEY);
    setState({ email: null, status: 'signed-out', message: 'You were logged out. Log in again to keep syncing.' });
  } else if (!navigator.onLine || err instanceof TypeError) {
    setState({ status: 'offline' });
  } else {
    setState({ status: 'error', message: err.message });
  }
}

export async function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await doSync();
      } while (again);
    } finally {
      running = null;
    }
  })();
  return running;
}

async function authenticate(path: '/api/login' | '/api/signup', email: string, password: string) {
  const res = await api<{ user: { email: string } }>(path, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  writeJson(ACCOUNT_KEY, { email: res.user.email });
  setState({ email: res.user.email, status: 'syncing', message: undefined });
  await syncNow();
}

export const syncService = {
  noteLocalWrite,
  noteSeed,
  syncNow,
  getState: () => state,
  subscribe(listener: (s: SyncState) => void) {
    stateListeners.add(listener);
    return () => void stateListeners.delete(listener);
  },
  /** Fires when synced data arrived from the server and the screen should reload it. */
  onRemoteData(listener: () => void) {
    dataListeners.add(listener);
    return () => void dataListeners.delete(listener);
  },
  login: (email: string, password: string) => authenticate('/api/login', email, password),
  signup: (email: string, password: string) => authenticate('/api/signup', email, password),
  async logout() {
    await api('/api/logout', { method: 'POST' }).catch(() => undefined);
    localStorage.removeItem(ACCOUNT_KEY);
    setState({ email: null, status: 'signed-out', message: undefined });
  },
  /** Check the session with the server and start syncing; safe to call on every app start. */
  async start() {
    if (started) return;
    started = true;
    const sync = () => scheduleSync(300);
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') sync();
    });
    try {
      const me = await api<{ user: { email: string } | null }>('/api/me');
      if (me.user) {
        writeJson(ACCOUNT_KEY, { email: me.user.email });
        setState({ email: me.user.email });
        await syncNow();
      } else if (state.email) {
        localStorage.removeItem(ACCOUNT_KEY);
        setState({ email: null, status: 'signed-out' });
      }
    } catch {
      // Offline or server unreachable: keep working locally.
      if (state.email) setState({ status: 'offline' });
    }
  },
};
