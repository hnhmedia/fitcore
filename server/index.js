// AeroFit server: serves the built app and a small account + sync API.
// Data model: one JSON document per (user, key), e.g. routines, completed workouts.
// The browser stays the working copy (works offline); this server is the backup and
// the bridge between devices.
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import pg from 'pg';
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const PORT = Number(process.env.PORT) || 5173;
const DATABASE_URL = process.env.DATABASE_URL;
const SIGNUP_DISABLED = process.env.SIGNUP_DISABLED === 'true';
const COOKIE = 'fc_session';
const SESSION_DAYS = 365;

// Keys a client may sync. Anything else is rejected.
const SYNC_KEYS = new Set([
  'routines',
  'completedWorkouts',
  'bodyMeasurements',
  'preferences',
  'geminiModel',
  'tombstones',
]);
const MAX_DOC_BYTES = 5 * 1024 * 1024;

const pool = DATABASE_URL
  ? new pg.Pool({
      connectionString: DATABASE_URL,
      max: 5,
      ssl: /sslmode=require|railway\.app|rlwy\.net/.test(DATABASE_URL) && !/\.railway\.internal/.test(DATABASE_URL)
        ? { rejectUnauthorized: false }
        : undefined,
    })
  : null;

async function migrate() {
  if (!pool) {
    console.warn('DATABASE_URL not set: accounts and sync are disabled, the app still works locally.');
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS progress_photos (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      taken_on TEXT NOT NULL,
      mime TEXT NOT NULL,
      data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS progress_photos_user ON progress_photos (user_id, taken_on);
    CREATE TABLE IF NOT EXISTS user_data (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value JSONB NOT NULL,
      updated_at BIGINT NOT NULL,
      PRIMARY KEY (user_id, key)
    );
  `);
}

// ---------- helpers ----------
async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

async function verifyPassword(password, stored) {
  const [, saltB64, hashB64] = stored.split('$');
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length);
  return timingSafeEqual(expected, actual);
}

const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const normEmail = (e) => String(e || '').trim().toLowerCase();

async function createSession(c, userId) {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await pool.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [
    sha256(token),
    userId,
    expires,
  ]);
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:' || c.req.header('x-forwarded-proto') === 'https',
    sameSite: 'Lax',
    path: '/',
    expires,
  });
}

async function currentUser(c) {
  const token = getCookie(c, COOKIE);
  if (!token || !pool) return null;
  const { rows } = await pool.query(
    `SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)],
  );
  return rows[0] || null;
}

// Simple in-memory throttle for login/signup: 10 attempts per IP per 15 minutes.
const attempts = new Map();
function throttled(c) {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const now = Date.now();
  const entry = attempts.get(ip) || { count: 0, reset: now + 15 * 60e3 };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + 15 * 60e3;
  }
  entry.count += 1;
  attempts.set(ip, entry);
  return entry.count > 10;
}

// ---------- app ----------
const app = new Hono();

app.get('/api/health', (c) => c.json({ ok: true, sync: Boolean(pool) }));

app.use('/api/*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  if (!pool) return c.json({ error: 'Sync is not configured on this server.' }, 503);
  await next();
});


app.get('/api/me', async (c) => {
  const user = await currentUser(c);
  return c.json({ user: user ? { email: user.email } : null, signupDisabled: SIGNUP_DISABLED });
});

app.post('/api/signup', async (c) => {
  if (SIGNUP_DISABLED) return c.json({ error: 'New accounts are turned off.' }, 403);
  if (throttled(c)) return c.json({ error: 'Too many attempts, try again in a few minutes.' }, 429);
  const body = await c.req.json().catch(() => ({}));
  const email = normEmail(body.email);
  const password = String(body.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: 'Enter a valid email.' }, 400);
  if (password.length < 8) return c.json({ error: 'Password needs at least 8 characters.' }, 400);
  try {
    const { rows } = await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id', [
      email,
      await hashPassword(password),
    ]);
    await createSession(c, rows[0].id);
    return c.json({ user: { email } });
  } catch (e) {
    if (e.code === '23505') return c.json({ error: 'That email already has an account. Log in instead.' }, 409);
    throw e;
  }
});

app.post('/api/login', async (c) => {
  if (throttled(c)) return c.json({ error: 'Too many attempts, try again in a few minutes.' }, 429);
  const body = await c.req.json().catch(() => ({}));
  const email = normEmail(body.email);
  const { rows } = await pool.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
  const ok = rows[0] && (await verifyPassword(String(body.password || ''), rows[0].password_hash));
  if (!ok) return c.json({ error: 'Wrong email or password.' }, 401);
  await createSession(c, rows[0].id);
  return c.json({ user: { email } });
});

app.post('/api/logout', async (c) => {
  const token = getCookie(c, COOKIE);
  if (token) await pool.query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
  deleteCookie(c, COOKIE, { path: '/' });
  return c.json({ ok: true });
});

