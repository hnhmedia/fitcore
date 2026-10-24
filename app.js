'use strict';
/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const r1 = n => Math.round((+n || 0) * 10) / 10;
const r0 = n => Math.round(+n || 0);
const { iso, addDays, weekdayIdx, weekStart, MUSCLES } = FC;
const today = () => iso(new Date());
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const buzz = (ms = 12) => { if (st?.settings?.haptics && navigator.vibrate) navigator.vibrate(ms); };
const EXCL = /\b(tofu|broccoli|fish|salmon|tuna|shrimp|prawns?|crab|lobster|squid|sardines?|mackerel|seafood|oysters?|mussels?|cod|tilapia|anchov\w*)\b/i;
const WEEK_TARGET = 20;

function toast(m) { const t = $('#toast'); t.textContent = m; t.className = 'show'; clearTimeout(toast.t); toast.t = setTimeout(() => t.className = '', 2200); }

/* ---------- default data ---------- */
const S = (name, serving, cal, p, c, f) => ({ id: uid(), name, serving, cal, p, c, f });
const defaultStaples = () => [
  S('Chicken breast (cooked)', '150 g', 248, 46, 0, 5),
  S('Whole egg', '1 large', 72, 6.3, 0.4, 4.8),
  S('Paneer', '100 g', 265, 18, 1.2, 20),
  S('Dal / Lentils (cooked)', '1 katori (150 g)', 160, 9, 24, 3),
  S('Bhindi subzi', '1 katori (100 g)', 90, 2, 8, 6),
  S('Tinda subzi', '1 katori (100 g)', 70, 1.5, 7, 4),
  S('Dudhi subzi', '1 katori (100 g)', 60, 1.5, 6, 3.5),
  S('Phulka / Roti', '1 piece', 80, 3, 16, 0.5),
  S('Whey Protein', '1 scoop (30 g)', 120, 24, 3, 1.5),
  S('Pistachio-Date-Cardamom Greek Yogurt Protein Mousse', '1 bowl (est.)', 280, 30, 28, 7)
];
const E = (name, muscle, sets, repMin, repMax) => ({ id: uid(), name, muscle, sets, repMin, repMax });
const defaultSplit = () => [
  { name: 'Push', exercises: [E('Chest Press Machine', 'Chest', 3, 8, 12), E('Incline Chest Press Machine', 'Chest', 3, 8, 12), E('Pec Deck Fly', 'Chest', 3, 10, 15), E('Shoulder Press Machine', 'Shoulders', 3, 8, 12), E('Lateral Raise Machine', 'Shoulders', 3, 12, 15), E('Seated Dip Machine', 'Arms', 3, 10, 12)] },
  { name: 'Pull', exercises: [E('Lat Pulldown Machine', 'Back', 3, 8, 12), E('Chest-Supported Row Machine', 'Back', 3, 8, 12), E('Machine Low Row', 'Back', 3, 10, 12), E('Reverse Pec Deck', 'Shoulders', 3, 12, 15), E('Preacher Curl Machine', 'Arms', 3, 10, 12)] },
  { name: 'Legs', exercises: [E('Leg Press', 'Quads', 3, 8, 12), E('Hack Squat Machine', 'Quads', 3, 8, 12), E('Leg Extension', 'Quads', 3, 12, 15), E('Seated Leg Curl', 'Hamstrings', 4, 10, 12)] },
  { name: 'Rest', exercises: [] },
  { name: 'Upper', exercises: [E('Chest Press Machine', 'Chest', 3, 8, 12), E('Machine Row', 'Back', 3, 8, 12), E('Shoulder Press Machine', 'Shoulders', 3, 8, 12), E('Lat Pulldown Machine', 'Back', 3, 10, 12), E('Biceps Curl Machine', 'Arms', 3, 10, 12), E('Triceps Extension Machine', 'Arms', 3, 10, 12)] },
  { name: 'Lower', exercises: [E('Leg Press', 'Quads', 3, 10, 12), E('Leg Extension', 'Quads', 3, 12, 15), E('Lying Leg Curl', 'Hamstrings', 4, 10, 12), E('Seated Leg Curl', 'Hamstrings', 3, 12, 15)] },
  { name: 'Rest', exercises: [] }
];
const defaultState = () => ({
  settings: { key: '', proxy: '', model: 'gemini-2.5-flash', target: { cal: 1900, p: 160, c: 180, f: 60 }, stepMin: 10000, stepMax: 15000, water: 3000, startKg: 84, goalLo: 76, goalHi: 77, rest: 90, theme: 'auto', haptics: true, gistToken: '', gistId: '', autoSync: false, lastBackup: '', lastSync: '' },
  days: {}, weights: {}, scans: [], staples: defaultStaples(), presets: [[], [], [], [], []], mealNames: ['Meal 1', 'Meal 2', 'Meal 3', 'Meal 4', 'Meal 5'],
  split: defaultSplit(), logs: {}, chat: []
});

let st = defaultState();
const normalize = j => { const s = Object.assign(defaultState(), j); s.settings = Object.assign(defaultState().settings, j.settings || {}); return s; };

/* storage: IndexedDB primary (localStorage fallback + one-time migration) */
const idb = {
  db: null,
  open() {
    return new Promise(res => {
      try {
        const q = indexedDB.open('fitcore', 1);
        q.onupgradeneeded = () => q.result.createObjectStore('kv');
        q.onsuccess = () => { idb.db = q.result; res(true); };
        q.onerror = () => res(false);
      } catch { res(false); }
    });
  },
  get(k) { return new Promise(res => { const r = idb.db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => res(undefined); }); },
  set(k, v) { return new Promise(res => { const t = idb.db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(true); t.onerror = () => res(false); }); }
};
let saveT, syncT;
const save = () => {
  clearTimeout(saveT);
  saveT = setTimeout(async () => {
    const ok = idb.db && await idb.set('state', JSON.parse(JSON.stringify(st)));
    if (!ok) { try { localStorage.setItem('fitcore', JSON.stringify(st)); } catch { toast('⚠️ Storage full. Export a backup'); } }
    if (st.settings.autoSync && st.settings.gistToken) { clearTimeout(syncT); syncT = setTimeout(() => A.gistPush(null, null, true), 8000); }
  }, 250);
};
window.addEventListener('pagehide', () => { if (!idb.db) try { localStorage.setItem('fitcore', JSON.stringify(st)); } catch { } });
async function loadState() {
  const ok = await idb.open();
  let raw = ok ? await idb.get('state') : undefined;
  if (!raw) { try { const l = localStorage.getItem('fitcore'); if (l) { raw = JSON.parse(l); if (ok) { await idb.set('state', raw); localStorage.removeItem('fitcore'); } } } catch { } }
  st = normalize(raw || {});
  if (!ok) toast('IndexedDB unavailable, using localStorage');
  navigator.storage?.persist?.();
}
function applyTheme() {
  const t = st.settings.theme;
  document.documentElement.dataset.theme = t === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t;
  document.querySelector('meta[name=theme-color]').content = document.documentElement.dataset.theme === 'light' ? '#f4f6f9' : '#0f1216';
}
const stripSecrets = s => { const c = JSON.parse(JSON.stringify(s)); delete c.settings.key; delete c.settings.gistToken; delete c.settings.gistId; return c; };

const ui = { tab: 'dash', date: today(), wDay: weekdayIdx(today()), modal: null, busy: false, timer: null };
const D = (d = ui.date) => {
  const x = st.days[d] ||= {};
  x.meals ||= [[], [], [], [], []]; x.supps ||= {}; x.steps ??= 0; x.water ??= 0; x.tread ||= []; x.cricket ||= [];
  return x;
};
const totals = (d = ui.date) => FC.dayTotals(D(d));
const curKg = () => { const k = Object.keys(st.weights).sort(); return k.length ? st.weights[k[k.length - 1]] : st.settings.startKg; };

