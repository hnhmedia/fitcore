'use strict';
const test = require('node:test');
const assert = require('node:assert');
const L = require('../logic.js');

const ex = { id: 'e1', name: 'Chest Press', muscle: 'Chest', sets: 3, repMin: 8, repMax: 12 };
const sess = (reps, w = 60, rir = '') => ({ e1: { name: 'x', muscle: 'Chest', sets: reps.map(r => ({ w, r, done: true, rir })) } });

test('first session baseline', () => {
  assert.equal(L.overload({}, ex, '2026-10-24').cls, 'new');
});
test('+1 rep target when below rep max', () => {
  const o = L.overload({ '2026-10-20': sess([10, 9, 8]) }, ex, '2026-10-24');
  assert.equal(o.cls, 'rep'); assert.match(o.badge, /\+1 Rep Target: 60kg × 9/);
});
test('increase weight when all sets hit top of range', () => {
  const o = L.overload({ '2026-10-20': sess([12, 12, 12]) }, ex, '2026-10-24');
  assert.equal(o.cls, 'up'); assert.match(o.badge, /62\.5kg/);
});
test('not enough sets at top range -> no weight increase', () => {
  assert.equal(L.overload({ '2026-10-20': sess([12, 12]) }, ex, '2026-10-24').cls, 'rep');
});
test('easy RIR suggests +2 reps', () => {
  assert.match(L.overload({ '2026-10-20': sess([8, 8, 8], 60, 3) }, ex, '2026-10-24').badge, /\+2 Rep/);
});
test('weekly volume counts only done sets within the week', () => {
  const logs = {
    '2026-10-19': sess([10, 10, 10]),
    '2026-10-26': sess([10, 10, 10])
  };
  logs['2026-10-19'].e1.sets[2].done = false;
  assert.equal(L.weeklyVolume(logs, '2026-10-24').Chest, 2);
});
test('moving average uses 7-day window', () => {
  const w = {}; for (let i = 0; i < 10; i++) w[L.addDays('2026-10-01', i)] = 84 - i * 0.1;
  const s = L.weightSeries(w);
  assert.equal(s.length, 10);
  const expect = [0, 1, 2, 3, 4, 5, 6].map(i => 84 - (9 - i) * 0.1).reduce((a, b) => a + b) / 7;
  assert.ok(Math.abs(s[9].ma - expect) < 1e-9);
});
test('trend: rate, projection, and fast-loss warning', () => {
  const w = {}; for (let i = 0; i < 15; i++) w[L.addDays('2026-10-01', i)] = 84 - i * 0.2;
  const t = L.trend(w, 77);
  assert.ok(t.rate < -0.9 && t.rate > -1.4); assert.equal(t.status, 'fast'); assert.ok(t.proj > '2026-10-15');
  assert.equal(L.trend({ '2026-10-01': 84 }, 77), null);
});
test('trend: stalled', () => {
  const w = {}; for (let i = 0; i < 10; i++) w[L.addDays('2026-10-01', i)] = 84;
  assert.equal(L.trend(w, 77).status, 'stalled');
});
test('plateau detection needs 4 sessions with no progress in last 3', () => {
  const mk = repsList => Object.fromEntries(repsList.map((r, i) => [L.addDays('2026-10-01', i * 3), sess(r)]));
  assert.equal(L.plateau(mk([[10, 10, 10], [10, 10, 10], [10, 9, 9], [10, 10, 9]]), 'e1', '2026-11-01'), true);
  assert.equal(L.plateau(mk([[8, 8, 8], [9, 9, 9], [10, 10, 10], [11, 11, 11]]), 'e1', '2026-11-01'), false);
  assert.equal(L.plateau(mk([[10, 10, 10], [10, 10, 10], [10, 10, 10]]), 'e1', '2026-11-01'), false);
});
test('protein streak', () => {
  const day = p => ({ meals: [[{ cal: 500, p, c: 0, f: 0, qty: 1 }]] });
  const days = { '2026-10-24': day(10), '2026-10-23': day(150), '2026-10-22': day(150), '2026-10-21': day(20) };
  assert.equal(L.streak(days, 160, '2026-10-24'), 2);
  days['2026-10-24'] = day(160);
  assert.equal(L.streak(days, 160, '2026-10-24'), 3);
});
test('adaptive calories suggests trimming on stall, needs enough data', () => {
  const w = {}, days = {};
  for (let i = 0; i < 14; i++) { const d = L.addDays('2026-10-11', i); w[d] = 84; days[d] = { meals: [[{ cal: 1900, p: 150, c: 0, f: 0, qty: 1 }]] }; }
  const a = L.adaptive(w, days, 1900, '2026-10-24');
  assert.equal(a.delta, -150); assert.equal(a.suggested, 1750);
  assert.equal(L.adaptive(w, {}, 1900, '2026-10-24'), null);
});
test('day totals respect qty', () => {
  assert.equal(L.dayTotals({ meals: [[{ cal: 100, p: 10, c: 0, f: 0, qty: 2.5 }]] }).cal, 250);
});
