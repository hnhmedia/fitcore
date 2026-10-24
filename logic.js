/* Pure logic shared by the app and the node tests (no DOM access). */
(function (root) {
  'use strict';
  const iso = d => { const t = new Date(d); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); return t.toISOString().slice(0, 10); };
  const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  const weekdayIdx = s => (new Date(s + 'T12:00:00').getDay() + 6) % 7;
  const weekStart = s => addDays(s, -weekdayIdx(s));
  const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings', 'Arms'];
  const r1 = n => Math.round((+n || 0) * 10) / 10;
  const e1rm = (w, r) => (+w || 0) * (1 + (+r || 0) / 30);

  const doneSets = e => (e.sets || []).filter(s => s.done && +s.r > 0);

  function sessions(logs, exId, before) {
    return Object.keys(logs).filter(d => d < before && logs[d][exId] && doneSets(logs[d][exId]).length).sort()
      .map(d => ({ d, sets: doneSets(logs[d][exId]) }));
  }
  function lastSession(logs, exId, before) { const s = sessions(logs, exId, before); return s.length ? s[s.length - 1] : null; }

  function overload(logs, ex, date) {
    const ls = lastSession(logs, ex.id, date);
    if (!ls) return { cls: 'new', badge: 'First session: set a baseline', last: '' };
    const w = Math.max(...ls.sets.map(s => +s.w || 0));
    const top = ls.sets.filter(s => (+s.w || 0) === w);
    const last = `Last (${ls.d.slice(5)}): ` + ls.sets.map(s => `${s.w || 0}×${s.r}${s.rir !== '' && s.rir != null ? ' @' + s.rir : ''}`).join(', ');
    if (ls.sets.length >= ex.sets && ls.sets.every(s => +s.r >= ex.repMax)) return { cls: 'up', badge: `Increase Weight +2.5kg → ${r1(w + 2.5)}kg`, last };
    const minR = Math.min(...top.map(s => +s.r));
    const easy = ls.sets.every(s => s.rir !== '' && s.rir != null && +s.rir >= 3);
    if (easy) return { cls: 'rep', badge: `+2 Rep Target (felt easy): ${w}kg × ${Math.min(ex.repMax, minR + 2)}`, last };
    return { cls: 'rep', badge: `+1 Rep Target: ${w}kg × ${minR + 1}`, last };
  }

  function history(logs, exId, before = '9999-12-31') {
    return sessions(logs, exId, before).map(s => ({ d: s.d, e1rm: Math.max(...s.sets.map(x => e1rm(x.w, x.r))), top: Math.max(...s.sets.map(x => +x.w || 0)) }));
  }
  // Stalled = none of the last 3 sessions beat the session before them.
  function plateau(logs, exId, date) {
    const h = history(logs, exId, date);
    if (h.length < 4) return false;
    const ref = h[h.length - 4].e1rm;
    return h.slice(-3).every(x => x.e1rm <= ref + 0.01);
  }

  function weeklyVolume(logs, date) {
    const ws = weekStart(date), v = Object.fromEntries(MUSCLES.map(m => [m, 0]));
    for (let i = 0; i < 7; i++) {
      const l = logs[addDays(ws, i)]; if (!l) continue;
      Object.values(l).forEach(e => (e.sets || []).forEach(s => { if (s.done && v[e.muscle] !== undefined) v[e.muscle]++; }));
    }
    return v;
  }

  function weightSeries(weights) {
    const ks = Object.keys(weights).sort();
    return ks.map(d => {
      const win = ks.filter(k => k <= d && k >= addDays(d, -6)).map(k => weights[k]);
      return { d, w: weights[d], ma: win.reduce((a, b) => a + b, 0) / win.length };
    });
  }

  function trend(weights, goalHi) {
    const s = weightSeries(weights); if (s.length < 2) return null;
    const last = s[s.length - 1];
    const ref = s.find(p => p.d >= addDays(last.d, -14));
    const days = (Date.parse(last.d) - Date.parse(ref.d)) / 864e5;
    if (days < 4) return null;
    const rate = (last.ma - ref.ma) / days * 7;
    const pct = rate / last.ma * 100;
    const proj = rate < -0.05 && last.ma > goalHi ? addDays(last.d, Math.ceil((last.ma - goalHi) / -rate * 7)) : null;
    const status = pct <= -1 ? 'fast' : rate > -0.1 ? 'stalled' : 'ok';
    return { rate: r1(rate), pct: r1(pct), proj, status, ma: last.ma };
  }

  function dayTotals(day) {
    const t = { cal: 0, p: 0, c: 0, f: 0 };
    ((day && day.meals) || []).forEach(m => m.forEach(i => { for (const k of ['cal', 'p', 'c', 'f']) t[k] += (i[k] || 0) * (i.qty == null ? 1 : i.qty); }));
    return t;
  }

  function adaptive(weights, days, target, todayStr) {
    const t = trend(weights, 0); if (!t) return null;
    const logged = [];
    for (let i = 0; i < 14; i++) { const c = dayTotals(days[addDays(todayStr, -i)]).cal; if (c > 200) logged.push(c); }
    if (logged.length < 7) return null;
    const avg = logged.reduce((a, b) => a + b, 0) / logged.length;
    let delta = 0, msg = 'On track, keep calories as they are.';
    if (t.rate > -0.15) { delta = -150; msg = 'Weight loss has stalled. Trim ~150 kcal.'; }
    else if (t.pct <= -1) { delta = 150; msg = 'Losing too fast, which risks muscle. Add ~150 kcal.'; }
    return { avg: Math.round(avg), rate: t.rate, tdee: Math.round(avg - t.rate * 1100), delta, suggested: target + delta, msg };
  }

  function streak(days, pTarget, todayStr, ratio = 0.9) {
    const hit = d => dayTotals(days[d]).p >= pTarget * ratio;
    let d = hit(todayStr) ? todayStr : addDays(todayStr, -1), n = 0;
    while (n < 365 && hit(d)) { n++; d = addDays(d, -1); }
    return n;
  }

  const api = { iso, addDays, weekdayIdx, weekStart, MUSCLES, r1, e1rm, sessions, lastSession, overload, history, plateau, weeklyVolume, weightSeries, trend, dayTotals, adaptive, streak };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FC = api;
})(typeof self !== 'undefined' ? self : this);