/* ---------- charts ---------- */
const weightSeries = () => FC.weightSeries(st.weights);
function lineChart(series, { H = 130, W = 320, P = 28, fmt = v => r1(v), band } = {}) {
  const pts = series.filter(s => s.pts.length);
  if (!pts.length) return '<div class="mu sm tc">Not enough data yet</div>';
  const all = pts.flatMap(s => s.pts.map(p => p.v)).concat(band || []);
  let mn = Math.min(...all), mx = Math.max(...all); if (mn === mx) { mn -= 1; mx += 1; }
  const pad = (mx - mn) * 0.1; mn -= pad; mx += pad;
  const ds = [...new Set(pts.flatMap(s => s.pts.map(p => p.d)))].sort();
  const x = d => P + (ds.length === 1 ? (W - 2 * P) / 2 : ds.indexOf(d) * (W - 2 * P) / (ds.length - 1));
  const y = v => H - 16 - (v - mn) / (mx - mn) * (H - 30);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">${band ? `<rect x="${P}" y="${y(band[1])}" width="${W - 2 * P}" height="${Math.max(2, y(band[0]) - y(band[1]))}" fill="#3ddc9722"/>` : ''}
  <text x="2" y="${y(mx) + 8}">${fmt(mx)}</text><text x="2" y="${y(mn)}">${fmt(mn)}</text>
  ${series.map(s => s.pts.length ? `<path d="${s.pts.map((p, i) => (i ? 'L' : 'M') + x(p.d).toFixed(1) + ' ' + y(p.v).toFixed(1)).join('')}" fill="none" stroke="${s.color}" stroke-width="${s.w || 2.5}" ${s.dash ? 'stroke-dasharray="3 3"' : ''}/>${s.dots ? s.pts.map(p => `<circle cx="${x(p.d)}" cy="${y(p.v)}" r="3" fill="${s.color}"/>`).join('') : ''}` : '').join('')}
  <text x="${P}" y="${H - 2}">${ds[0].slice(5)}</text><text x="${W - P - 24}" y="${H - 2}">${ds[ds.length - 1].slice(5)}</text></svg>`;
}
function weightChart() {
  const s = weightSeries().slice(-30);
  if (!s.length) return '<div class="mu sm tc">Log your first weight to see the chart</div>';
  return lineChart([{ color: '#8b97a6', w: 1, dash: true, dots: true, pts: s.map(p => ({ d: p.d, v: p.w })) }, { color: '#3ddc97', pts: s.map(p => ({ d: p.d, v: p.ma })) }], { H: 150, band: [st.settings.goalLo, st.settings.goalHi] })
    + `<div class="row sm mu"><span style="color:var(--ac)">━ 7-day avg</span><span>┅ daily scale</span><span>▭ goal ${st.settings.goalLo}-${st.settings.goalHi}</span></div>`;
}
function trendHtml() {
  const t = FC.trend(st.weights, st.settings.goalHi);
  if (!t) return '<div class="sm mu" style="margin-top:6px">Log weight on a few days to see your rate of loss.</div>';
  const col = t.status === 'ok' ? 'var(--ac)' : t.status === 'fast' ? 'var(--bad)' : 'var(--ft)';
  const note = { ok: 'Healthy pace.', fast: '⚠️ Losing faster than ~1%/week. Risk of muscle loss, consider adding calories.', stalled: '⚠️ Weight is flat. Check intake accuracy or trim ~150 kcal.' }[t.status];
  return `<div class="sm" style="margin-top:8px"><b style="color:${col}">${t.rate > 0 ? '+' : ''}${t.rate} kg/week</b> (${t.pct}%/wk) ${t.proj ? `· projected <b>${t.proj}</b> to reach ${st.settings.goalHi} kg` : ''}<div class="mu">${note}</div></div>`;
}
function adaptiveHtml() {
  const a = FC.adaptive(st.weights, st.days, st.settings.target.cal, today());
  if (!a) return '<div class="sm mu">Adaptive calories needs ~2 weeks of weigh-ins and 7+ logged food days.</div>';
  return `<div class="sm"><b>Adaptive target:</b> avg intake ${a.avg} kcal · est. maintenance ~${a.tdee} kcal<div class="mu">${a.msg}</div>${a.delta ? `<button class="b sm" style="margin-top:6px" data-a="applyCal" data-v="${a.suggested}">Set target to ${a.suggested} kcal</button>` : ''}</div>`;
}

/* ---------- workout logic ---------- */
const dateForWD = i => addDays(weekStart(today()), i);
const lastSession = (exId, before) => FC.lastSession(st.logs, exId, before);
const overload = (ex, date) => FC.overload(st.logs, ex, date);
const weeklyVolume = (date = today()) => FC.weeklyVolume(st.logs, date);
function getLog(ex, date, create) {
  let l = st.logs[date]?.[ex.id];
  if (l) return l;
  const ls = lastSession(ex.id, date);
  l = { name: ex.name, muscle: ex.muscle, sets: Array.from({ length: ex.sets }, (_, i) => ({ w: ls?.sets[i]?.w ?? ls?.sets[0]?.w ?? '', r: '', rir: '', done: false })) };
  if (create) (st.logs[date] ||= {})[ex.id] = l;
  return l;
}

/* ---------- rest timer ---------- */
function startTimer(sec) {
  ui.timer = { end: Date.now() + sec * 1000, sec };
  drawTimer();
}
function drawTimer() {
  let el = $('#timer');
  if (!ui.timer) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'timer'; el.innerHTML = '⏱ Rest <b></b> <button data-a="timerAdd">+30s</button><button data-a="timerStop">Skip</button>'; document.body.appendChild(el); }
  const left = Math.ceil((ui.timer.end - Date.now()) / 1000);
  if (left <= 0) { beep(); buzz([200, 100, 200]); ui.timer = null; toast('Rest over. Next set!'); el.remove(); return; }
  el.querySelector('b').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}
setInterval(() => { if (ui.timer) drawTimer(); }, 500);
function beep() {
  try { const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = 0.15; o.start(); setTimeout(() => { o.stop(); c.close(); }, 350); } catch { }
}

/* ---------- Gemini ---------- */
const SYS = 'You are a precise fitness and nutrition coach for an Indian user losing weight from 84 kg toward 76-77 kg with progressive overload on low-stability machines. NEVER suggest or include tofu, seafood/fish, or broccoli. Prefer high-protein Indian foods. Be concise and practical.';
async function gemini(contents, { json = false, system = SYS } = {}) {
  const s = st.settings;
  if (!s.key && !s.proxy) throw new Error('Add your Gemini API key (or proxy URL) in Hub → Settings first.');
  const body = { contents: typeof contents === 'string' ? [{ role: 'user', parts: [{ text: contents }] }] : contents, systemInstruction: { parts: [{ text: system }] } };
  if (json) body.generationConfig = { responseMimeType: 'application/json' };
  const r = s.proxy
    ? await fetch(s.proxy, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: s.model, body }) })
    : await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.model)}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.key }, body: JSON.stringify(body)
    });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Gemini error ' + r.status);
  return (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
}
function parseJ(t) {
  t = t.replace(/```(?:json)?/gi, '').trim();
  const a = t.search(/[\[{]/); if (a < 0) throw new Error('No JSON found');
  const end = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  return JSON.parse(t.slice(a, end + 1));
}
const cleanFoods = arr => (Array.isArray(arr) ? arr : arr?.items || []).filter(f => f && f.name && !EXCL.test(f.name)).map(f => ({ id: uid(), name: String(f.name), serving: f.serving || '1 serving', cal: r0(f.cal), p: r1(f.p), c: r1(f.c), f: r1(f.f), per100: !!f.per100 }));

/* ---------- context for coach ---------- */
function context() {
  const t = totals(), g = st.settings.target, d = D();
  const lines = [`Date: ${ui.date}. Current weight ${curKg()} kg (start ${st.settings.startKg}, goal ${st.settings.goalLo}-${st.settings.goalHi}).`];
  lines.push(`Daily targets: ${g.cal} kcal, P ${g.p}g, C ${g.c}g, F ${g.f}g.`);
  lines.push(`Eaten so far: ${r0(t.cal)} kcal, P ${r0(t.p)}g, C ${r0(t.c)}g, F ${r0(t.f)}g. REMAINING: ${r0(g.cal - t.cal)} kcal, P ${r0(g.p - t.p)}g, C ${r0(g.c - t.c)}g, F ${r0(g.f - t.f)}g.`);
  d.meals.forEach((m, i) => lines.push(`${st.mealNames[i]}: ` + (m.length ? m.map(x => `${x.name} x${x.qty ?? 1} (${r0(x.cal * (x.qty ?? 1))}kcal/${r0(x.p * (x.qty ?? 1))}gP)`).join('; ') : 'empty')));
  lines.push('Supplements taken: ' + (['whey', 'creatine', 'collagen'].filter(k => d.supps[k]).join(', ') || 'none') + `. Steps ${d.steps}, water ${d.water}ml.`);
  const v = weeklyVolume(); lines.push('Weekly sets this week (target 20): ' + MUSCLES.map(m => `${m} ${v[m]}`).join(', '));
  const wd = weekdayIdx(ui.date), day = st.split[wd];
  lines.push(`Today's workout (${day?.name}): ` + (day?.exercises.map(e => `${e.name} [${e.muscle}] ${e.sets}x${e.repMin}-${e.repMax} -> ${overload(e, ui.date).badge} ${overload(e, ui.date).last}`).join(' | ') || 'rest'));
  const ws = weightSeries().slice(-7); lines.push('Last weigh-ins (daily/7d avg): ' + (ws.map(p => `${p.d.slice(5)} ${p.w}/${r1(p.ma)}`).join(', ') || 'none'));
  const tr = FC.trend(st.weights, st.settings.goalHi); if (tr) lines.push(`Weight trend: ${tr.rate} kg/week (${tr.status})${tr.proj ? ', projected goal date ' + tr.proj : ''}.`);
  const ad = FC.adaptive(st.weights, st.days, g.cal, today()); if (ad) lines.push(`Avg intake ${ad.avg} kcal, est. maintenance ${ad.tdee}. ${ad.msg}`);
  const stalled = st.split.flatMap(x => x.exercises).filter(e => FC.plateau(st.logs, e.id, addDays(today(), 1)));
  if (stalled.length) lines.push('Plateaued exercises: ' + stalled.map(e => e.name).join(', '));
  const sc = st.scans.slice(-3); if (sc.length) lines.push('Body scans: ' + sc.map(s => `${s.date} BF ${s.bf}% SMM ${s.smm}kg`).join('; '));
  return lines.join('\n');
}

/* ---------- renderers ---------- */
function ring(label, val, target, color, unit, big) {
  const R = 34, C = 2 * Math.PI * R, pct = Math.min(1, target ? val / target : 0);
  return `<div class="ring ${big ? 'big' : ''}"><svg viewBox="0 0 90 90"><circle cx="45" cy="45" r="${R}" fill="none" stroke="#242c36" stroke-width="${big ? 11 : 9}"/>
  <circle cx="45" cy="45" r="${R}" fill="none" stroke="${val > target * 1.05 && label !== 'Protein' ? '#ff5c6c' : color}" stroke-width="${big ? 11 : 9}" stroke-linecap="round" stroke-dasharray="${C * pct} ${C}" transform="rotate(-90 45 45)"/>
  <text x="45" y="49" text-anchor="middle" style="fill:#e8edf3;font-size:15px;font-weight:700">${r0(val)}</text></svg>
  <div class="l">${label}</div><div class="v sm">/${target}${unit}</div></div>`;
}

function rDash() {
  const t = totals(), g = st.settings.target, d = D(), sset = st.settings;
  const wk = Array.from({ length: 7 }, (_, i) => D(addDays(weekStart(ui.date), i)).steps);
  const stepDays = wk.filter(s => s >= sset.stepMin).length;
  const kg = curKg(), lost = r1(sset.startKg - kg), toGo = r1(Math.max(0, kg - sset.goalHi));
  const sc = st.scans.slice(-3).reverse();
  const tread = d.tread.reduce((a, b) => a + b.kcal, 0), cr = d.cricket.reduce((a, b) => a + b.kcal, 0);
  const stepKcal = r0(d.steps * 0.04 * kg / 70), burned = r0(tread + cr + stepKcal);
  const streak = FC.streak(st.days, g.p, today());
  const lastB = st.settings.lastBackup, needBackup = !lastB || (Date.parse(today()) - Date.parse(lastB)) / 864e5 >= 7;
  const p14 = Array.from({ length: 14 }, (_, i) => { const dd = addDays(today(), i - 13); return { dd, p: FC.dayTotals(st.days[dd]).p }; });
  const scanPts = k => st.scans.map(s => ({ d: s.date, v: s[k] }));
  return `
  ${needBackup && Object.keys(st.days).length ? `<div class="card" style="border:1px solid var(--ft)"><div class="row sp"><span class="sm">💾 ${lastB ? 'No backup in 7+ days' : 'No backup yet'}. Your data lives only on this device.</span><button class="b sm" data-a="exp">Back up now</button></div></div>` : ''}
  <div class="row sp" style="margin-bottom:8px"><button class="ic" data-a="day" data-v="-1">◀</button><b>${ui.date === today() ? 'Today' : ui.date}</b><button class="ic" data-a="day" data-v="1">▶</button></div>
  <div class="card"><div class="rings">${ring('Protein', t.p, g.p, '#ff7a59', 'g', true)}${ring('Calories', t.cal, g.cal, '#3ddc97', '')}${ring('Carbs', t.c, g.c, '#5ab0ff', 'g')}${ring('Fats', t.f, g.f, '#f5c542', 'g')}</div>
  <div class="sm mu tc" style="margin-top:8px">Remaining: <b style="color:var(--pr)">${Math.max(0, r0(g.p - t.p))}g protein</b> · ${r0(g.cal - t.cal)} kcal</div>
  <div class="sm mu tc" style="margin-top:4px">🔥 Est. burned today ${burned} kcal (steps ${stepKcal}, treadmill ${r0(tread)}, cricket ${r0(cr)}) · <b style="color:var(--tx)">Net ${r0(t.cal - burned)} kcal</b>${streak ? ` · 🔥 ${streak}-day protein streak` : ''}</div></div>

  <div class="card"><h3>⚖️ Weight <small>${kg} kg · −${lost} kg · ${toGo} kg to ${sset.goalHi}</small></h3>
  <div class="row"><input id="wIn" type="number" step="0.1" placeholder="Scale weight (kg)" class="grow" value="${st.weights[ui.date] ?? ''}"><button class="b" data-a="logW">Log</button></div>
  <div style="margin-top:8px">${weightChart()}</div>${trendHtml()}
  <div style="margin-top:10px">${adaptiveHtml()}</div>
  <h3 style="margin-top:14px">🧬 Body Composition Scan</h3>
  <div class="row"><input id="bfIn" type="number" step="0.1" placeholder="Body fat %" class="grow"><input id="smIn" type="number" step="0.1" placeholder="Skeletal muscle kg" class="grow"><button class="b" data-a="logScan">Add</button></div>
  ${st.scans.length > 1 ? `<div style="margin-top:8px">${lineChart([{ color: '#f5c542', dots: true, pts: scanPts('bf') }], { H: 90 })}<div class="sm mu">Body fat % trend</div>${lineChart([{ color: '#5ab0ff', dots: true, pts: scanPts('smm') }], { H: 90 })}<div class="sm mu">Skeletal muscle (kg) trend</div></div>` : ''}
  ${sc.map((s, i) => { const p = st.scans[st.scans.length - 2 - i]; const dl = p ? ` (BF ${r1(s.bf - p.bf) > 0 ? '+' : ''}${r1(s.bf - p.bf)}, SMM ${r1(s.smm - p.smm) > 0 ? '+' : ''}${r1(s.smm - p.smm)})` : ''; return `<div class="sm mu" style="margin-top:6px">${s.date}: BF <b style="color:var(--tx)">${s.bf}%</b> · SMM <b style="color:var(--tx)">${s.smm} kg</b>${dl}</div>`; }).join('')}</div>

  <div class="card"><h3>🥩 Protein, last 14 days <small>🔥 ${streak}-day streak</small></h3>
  <div style="display:flex;align-items:flex-end;gap:3px;height:70px">${p14.map(x => `<div title="${x.dd}: ${r0(x.p)}g" style="flex:1;height:${Math.max(3, Math.min(100, x.p / g.p * 100))}%;background:${x.p >= g.p * 0.9 ? 'var(--ac)' : x.p ? 'var(--pr)' : 'var(--card2)'};border-radius:3px"></div>`).join('')}</div>
  <div class="sm mu">Green = hit 90%+ of ${g.p} g</div></div>

  <div class="card"><h3>💊 Supplements</h3><div class="row">${[['whey', 'Whey'], ['creatine', 'Creatine'], ['collagen', 'Collagen']].map(([k, n]) => `<button class="tog ${d.supps[k] ? 'on' : ''}" data-a="supp" data-v="${k}">${d.supps[k] ? '✓ ' : ''}${n}</button>`).join('')}</div></div>

  <div class="card"><h3>🏃 Activity &amp; Google Health <small>${stepDays}/6 step days this week</small></h3>
  <div class="row"><div class="grow"><div class="sm mu">Steps (goal ${sset.stepMin.toLocaleString()}–${sset.stepMax.toLocaleString()})</div><input id="stIn" type="number" value="${d.steps || ''}" placeholder="0" data-c="steps"></div><button class="b s" data-a="addSteps" data-v="1000">+1k</button><button class="b s" data-a="addSteps" data-v="2500">+2.5k</button></div>
  <div class="bar ${d.steps > sset.stepMax ? '' : ''}" style="margin:8px 0"><i style="width:${Math.min(100, d.steps / sset.stepMin * 100)}%"></i></div>
  <div class="row"><button class="b s sm" data-a="gh">🔄 Google Health sync (simulated)</button><button class="b s sm" data-a="ghInfo">How to connect</button></div>
  <hr style="border:0;border-top:1px solid #222a33;margin:12px 0">
  <div class="sm mu">Incline treadmill <b>${r0(tread)} kcal</b> today</div>
  <div class="row" style="margin-top:4px"><input id="trMin" class="n" type="number" placeholder="min" value="30"><input id="trSp" class="n" type="number" step="0.5" value="6"><input id="trIn" class="n" type="number" value="9"><span class="sm mu">min · km/h · %</span><button class="b sm" data-a="logTread">Log</button></div>
  ${d.tread.map((x, i) => `<div class="sm mu">• ${x.min} min @ ${x.sp} km/h, ${x.inc}% → ${x.kcal} kcal <button class="ic" data-a="delTread" data-v="${i}">✕</button></div>`).join('')}
  <hr style="border:0;border-top:1px solid #222a33;margin:12px 0">
  <div class="sm mu">🏏 Cricket <b>${r0(cr)} kcal</b> today</div>
  <div class="row" style="margin-top:4px"><input id="crMin" class="n" type="number" placeholder="min" value="120"><select id="crInt" style="width:auto"><option value="4">Casual (MET 4)</option><option value="5.5" selected>Match (MET 5.5)</option><option value="7">Intense (MET 7)</option></select><button class="b sm" data-a="logCricket">Log</button></div>
  ${d.cricket.map((x, i) => `<div class="sm mu">• ${x.min} min → ${x.kcal} kcal <button class="ic" data-a="delCricket" data-v="${i}">✕</button></div>`).join('')}
  <hr style="border:0;border-top:1px solid #222a33;margin:12px 0">
  <div class="row sp"><div>💧 Hydration <b>${d.water}</b> / ${sset.water} ml</div><div class="row"><button class="b s sm" data-a="water" data-v="250">+250</button><button class="b s sm" data-a="water" data-v="500">+500</button><button class="b s sm" data-a="water" data-v="-250">−</button></div></div>
  <div class="bar" style="margin-top:6px"><i style="width:${Math.min(100, d.water / sset.water * 100)}%;background:var(--cb)"></i></div></div>`;
}

function rMeals() {
  const d = D(), t = totals(), g = st.settings.target;
  const body = d.meals.map((m, i) => {
    const mt = m.reduce((a, x) => ({ cal: a.cal + x.cal * (x.qty ?? 1), p: a.p + x.p * (x.qty ?? 1) }), { cal: 0, p: 0 });
    return `<div class="card"><h3>${esc(st.mealNames[i])} <small>${r0(mt.cal)} kcal · ${r0(mt.p)}g P</small></h3>
    ${m.map((x, j) => `<div class="swipe"><div class="food" data-sw="${i},${j}"><div class="nm"><b>${esc(x.name)}</b><span class="sm mu">${r0(x.cal * (x.qty ?? 1))} kcal · P${r0(x.p * (x.qty ?? 1))} C${r0(x.c * (x.qty ?? 1))} F${r0(x.f * (x.qty ?? 1))} · ${esc(x.serving)}</span></div>
      <input class="n" type="number" step="0.25" min="0" value="${x.qty ?? 1}" data-c="qty" data-m="${i}" data-j="${j}">
      <button class="ic ${isStar(x) ? 'on' : ''}" data-a="starItem" data-m="${i}" data-j="${j}">${isStar(x) ? '⭐' : '☆'}</button><button class="ic" data-a="delFood" data-m="${i}" data-j="${j}">✕</button></div></div>`).join('')}
    <div class="row" style="margin-top:8px"><button class="b sm" data-a="openFood" data-m="${i}">＋ Add food</button>${st.presets[i].length ? `<button class="b s sm" data-a="applyPreset" data-m="${i}">Preset (${st.presets[i].length})</button>` : ''}<button class="b s sm" data-a="copyYMeal" data-m="${i}">⎘ Yesterday</button>${m.length ? `<button class="b s sm" data-a="savePreset" data-m="${i}">💾 Save as preset</button>` : ''}</div></div>`;
  }).join('');
  return `<div class="row sp" style="margin-bottom:8px"><button class="ic" data-a="day" data-v="-1">◀</button><b>${ui.date === today() ? 'Today' : ui.date}</b><button class="ic" data-a="day" data-v="1">▶</button></div>
  <div class="row" style="margin-bottom:8px"><button class="b s sm" data-a="copyYDay">⎘ Copy all meals from the previous day</button></div>
  <div class="sm mu" style="margin-bottom:8px">Tip: swipe a food row left to delete it.</div>
  <div class="card"><div class="row sp"><div><b style="color:var(--pr)">${r0(t.p)}</b>/${g.p}g P</div><div><b>${r0(t.cal)}</b>/${g.cal} kcal</div><div>C ${r0(t.c)}/${g.c}</div><div>F ${r0(t.f)}/${g.f}</div></div>
  <div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, t.p / g.p * 100)}%;background:var(--pr)"></i></div></div>${body}`;
}
const isStar = x => st.staples.some(s => s.name.toLowerCase() === x.name.toLowerCase());

function rWork() {
  const wd = ui.wDay, day = st.split[wd], date = dateForWD(wd), vol = weeklyVolume();
  const volCard = `<div class="card"><h3>📈 Weekly volume <small>target ${WEEK_TARGET} sets</small></h3>${MUSCLES.map(m => `<div style="margin-bottom:8px"><div class="row sp sm"><span>${m}</span><span class="${vol[m] >= WEEK_TARGET ? '' : 'mu'}">${vol[m]}/${WEEK_TARGET}</span></div><div class="bar"><i style="width:${Math.min(100, vol[m] / WEEK_TARGET * 100)}%"></i></div></div>`).join('')}</div>`;
  const ex = day.exercises.map(e => {
    const o = overload(e, date), log = getLog(e, date, false), plat = FC.plateau(st.logs, e.id, date);
    const nextIdx = log.sets.findIndex(s => !s.done);
    return `<div class="card"><div class="row sp"><div class="grow"><b>${esc(e.name)}</b> <span class="tag">${e.muscle}</span><div class="sm mu">${e.sets}×${e.repMin}-${e.repMax} reps</div></div><button class="ic" data-a="hist" data-v="${e.id}" title="Strength history">📈</button><button class="ic" data-a="editEx" data-v="${e.id}">✏️</button></div>
    <div style="margin:6px 0"><span class="badge ${o.cls}">${o.cls === 'up' ? '⬆ ' : o.cls === 'rep' ? '🎯 ' : '🆕 '}${o.badge}</span></div><div class="sm mu">${esc(o.last)}</div>
    ${plat ? '<div class="sm" style="color:var(--ft);margin-top:4px">⚠️ Plateau: no progress in 3 sessions. Try a 10% deload for a week, change the rep range, or swap the machine.</div>' : ''}
    <div class="set sh"><span></span><span class="sm mu">kg</span><span class="sm mu">reps</span><span class="sm mu">RIR</span><span></span></div>
    ${log.sets.map((s, i) => `<div class="set ${i === nextIdx ? 'cur' : ''}"><span class="i">${i + 1}</span><input type="number" inputmode="decimal" step="0.5" placeholder="kg" value="${s.w}" data-c="set" data-e="${e.id}" data-i="${i}" data-f="w"><input type="number" inputmode="numeric" placeholder="reps" value="${s.r}" data-c="set" data-e="${e.id}" data-i="${i}" data-f="r"><input type="number" inputmode="numeric" placeholder="–" min="0" max="10" value="${s.rir ?? ''}" data-c="set" data-e="${e.id}" data-i="${i}" data-f="rir"><input type="checkbox" ${s.done ? 'checked' : ''} data-c="set" data-e="${e.id}" data-i="${i}" data-f="done"></div>`).join('')}
    <div class="row" style="margin-top:8px">${nextIdx >= 0 ? `<button class="b" data-a="nextSet" data-v="${e.id}">✓ Done set ${nextIdx + 1}</button>` : '<span class="badge rep">✓ All sets done</span>'}<button class="b s sm" data-a="copyLast" data-v="${e.id}">⎘ Copy last</button><button class="b s sm" data-a="addSet" data-v="${e.id}">+ Set</button><button class="b s sm" data-a="swap" data-v="${e.id}">🔄 Suggest Machine Swap</button></div></div>`;
  }).join('');
  return `<div class="scroll">${st.split.map((d, i) => `<button class="chip ${i === wd ? 'on' : ''}" data-a="wday" data-v="${i}">${DAYS[i]}<small>${esc(d.name)}</small></button>`).join('')}</div>
  <div class="row sp" style="margin:8px 0"><b>${DAYS[wd]} · ${esc(day.name)}</b><div class="row"><input id="dayName" value="${esc(day.name)}" style="width:110px" data-c="dayname"><button class="b s sm" data-a="addEx">＋ Exercise</button></div></div>
  ${day.exercises.length ? ex : '<div class="card tc mu">😴 Rest day. Recover, walk, hydrate.</div>'}${volCard}`;
}

const md = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^\s*[\*\-] /gm, '• ').replace(/\n/g, '<br>');
function rCoach() {
  const qa = [['log', '📝 Log Meal with AI Text'], ['next', '🍗 What Should I Eat Next to Hit My Macros?'], ['swap', '🔄 Suggest Low-Stability Machine Swap'], ['audit', '📋 Weekly Weight & Overload Audit']];
  return `<div class="card"><div class="chips">${qa.map(([k, l]) => `<button class="chip" data-a="qa" data-v="${k}">${l}</button>`).join('')}</div></div>
  <div id="chat">${st.chat.map(m => `<div class="msg ${m.r === 'user' ? 'u' : 'a'}">${md(m.t)}</div>`).join('') || '<div class="mu tc sm">Ask anything. The coach sees your meals, macros, volume, overload and weight trend.</div>'}${ui.busy ? '<div class="msg a mu">Thinking…</div>' : ''}</div>
  <div class="row" style="margin-top:10px"><input id="chatIn" class="grow" placeholder="Ask your coach…"><button class="b" data-a="send">Send</button><button class="b s" data-a="clearChat">🗑</button></div>`;
}