// Returns every synced document for the user: { docs: { key: { value, updatedAt } } }
app.get('/api/sync', async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: 'Not logged in.' }, 401);
  const { rows } = await pool.query('SELECT key, value, updated_at FROM user_data WHERE user_id = $1', [user.id]);
  const docs = {};
  for (const r of rows) docs[r.key] = { value: r.value, updatedAt: Number(r.updated_at) };
  return c.json({ docs });
});

// Body: { docs: { key: { value, updatedAt } } }. A document is only replaced by a newer one.
app.put('/api/sync', async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: 'Not logged in.' }, 401);
  const body = await c.req.json().catch(() => null);
  const docs = body?.docs;
  if (!docs || typeof docs !== 'object') return c.json({ error: 'Bad request.' }, 400);
  const rowsToWrite = [];
  for (const [key, doc] of Object.entries(docs)) {
    if (!SYNC_KEYS.has(key)) continue;
    const json = JSON.stringify(doc?.value ?? null);
    if (json.length > MAX_DOC_BYTES) return c.json({ error: `${key} is too large.` }, 413);
    const at = Number(doc?.updatedAt);
    rowsToWrite.push({ key, json, updatedAt: Number.isFinite(at) && at >= 0 ? Math.floor(at) : Date.now() });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const { key, json, updatedAt } of rowsToWrite) {
      await client.query(
        `INSERT INTO user_data (user_id, key, value, updated_at) VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
         WHERE user_data.updated_at <= EXCLUDED.updated_at`,
        [user.id, key, json, updatedAt],
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  return c.json({ ok: true });
});

// ---------- progress photos (private to the account) ----------
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const MAX_PHOTOS = 500;

app.get('/api/photos', async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: 'Not logged in.' }, 401);
  const { rows } = await pool.query(
    'SELECT id, taken_on FROM progress_photos WHERE user_id = $1 ORDER BY taken_on DESC, id DESC',
    [user.id],
  );
  return c.json({ photos: rows.map((r) => ({ id: String(r.id), date: r.taken_on })) });
});

app.get('/api/photos/:id', async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: 'Not logged in.' }, 401);
  const id = c.req.param('id');
  if (!/^\d+$/.test(id)) return c.json({ error: 'Not found.' }, 404);
  const { rows } = await pool.query('SELECT mime, data FROM progress_photos WHERE id = $1 AND user_id = $2', [id, user.id]);
  if (!rows[0]) return c.json({ error: 'Not found.' }, 404);
  c.header('Content-Type', rows[0].mime);
  c.header('Cache-Control', 'private, max-age=31536000, immutable');
  return c.body(rows[0].data);
});

app.post('/api/photos', async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: 'Not logged in.' }, 401);
  const body = await c.req.json().catch(() => ({}));
  const date = String(body.date || '');
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(String(body.dataUrl || ''));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !match) return c.json({ error: 'Bad photo.' }, 400);
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > MAX_PHOTO_BYTES) return c.json({ error: 'Photo is too large.' }, 413);
  const { rows: count } = await pool.query('SELECT count(*)::int AS n FROM progress_photos WHERE user_id = $1', [user.id]);
  if (count[0].n >= MAX_PHOTOS) return c.json({ error: 'Photo limit reached. Delete some old ones first.' }, 409);
  const { rows } = await pool.query(
    'INSERT INTO progress_photos (user_id, taken_on, mime, data) VALUES ($1, $2, $3, $4) RETURNING id',
    [user.id, date, match[1], bytes],
  );
  return c.json({ photo: { id: String(rows[0].id), date } });
});

app.delete('/api/photos/:id', async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: 'Not logged in.' }, 401);
  const id = c.req.param('id');
  if (!/^\d+$/.test(id)) return c.json({ error: 'Not found.' }, 404);
  await pool.query('DELETE FROM progress_photos WHERE id = $1 AND user_id = $2', [id, user.id]);
  return c.json({ ok: true });
});

app.all('/api/*', (c) => c.json({ error: 'Not found.' }, 404));

// ---------- static app ----------
// Hashed build assets can be cached forever; everything else must revalidate so updates show up.
app.use('/assets/*', async (c, next) => {
  await next();
  if (c.res.status === 200) c.header('Cache-Control', 'public, max-age=31536000, immutable');
});
app.use('*', async (c, next) => {
  await next();
  if (!c.res.headers.get('Cache-Control')) c.header('Cache-Control', 'no-cache');
});
app.use('*', serveStatic({ root: './dist' }));
// Single-page app fallback
app.get('*', serveStatic({ path: './dist/index.html' }));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Server error.' }, 500);
});

await migrate();
// Clear expired sessions once a day.
if (pool) setInterval(() => pool.query('DELETE FROM sessions WHERE expires_at < now()').catch(() => {}), 864e5).unref();

serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' }, (info) => {
  console.log(`AeroFit server listening on :${info.port}`);
});