const PROMPT_DIET = `Create a diet plan for me: Indian, high protein, weight loss from 84 kg to 76-77 kg, 5 meals/day, NO tofu, seafood, or broccoli. Include daily targets and 5 meals with items and macros. Then output ONLY this JSON at the end:
{"targets":{"cal":0,"p":0,"c":0,"f":0},"meals":[{"name":"Meal 1","items":[{"name":"","serving":"","cal":0,"p":0,"c":0,"f":0}]}]}`;
const PROMPT_WORK = `Create a 5-day PPLUL split (Push, Pull, Legs, Rest, Upper, Lower, Rest = Mon-Sun) using low-stability machine exercises, ~20 sets/week per muscle group, with sets and rep ranges. Muscle must be one of: Chest, Back, Shoulders, Quads, Hamstrings, Arms. Then output ONLY this JSON at the end:
{"days":[{"day":"Mon","name":"Push","exercises":[{"name":"","muscle":"Chest","sets":3,"repMin":8,"repMax":12}]}]}`;

function rHub() {
  const s = st.settings, g = s.target;
  return `<div class="card"><h3>🔑 Settings</h3>
  <div class="sm mu" style="margin-top:8px">Gemini API key (stored only on this device, get one at aistudio.google.com)</div><input id="keyIn" type="password" value="${esc(s.key)}" placeholder="AIza…">
  <div class="sm mu" style="margin-top:8px">…or Gemini proxy URL (keeps the key off this device, see <code>gemini-proxy-worker.js</code>)</div><input id="proxyIn" type="url" value="${esc(s.proxy)}" placeholder="https://your-worker.workers.dev">
  <div class="sm mu" style="margin-top:8px">Model</div><input id="modelIn" value="${esc(s.model)}">
  <div class="sm mu" style="margin-top:8px">Daily targets: kcal · protein · carbs · fat</div>
  <div class="row"><input class="n" id="tCal" type="number" value="${g.cal}"><input class="n" id="tP" type="number" value="${g.p}"><input class="n" id="tC" type="number" value="${g.c}"><input class="n" id="tF" type="number" value="${g.f}"></div>
  <div class="sm mu" style="margin-top:8px">Start kg · goal low · goal high · water ml · steps min · max</div>
  <div class="row"><input class="n" id="sKg" type="number" value="${s.startKg}"><input class="n" id="sLo" type="number" value="${s.goalLo}"><input class="n" id="sHi" type="number" value="${s.goalHi}"><input class="n" id="sW" type="number" value="${s.water}"><input class="n" id="sSm" type="number" value="${s.stepMin}"><input class="n" id="sSx" type="number" value="${s.stepMax}"></div>
  <div class="sm mu" style="margin-top:8px">Rest timer (sec) · theme · haptics</div>
  <div class="row"><input class="n" id="sRest" type="number" value="${s.rest}"><select id="sTheme" style="width:auto">${['auto', 'dark', 'light'].map(t => `<option ${t === s.theme ? 'selected' : ''}>${t}</option>`).join('')}</select><label class="row sm"><input type="checkbox" id="sHap" ${s.haptics ? 'checked' : ''}> Vibrate</label></div>
  <button class="b" style="margin-top:10px" data-a="saveSet">Save settings</button></div>

  <div class="card"><h3>☁️ Cloud sync <small>${s.lastSync ? 'last: ' + esc(s.lastSync) : 'off'}</small></h3>
  <div class="sm mu">Syncs your data (not your keys) to a <b>private GitHub Gist</b> so it survives clearing the browser or changing phones. Create a token at github.com/settings/tokens (classic) with only the <code>gist</code> scope.</div>
  <input id="gTok" type="password" placeholder="GitHub token (gist scope)" value="${esc(s.gistToken)}" style="margin-top:8px"><input id="gId" placeholder="Gist ID (auto-filled after first push; paste on a new device)" value="${esc(s.gistId)}" style="margin-top:8px">
  <label class="row sm" style="margin-top:8px"><input type="checkbox" id="gAuto" ${s.autoSync ? 'checked' : ''}> Auto-push after changes</label>
  <div class="row" style="margin-top:8px"><button class="b" data-a="gistPush">⬆ Push</button><button class="b s" data-a="gistPull">⬇ Pull (replaces local)</button></div></div>

  <div class="card"><h3>🥗 Import Diet Plan from Gemini</h3><div class="row" style="margin-bottom:8px"><button class="b s sm" data-a="copyP" data-v="diet">📋 Copy Prompt for Gemini</button></div>
  <textarea id="dietTx" placeholder="Paste the diet plan text from Gemini here…"></textarea><button class="b" style="margin-top:8px" data-a="impDiet">Parse &amp; Import</button></div>

  <div class="card"><h3>🏋️ Import Workout Plan from Gemini</h3><div class="row" style="margin-bottom:8px"><button class="b s sm" data-a="copyP" data-v="work">📋 Copy Prompt for Gemini</button></div>
  <textarea id="workTx" placeholder="Paste the workout routine from Gemini here…"></textarea><button class="b" style="margin-top:8px" data-a="impWork">Parse &amp; Import</button></div>

  <div class="card"><h3>💾 Backup</h3><div class="row"><button class="b" data-a="exp">Export JSON</button><button class="b s" data-a="copyExp">Copy JSON</button><button class="b s" data-a="impFile">Import file</button></div>
  <input type="file" id="file" accept=".json" hidden><textarea id="jsonTx" placeholder="…or paste exported JSON here" style="margin-top:8px;min-height:70px"></textarea><button class="b s" style="margin-top:8px" data-a="impJson">Import pasted JSON</button>
  <button class="b d" style="margin-top:8px" data-a="reset">Reset all data</button></div>`;
}

/* ---------- modal ---------- */
function rModal() {
  const m = ui.modal, el = $('#modal');
  if (!m) { el.innerHTML = ''; return; }
  let h = '';
  if (m.type === 'food') {
    const star = f => `<button class="ic ${isStar(f) ? 'on' : ''}" data-a="starRes" data-v="${f._i}">${isStar(f) ? '⭐' : '☆'}</button>`;
    const row = f => `<div class="food"><div class="nm"><b>${esc(f.name)}</b><span class="sm mu">${f.cal} kcal · P${f.p} C${f.c} F${f.f} · ${esc(f.serving)}</span></div>${f.per100 ? `<input class="n" id="g${f._i}" type="number" inputmode="decimal" value="100" style="width:64px"><span class="sm mu">g</span>` : ''}${star(f)}<button class="b sm" data-a="addRes" data-v="${f._i}">Add</button></div>`;
    const list = (m.tab === 'staples' ? st.staples : m.results).map((f, i) => ({ ...f, _i: i }));
    h = `<div class="row sp"><b>Add to</b><select id="mealSel" style="width:auto">${st.mealNames.map((n, i) => `<option value="${i}" ${i === m.meal ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><button class="ic" data-a="close">✕</button></div>
    <div class="tabs" style="margin-top:10px">${[['staples', '⭐ Staples'], ['search', '🔎 Search'], ['ai', '✨ AI']].map(([k, l]) => `<button class="chip ${m.tab === k ? 'on' : ''}" data-a="ftab" data-v="${k}">${l}</button>`).join('')}</div>
    ${m.tab === 'staples' ? `<div class="chips" style="margin-bottom:8px">${st.staples.map((f, i) => `<span class="chip" data-a="addStaple" data-v="${i}">${esc(f.name.length > 22 ? f.name.slice(0, 20) + '…' : f.name)}<small>${f.p}gP</small></span>`).join('')}</div><div class="sm mu">Tap a chip to add 1 serving. ✕ below removes from vault.</div>${st.staples.map((f, i) => `<div class="food"><div class="nm"><b>${esc(f.name)}</b><span class="sm mu">${f.cal} kcal · P${f.p} C${f.c} F${f.f} · ${esc(f.serving)}</span></div><button class="ic" data-a="delStaple" data-v="${i}">✕</button></div>`).join('')}` : ''}
    ${m.tab === 'search' ? `<div class="row"><input id="fq" class="grow" placeholder="e.g. greek yogurt, oats…" value="${esc(m.q || '')}"><button class="b" data-a="doSearch">Search</button></div><div class="sm mu">Open Food Facts · values per 100 g</div>${m.loading ? '<div class="mu">Searching…</div>' : list.map(row).join('') || '<div class="mu sm">No results yet</div>'}` : ''}
    ${m.tab === 'ai' ? `<textarea id="aiq" placeholder="Describe what you ate, e.g. '2 phulka, 1 bowl bhindi, 150g chicken curry'">${esc(m.q || '')}</textarea><button class="b" style="margin:8px 0" data-a="doAI">✨ Estimate macros</button>${m.loading ? '<div class="mu">Estimating…</div>' : ''}${m.results.length ? `<button class="b s sm" data-a="addAll">Add all to meal</button>` : ''}${list.map(row).join('')}` : ''}`;
  } else if (m.type === 'hist') {
    const hh = FC.history(st.logs, m.ex.id);
    h = `<div class="row sp"><b>${esc(m.ex.name)}: strength history</b><button class="ic" data-a="close">✕</button></div>` + (hh.length < 2 ? '<p class="mu sm">Log at least 2 sessions to see a trend.</p>' : `${lineChart([{ color: '#ff7a59', dots: true, pts: hh.map(x => ({ d: x.d, v: x.e1rm })) }], { H: 140, fmt: v => r0(v) })}<div class="sm mu">Estimated 1RM (kg) per session (Epley)</div>${lineChart([{ color: '#5ab0ff', dots: true, pts: hh.map(x => ({ d: x.d, v: x.top })) }], { H: 110, fmt: v => r0(v) })}<div class="sm mu">Top set weight (kg)</div>`) + (hh.length ? `<div class="sm mu" style="margin-top:8px">Best e1RM: <b style="color:var(--tx)">${r0(Math.max(...hh.map(x => x.e1rm)))} kg</b> · ${hh.length} sessions</div>` : '');
  } else if (m.type === 'swap') {
    h = `<div class="row sp"><b>Machine swap: ${esc(m.ex.name)}</b><button class="ic" data-a="close">✕</button></div>${m.loading ? '<p class="mu">Asking Gemini…</p>' : m.res ? `<p><b>${esc(m.res.name)}</b> <span class="tag">${esc(m.res.muscle)}</span></p><p class="sm mu">${esc(m.res.reason || '')}</p><button class="b" data-a="applySwap">Replace exercise</button>` : `<p class="mu">${esc(m.err || '')}</p>`}`;
  } else if (m.type === 'ex') {
    const e = m.ex;
    h = `<div class="row sp"><b>${m.isNew ? 'Add' : 'Edit'} exercise</b><button class="ic" data-a="close">✕</button></div>
    <input id="exN" placeholder="Machine / exercise" value="${esc(e.name)}"><div class="row" style="margin:8px 0"><select id="exM">${MUSCLES.concat(['Other']).map(x => `<option ${x === e.muscle ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    <div class="row"><input class="n" id="exS" type="number" value="${e.sets}"><input class="n" id="exA" type="number" value="${e.repMin}"><input class="n" id="exB" type="number" value="${e.repMax}"><span class="sm mu">sets · min · max reps</span></div>
    <div class="row" style="margin-top:12px"><button class="b" data-a="saveEx">Save</button>${m.isNew ? '' : '<button class="b d" data-a="delEx">Delete</button>'}</div>`;
  } else if (m.type === 'info') {
    h = `<div class="row sp"><b>${esc(m.title)}</b><button class="ic" data-a="close">✕</button></div><div style="margin-top:8px">${m.html}</div>`;
  }
  el.innerHTML = `<div class="sheet">${h}</div>`;
}

/* ---------- main render ---------- */
function render() {
  $('#topDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === ui.tab));
  $('#app').innerHTML = { dash: rDash, meals: rMeals, work: rWork, coach: rCoach, hub: rHub }[ui.tab]();
  rModal();
  if (ui.tab === 'coach') window.scrollTo(0, document.body.scrollHeight);
}

/* ---------- plan parsing ---------- */
const guessMuscle = n => /chest|pec|fly|bench/i.test(n) ? 'Chest' : /row|pulldown|lat|back|pull/i.test(n) ? 'Back' : /shoulder|lateral|delt|overhead|reverse/i.test(n) ? 'Shoulders' : /leg ext|quad|squat|leg press|hack/i.test(n) ? 'Quads' : /ham|leg curl|rdl|deadlift/i.test(n) ? 'Hamstrings' : /curl|bicep|tricep|dip|pushdown|arm/i.test(n) ? 'Arms' : 'Other';
function fallbackWorkout(text) {
  const days = []; let cur = null;
  const exRe = /^[\s\-\*\d\.\)•]*([A-Za-z][A-Za-z0-9 \/\-\(\)']{2,60}?)\s*[:\-–—]?\s*(\d)\s*(?:x|×|sets? of|sets? x)\s*(\d+)(?:\s*[-–]\s*(\d+))?/i;
  for (const raw of text.split('\n')) {
    const l = raw.replace(/[*#|]/g, '').trim(); if (!l) continue;
    const ex = l.match(exRe);
    if (ex && cur) { const a = +ex[3], b = +(ex[4] || ex[3]); cur.exercises.push({ name: ex[1].trim(), muscle: guessMuscle(ex[1]), sets: +ex[2], repMin: Math.min(a, b), repMax: Math.max(a, b) }); continue; }
    const hd = l.match(/^(?:day\s*\d+|mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*[:\-–—(]?\s*(.*)$/i);
    if (hd) { const nm = (hd[1] || l).replace(/[()]/g, '').trim() || l; cur = { name: nm.slice(0, 30), exercises: [] }; if (/rest/i.test(nm)) cur.name = 'Rest'; days.push(cur); }
  }
  return { days };
}
function fallbackDiet(text) {
  const g = re => { const m = text.match(re); return m ? +m[1] : null; };
  const targets = { cal: g(/(\d{3,4})\s*(?:k?cal)/i), p: g(/(\d{2,3})\s*g?\s*protein|protein[^0-9\n]{0,15}(\d{2,3})/i) || (text.match(/protein[^0-9\n]{0,15}(\d{2,3})/i) || [])[1], c: g(/(\d{2,3})\s*g?\s*carb/i), f: g(/(\d{2,3})\s*g?\s*fat/i) };
  const meals = [];
  text.split('\n').forEach(l => { const m = l.match(/meal\s*(\d)\s*[:\-–)]*\s*(.*)/i); if (m) { const k = l.match(/(\d{2,4})\s*k?cal/i), p = l.match(/(\d{1,3})\s*g\s*(?:of\s*)?protein/i); meals[+m[1] - 1] = { name: 'Meal ' + m[1], items: [{ name: m[2].replace(/[*]/g, '').slice(0, 80) || 'Meal ' + m[1], serving: '1 serving', cal: k ? +k[1] : 0, p: p ? +p[1] : 0, c: 0, f: 0 }] }; } });
  return { targets, meals };
}
async function importDiet(text) {
  let data;
  try { data = (st.settings.key || st.settings.proxy) ? parseJ(await gemini(`Convert this diet plan into JSON: {"targets":{"cal":n,"p":n,"c":n,"f":n},"meals":[{"name":"Meal 1","items":[{"name":"","serving":"","cal":n,"p":n,"c":n,"f":n}]}]} with exactly up to 5 meals. Estimate missing macros. Remove any tofu, seafood or broccoli items. Plan:\n${text}`, { json: true })) : fallbackDiet(text); }
  catch (e) { toast('AI parse failed, using basic parser'); data = fallbackDiet(text); }
  const t = data.targets || {};
  if (t.cal) st.settings.target.cal = r0(t.cal); if (t.p) st.settings.target.p = r0(t.p); if (t.c) st.settings.target.c = r0(t.c); if (t.f) st.settings.target.f = r0(t.f);
  let n = 0;
  (data.meals || []).slice(0, 5).forEach((m, i) => { if (!m) return; st.presets[i] = cleanFoods(m.items || []).map(f => ({ ...f, qty: 1 })); if (m.name) st.mealNames[i] = String(m.name).slice(0, 24); n++; });
  save(); toast(`Imported targets + ${n} meal presets`); render();
}
async function importWork(text) {
  let data;
  try { data = (st.settings.key || st.settings.proxy) ? parseJ(await gemini(`Convert this workout routine into JSON: {"days":[{"day":"Mon","name":"Push","exercises":[{"name":"","muscle":"Chest|Back|Shoulders|Quads|Hamstrings|Arms|Other","sets":n,"repMin":n,"repMax":n}]}]}. Use "Rest" as name with empty exercises for rest days. Routine:\n${text}`, { json: true })) : fallbackWorkout(text); }
  catch (e) { toast('AI parse failed, using basic parser'); data = fallbackWorkout(text); }
  const days = data.days || data; if (!Array.isArray(days) || !days.length) return toast('Could not find a workout in that text');
  const split = Array.from({ length: 7 }, () => ({ name: 'Rest', exercises: [] }));
  const named = days.every(d => d.day && DAYS.includes(String(d.day).slice(0, 3).replace(/^./, c => c.toUpperCase())));
  days.slice(0, 7).forEach((d, i) => {
    const idx = named ? DAYS.indexOf(String(d.day).slice(0, 3).replace(/^./, c => c.toUpperCase())) : i;
    split[idx] = { name: String(d.name || 'Day').slice(0, 30), exercises: (d.exercises || []).map(e => ({ id: uid(), name: String(e.name), muscle: MUSCLES.includes(e.muscle) ? e.muscle : (/biceps|triceps/i.test(e.muscle) ? 'Arms' : guessMuscle(e.name)), sets: +e.sets || 3, repMin: +e.repMin || 8, repMax: +e.repMax || +e.repMin || 12 })) };
  });
  st.split = split; save(); ui.wDay = weekdayIdx(today()); toast('Workout split imported'); render();
}

/* ---------- actions ---------- */
async function ask(prompt, quick) {
  st.chat.push({ r: 'user', t: quick || prompt }); st.chat = st.chat.slice(-30); ui.busy = true; render(); save();
  try {
    const contents = st.chat.map(m => ({ role: m.r === 'user' ? 'user' : 'model', parts: [{ text: m.t }] }));
    contents[contents.length - 1].parts[0].text = prompt;
    const t = await gemini(contents, { system: SYS + '\n\nUSER DATA:\n' + context() });
    st.chat.push({ r: 'model', t });
  } catch (e) { st.chat.push({ r: 'model', t: '⚠️ ' + e.message }); }
  ui.busy = false; save(); render();
}
const num = id => { const v = parseFloat($(id)?.value); return isNaN(v) ? 0 : v; };
const addFood = (meal, f) => D().meals[meal].push({ id: uid(), name: f.name, serving: f.serving, cal: f.cal, p: f.p, c: f.c, f: f.f, qty: f.qty ?? 1 });
const exById = id => st.split.flatMap(d => d.exercises).find(e => e.id === id);
const star = f => { const i = st.staples.findIndex(s => s.name.toLowerCase() === f.name.toLowerCase()); if (i >= 0) { st.staples.splice(i, 1); toast('Removed from vault'); } else { st.staples.push({ id: uid(), name: f.name, serving: f.serving, cal: f.cal, p: f.p, c: f.c, f: f.f }); toast('⭐ Saved to vault'); } };
const curRes = () => ui.modal.tab === 'staples' ? st.staples : ui.modal.results;

const A = {
  tab: v => { ui.tab = v; ui.modal = null; render(); window.scrollTo(0, 0); },
  day: v => { ui.date = addDays(ui.date, +v); render(); },
  logW: () => { const w = num('#wIn'); if (w < 30 || w > 250) return toast('Enter a valid weight'); st.weights[ui.date] = w; save(); toast('Weight logged'); render(); },
  logScan: () => { const bf = num('#bfIn'), smm = num('#smIn'); if (!bf || !smm) return toast('Enter both values'); st.scans.push({ date: ui.date, bf, smm }); save(); render(); },
  supp: v => { D().supps[v] = !D().supps[v]; save(); render(); },
  addSteps: v => { D().steps += +v; save(); render(); },
  gh: () => { const d = D(); d.steps = Math.max(d.steps, 8000 + r0(Math.random() * 6000)); save(); toast('Simulated sync: steps updated'); render(); },
  ghInfo: () => { ui.modal = { type: 'info', title: 'Google Health sync', html: '<p class="sm">Google does not offer a public browser API for Health Connect / Fit data. Options: (1) enter steps manually or use the simulated sync; (2) export steps from Google Fit/Health via Takeout; (3) wire a small bridge (e.g. a Tasker/Shortcuts automation or a Health Connect companion app) that writes <code>steps</code> into this app\'s JSON backup. The hook is <code>A.gh()</code> in app.js.</p>' }; render(); },
  logTread: () => { const min = num('#trMin'), sp = num('#trSp'), inc = num('#trIn'); if (!min) return; const m = sp * 1000 / 60, vo2 = 0.1 * m + 1.8 * m * inc / 100 + 3.5; D().tread.push({ min, sp, inc, kcal: r0(vo2 * curKg() / 1000 * 5 * min) }); save(); render(); },
  delTread: v => { D().tread.splice(+v, 1); save(); render(); },
  logCricket: () => { const min = num('#crMin'), met = num('#crInt'); if (!min) return; D().cricket.push({ min, kcal: r0(met * 3.5 * curKg() / 200 * min) }); save(); render(); },
  delCricket: v => { D().cricket.splice(+v, 1); save(); render(); },
  water: v => { const d = D(); d.water = Math.max(0, d.water + +v); save(); render(); },

  openFood: (v, el) => { ui.modal = { type: 'food', meal: +el.dataset.m, tab: 'staples', results: [], q: '' }; render(); },
  close: () => { ui.modal = null; render(); },
  ftab: v => { ui.modal.tab = v; ui.modal.results = []; render(); },
  addStaple: v => { addFood(ui.modal.meal, st.staples[+v]); save(); toast('Added'); render(); },
  delStaple: v => { st.staples.splice(+v, 1); save(); render(); },
  addRes: v => {
    const f = { ...curRes()[+v] }, g = parseFloat($('#g' + v)?.value);
    if (f.per100 && g > 0) { const k = g / 100; Object.assign(f, { cal: r0(f.cal * k), p: r1(f.p * k), c: r1(f.c * k), f: r1(f.f * k), serving: `${g} g` }); }
    addFood(ui.modal.meal, f); save(); toast('Added'); buzz(); rModal(); render();
  },
  addAll: () => { ui.modal.results.forEach(f => addFood(ui.modal.meal, f)); save(); ui.modal = null; toast('Added'); render(); },
  starRes: v => { star(curRes()[+v]); save(); rModal(); },
  starItem: (v, el) => { star(D().meals[+el.dataset.m][+el.dataset.j]); save(); render(); },
  delFood: (v, el) => { D().meals[+el.dataset.m].splice(+el.dataset.j, 1); save(); render(); },
  applyPreset: (v, el) => { st.presets[+el.dataset.m].forEach(f => addFood(+el.dataset.m, f)); save(); render(); },
  doSearch: async () => {
    const q = $('#fq').value.trim(); if (!q) return; const m = ui.modal; m.q = q; m.loading = true; m.results = []; rModal();
    try {
      let prods;
      try {
        const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=product_name,brands,nutriments`);
        prods = (await r.json()).products;
      } catch {
        // cgi endpoint is often blocked by CORS in browsers; the Open Food Facts search service allows it
        const r = await fetch(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=20&fields=product_name,brands,nutriments`);
        prods = (await r.json()).hits;
      }
      m.results = cleanFoods((prods || []).filter(p => p.product_name && p.nutriments?.['energy-kcal_100g'] != null).map(p => ({ name: p.product_name + (p.brands ? ` (${String(p.brands).split(',')[0]})` : ''), serving: '100 g', per100: true, cal: p.nutriments['energy-kcal_100g'], p: p.nutriments.proteins_100g, c: p.nutriments.carbohydrates_100g, f: p.nutriments.fat_100g })));
    } catch (e) { toast('Search failed: ' + e.message); }
    m.loading = false; rModal();
  },
  doAI: async () => {
    const q = $('#aiq').value.trim(); if (!q) return; const m = ui.modal; m.q = q; m.loading = true; m.results = []; rModal();
    try { m.results = cleanFoods(parseJ(await gemini(`Estimate macros for this food/meal. Return JSON array of items: [{"name":"","serving":"","cal":n,"p":n,"c":n,"f":n}]. One item per distinct food with the quantity eaten. Typical Indian home-cooked values.\nFood: ${q}`, { json: true }))); if (!m.results.length) toast('Nothing usable returned'); }
    catch (e) { toast(e.message); }
    m.loading = false; rModal();
  },

  wday: v => { ui.wDay = +v; render(); },
  addSet: v => { const e = exById(v), l = getLog(e, dateForWD(ui.wDay), true); l.sets.push({ w: l.sets.at(-1)?.w ?? '', r: '', rir: '', done: false }); save(); render(); },
  nextSet: v => {
    const e = exById(v), date = dateForWD(ui.wDay), l = getLog(e, date, true), i = l.sets.findIndex(s => !s.done); if (i < 0) return;
    const s = l.sets[i], ls = lastSession(e.id, date);
    if (!(+s.r > 0)) s.r = ls?.sets[i]?.r ?? ls?.sets[0]?.r ?? e.repMin;
    if (s.w === '' && ls) s.w = ls.sets[i]?.w ?? ls.sets[0]?.w ?? '';
    s.done = true; l.name = e.name; l.muscle = e.muscle; buzz(); startTimer(st.settings.rest); save(); render();
  },
  copyLast: v => {
    const e = exById(v), date = dateForWD(ui.wDay), ls = lastSession(e.id, date); if (!ls) return toast('No previous session to copy');
    const l = getLog(e, date, true);
    l.sets.forEach((s, i) => { const p = ls.sets[i] || ls.sets.at(-1); s.w = p.w; s.r = p.r; s.rir = p.rir ?? ''; s.done = false; });
    save(); toast('Copied last session. Tap ✓ to log each set'); render();
  },
  timerAdd: () => { if (ui.timer) { ui.timer.end += 30000; drawTimer(); } },
  timerStop: () => { ui.timer = null; drawTimer(); },
  hist: v => { ui.modal = { type: 'hist', ex: exById(v) }; render(); },
  copyYMeal: (v, el) => {
    const i = +el.dataset.m, src = (st.days[addDays(ui.date, -1)]?.meals || [])[i] || [];
    if (!src.length) return toast('Nothing logged in this meal yesterday');
    src.forEach(f => addFood(i, f)); save(); toast('Copied'); render();
  },
  copyYDay: () => {
    const src = st.days[addDays(ui.date, -1)]?.meals; if (!src || !src.some(m => m.length)) return toast('Nothing logged on the previous day');
    src.forEach((m, i) => m.forEach(f => addFood(i, f))); save(); toast('Copied'); render();
  },
  savePreset: (v, el) => { const i = +el.dataset.m; st.presets[i] = D().meals[i].map(f => ({ ...f })); save(); toast(`Saved ${st.mealNames[i]} as preset`); render(); },
  applyCal: v => { st.settings.target.cal = +v; save(); toast('Calorie target updated'); render(); },
  addEx: () => { ui.modal = { type: 'ex', isNew: true, ex: { id: uid(), name: '', muscle: 'Chest', sets: 3, repMin: 8, repMax: 12 } }; render(); },
  editEx: v => { ui.modal = { type: 'ex', ex: { ...exById(v) } }; render(); },
  saveEx: () => {
    const e = ui.modal.ex; e.name = $('#exN').value.trim(); e.muscle = $('#exM').value; e.sets = num('#exS') || 3; e.repMin = num('#exA') || 8; e.repMax = Math.max(e.repMin, num('#exB') || 12);
    if (!e.name) return toast('Name required');
    const arr = st.split[ui.wDay].exercises;
    if (ui.modal.isNew) arr.push(e); else Object.assign(arr.find(x => x.id === e.id), e);
    save(); ui.modal = null; render();
  },
  delEx: () => { const a = st.split[ui.wDay].exercises; a.splice(a.findIndex(x => x.id === ui.modal.ex.id), 1); save(); ui.modal = null; render(); },
  swap: async v => {
    const e = exById(v), day = st.split[ui.wDay]; ui.modal = { type: 'swap', ex: e, loading: true }; render();
    try {
      const others = day.exercises.filter(x => x.id !== e.id).map(x => x.name).join(', ');
      const r = parseJ(await gemini(`Suggest ONE alternative low-stability MACHINE (no free weights/cables-with-stabilization demands) targeting the same muscle group as "${e.name}" (${e.muscle}). Not already in today's session: ${others}. JSON: {"name":"","muscle":"${e.muscle}","reason":"one sentence"}`, { json: true }));
      if (EXCL.test(r.name)) throw new Error('Unusable suggestion, try again');
      ui.modal.res = r;
    } catch (err) { ui.modal.err = err.message; }
    ui.modal.loading = false; rModal();
  },
  applySwap: () => { const m = ui.modal, e = exById(m.ex.id); e.id = uid(); e.name = m.res.name; if (MUSCLES.includes(m.res.muscle)) e.muscle = m.res.muscle; save(); ui.modal = null; toast('Swapped. Progress resets for the new machine'); render(); },

  qa: v => {
    if (v === 'log') { ui.modal = { type: 'food', meal: 0, tab: 'ai', results: [], q: '' }; return render(); }
    const p = {
      next: 'Based on my remaining macros today, suggest 2-3 specific Indian meal/snack options (with portions and macros) that fit what is left, prioritising protein. Avoid tofu, seafood, broccoli.',
      swap: "For each exercise in today's workout, suggest one low-stability machine alternative targeting the same muscle group, with a one-line reason.",
      audit: 'Do a weekly audit: 1) weight trend using the 7-day average vs my 76-77 kg goal and whether the rate is appropriate; 2) weekly sets per muscle vs the 20-set target; 3) progressive overload status and what to push next; 4) 3 concrete actions for next week.'
    }[v];
    ui.tab = 'coach'; ask(p, { next: 'What should I eat next to hit my macros?', swap: 'Suggest low-stability machine swaps', audit: 'Weekly weight & overload audit' }[v]);
  },
  send: () => { const t = $('#chatIn').value.trim(); if (t && !ui.busy) ask(t); },
  clearChat: () => { st.chat = []; save(); render(); },

  saveSet: () => {
    const s = st.settings; s.key = $('#keyIn').value.trim(); s.proxy = $('#proxyIn').value.trim(); s.model = $('#modelIn').value.trim() || 'gemini-2.5-flash';
    s.target = { cal: num('#tCal'), p: num('#tP'), c: num('#tC'), f: num('#tF') };
    Object.assign(s, { startKg: num('#sKg'), goalLo: num('#sLo'), goalHi: num('#sHi'), water: num('#sW'), stepMin: num('#sSm'), stepMax: num('#sSx'), rest: num('#sRest') || 90, theme: $('#sTheme').value, haptics: $('#sHap').checked, gistToken: $('#gTok').value.trim(), gistId: $('#gId').value.trim(), autoSync: $('#gAuto').checked });
    applyTheme(); save(); toast('Saved'); render();
  },
  gistPush: async (v, el, silent) => {
    const s = st.settings; if (!s.gistToken) return silent || toast('Add a GitHub token first (Hub → Cloud sync)');
    const files = { 'fitcore.json': { content: JSON.stringify(stripSecrets(st)) } };
    try {
      const r = await fetch(s.gistId ? `https://api.github.com/gists/${s.gistId}` : 'https://api.github.com/gists', {
        method: s.gistId ? 'PATCH' : 'POST', headers: { Authorization: 'Bearer ' + s.gistToken, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify(s.gistId ? { files } : { description: 'FitCore backup', public: false, files })
      });
      const j = await r.json(); if (!r.ok) throw new Error(j.message || r.status);
      s.gistId = j.id; s.lastSync = new Date().toLocaleString(); s.lastBackup = today(); save(); silent || toast('☁️ Pushed'); if (!silent && ui.tab === 'hub') render();
    } catch (e) { toast('Sync failed: ' + e.message); }
  },
  gistPull: async () => {
    const s = st.settings; s.gistToken = $('#gTok')?.value.trim() || s.gistToken; s.gistId = $('#gId')?.value.trim() || s.gistId;
    if (!s.gistToken || !s.gistId) return toast('Need both token and Gist ID');
    if (!confirm('Replace local data with the cloud copy?')) return;
    try {
      const r = await fetch(`https://api.github.com/gists/${s.gistId}`, { headers: { Authorization: 'Bearer ' + s.gistToken, Accept: 'application/vnd.github+json' } });
      const j = await r.json(); if (!r.ok) throw new Error(j.message || r.status);
      const f = j.files['fitcore.json']; if (!f) throw new Error('fitcore.json not found in gist');
      const text = f.truncated ? await (await fetch(f.raw_url, { headers: { Authorization: 'Bearer ' + s.gistToken } })).text() : f.content;
      const keep = { key: s.key, gistToken: s.gistToken, gistId: s.gistId }, remote = JSON.parse(text);
      st = normalize(remote); Object.assign(st.settings, keep, { lastSync: new Date().toLocaleString() });
      save(); applyTheme(); toast('☁️ Pulled'); render();
    } catch (e) { toast('Pull failed: ' + e.message); }
  },
  copyP: async v => { try { await navigator.clipboard.writeText(v === 'diet' ? PROMPT_DIET : PROMPT_WORK); toast('Prompt copied. Paste it into Gemini'); } catch { ui.modal = { type: 'info', title: 'Copy prompt', html: `<textarea readonly>${esc(v === 'diet' ? PROMPT_DIET : PROMPT_WORK)}</textarea>` }; render(); } },
  impDiet: async () => { const t = $('#dietTx').value.trim(); if (t) { toast('Importing…'); await importDiet(t); } },
  impWork: async () => { const t = $('#workTx').value.trim(); if (t) { toast('Importing…'); await importWork(t); } },
  exp: () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(stripSecrets(st), null, 1)], { type: 'application/json' })); a.download = `fitcore-${today()}.json`; a.click(); st.settings.lastBackup = today(); save(); toast('Backup downloaded (API keys excluded)'); if (ui.tab === 'dash') render(); },
  copyExp: async () => { try { await navigator.clipboard.writeText(JSON.stringify(stripSecrets(st))); toast('Copied'); } catch { toast('Clipboard blocked, use Export'); } },
  impFile: () => $('#file').click(),
  impJson: () => doImport($('#jsonTx').value),
  reset: async () => { if (confirm('Erase ALL data?')) { localStorage.removeItem('fitcore'); st = defaultState(); if (idb.db) await idb.set('state', JSON.parse(JSON.stringify(st))); applyTheme(); render(); } }
};
function doImport(txt) {
  try {
    const j = JSON.parse(txt); if (!j.settings || !j.split) throw 0;
    const keep = { key: st.settings.key, gistToken: st.settings.gistToken, gistId: st.settings.gistId };
    st = normalize(j); Object.assign(st.settings, { key: j.settings.key || keep.key, gistToken: j.settings.gistToken || keep.gistToken, gistId: j.settings.gistId || keep.gistId });
    save(); applyTheme(); toast('Imported'); render();
  } catch { toast('Invalid backup JSON'); }
}

/* ---------- events ---------- */
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (el && A[el.dataset.a]) A[el.dataset.a](el.dataset.v, el); });
document.addEventListener('change', e => {
  const el = e.target, c = el.dataset.c;
  if (el.id === 'file') { const f = el.files[0]; if (f) f.text().then(doImport); return; }
  if (el.id === 'mealSel') { ui.modal.meal = +el.value; return; }
  if (!c) return;
  if (c === 'steps') { D().steps = +el.value || 0; save(); render(); }
  else if (c === 'qty') { D().meals[+el.dataset.m][+el.dataset.j].qty = Math.max(0, +el.value || 0); save(); render(); }
  else if (c === 'dayname') { st.split[ui.wDay].name = el.value.trim() || 'Day'; save(); render(); }
  else if (c === 'set') {
    const ex = exById(el.dataset.e), date = dateForWD(ui.wDay), l = getLog(ex, date, true), s = l.sets[+el.dataset.i], f = el.dataset.f;
    const wasDone = s.done;
    s[f] = f === 'done' ? el.checked : el.value; l.name = ex.name; l.muscle = ex.muscle;
    if (f === 'r' && el.value && !s.done) s.done = true;
    if (s.done && !wasDone) { buzz(); startTimer(st.settings.rest); }
    save(); render();
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'chatIn') A.send(); if (e.key === 'Enter' && e.target.id === 'fq') A.doSearch(); });

/* swipe-left on a food row to delete */
let sw = null;
document.addEventListener('touchstart', e => {
  const row = e.target.closest('.food[data-sw]'); if (!row || e.target.closest('input,button')) { sw = null; return; }
  sw = { row, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0 };
}, { passive: true });
document.addEventListener('touchmove', e => {
  if (!sw) return; const dx = e.touches[0].clientX - sw.x, dy = e.touches[0].clientY - sw.y;
  if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 10) return;
  sw.dx = Math.min(0, dx); sw.row.style.transform = `translateX(${sw.dx}px)`; sw.row.style.transition = 'none';
}, { passive: true });
document.addEventListener('touchend', () => {
  if (!sw) return; const { row, dx } = sw; sw = null;
  if (dx < -110) { const [m, j] = row.dataset.sw.split(',').map(Number); D().meals[m].splice(j, 1); buzz(20); save(); toast('Removed'); render(); }
  else { row.style.transition = 'transform .2s'; row.style.transform = ''; }
});

matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', applyTheme);
(async () => {
  await loadState(); applyTheme();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
  render();
})();
