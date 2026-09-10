#!/usr/bin/env node
// Self-check for widget.js. Loads the pure-JS portion of widget.js (the
// SCHEDULE + helper functions) and asserts nextDepartures() picks the
// right rows at known frozen times.
//
// Run:  node test.js

const fs = require('fs');
const assert = require('assert');
const path = require('path');

const WIDGET = fs.readFileSync(path.join(__dirname, 'widget.js'), 'utf8');
// Anchored on the first line of the entry section rather than the comment
// above it, so rewording that comment can't silently break the harness.
const MARKER = 'if (config.runsInApp';
const idx = WIDGET.indexOf(MARKER);
assert(idx > 0, 'MARKER not found in widget.js');

// Stub the Scriptable globals used at file-level (Color for palette
// constants). Everything else (Font, ListWidget, etc.) is only referenced
// inside function bodies we never call from tests.
const STUBS = `
class Color { constructor(){} }
class Font  { static systemFont(){} static semiboldSystemFont(){} static mediumSystemFont(){} static boldSystemFont(){} }
class Size  { constructor(){} }

// Fake Scriptable filesystem for the renameSelf() checks. The test sets
// globalThis.__FS = { name, iCloud: {path: contents} | null, local: {...} };
// a null iCloud store simulates iCloud Drive being turned off.
class FileManager {
  constructor(store) { this.store = store; }
  static iCloud() { if (!__FS.iCloud) throw new Error('iCloud Drive is not enabled'); return new FileManager(__FS.iCloud); }
  static local()  { return new FileManager(__FS.local); }
  documentsDirectory() { return '/docs'; }
  joinPath(a, b)    { return a + '/' + b; }
  fileExists(p)     { return Object.prototype.hasOwnProperty.call(this.store, p); }
  readString(p)     { return this.store[p]; }
  writeString(p, v) { this.store[p] = v; }
  remove(p)         { delete this.store[p]; }
}
const Script = { name: () => __FS.name };
`;

const pure = STUBS + WIDGET.slice(0, idx) + '\nreturn { SCHEDULE, nextDepartures, fmtTime, fmtDelta, nextRefreshMinutes, renameSelf, REFRESH_MIN_MIN, REFRESH_MAX_MIN };\n';
const { SCHEDULE, nextDepartures, fmtTime, fmtDelta, nextRefreshMinutes, renameSelf, REFRESH_MIN_MIN, REFRESH_MAX_MIN } = new Function(pure)();

// Helper: build a Date whose (day-of-week, hh, mm) is exactly what the
// widget will read. The absolute date doesn't matter — nextDepartures
// only looks at getDay/getHours/getMinutes.
function fakeNow(dayOfWeek, hh, mm) {
  // Sun=0, Mon=1, ..., Sat=6. Jan 4 2026 is a Sunday.
  const base = new Date(2026, 0, 4); // Sunday
  base.setDate(base.getDate() + dayOfWeek);
  base.setHours(hh, mm, 0, 0);
  return base;
}

let passed = 0, failed = 0;
function check(label, fn) {
  try { fn(); console.log(`  ok  ${label}`); passed++; }
  catch (e) { console.log(`  FAIL ${label}\n       ${e.message}`); failed++; }
}

// Pin locale to en-US for deterministic assertions.
const T = (m) => fmtTime(m, 'en-US');

console.log('nextDepartures — Monday 7:00a, BMC side');
check('first departure is 7:35 AM', () => {
  const [first] = nextDepartures(SCHEDULE, 'leavesBMC', fakeNow(1, 7, 0), 3);
  assert.strictEqual(T(first.minOfDay), '7:35a');
  assert.strictEqual(first.deltaMin, 35);
});

console.log('nextDepartures — Monday 11:35a, HC side');
check('next HC is 11:50 AM in 15m', () => {
  const [first] = nextDepartures(SCHEDULE, 'leavesHC', fakeNow(1, 11, 35), 3);
  assert.strictEqual(T(first.minOfDay), '11:50a');
  assert.strictEqual(first.deltaMin, 15);
});

console.log('nextDepartures — Friday 11:50pm, BMC side wraps into Sat AM entries');
check('next is fri 12:25 AM from Fri table', () => {
  const [first] = nextDepartures(SCHEDULE, 'leavesBMC', fakeNow(5, 23, 50), 3);
  assert.strictEqual(T(first.minOfDay), '12:25a');
  assert.strictEqual(first.deltaMin, 35);
});

console.log('nextDepartures — Sunday 12:30am (deep into Sat late-night)');
check('12:30 AM is leaving now; 1:00 AM is next', () => {
  const list = nextDepartures(SCHEDULE, 'leavesBMC', fakeNow(0, 0, 30), 3);
  assert.strictEqual(T(list[0].minOfDay), '12:30a');
  assert.strictEqual(list[0].deltaMin, 0);
  assert.strictEqual(T(list[1].minOfDay), '1:00a');
  assert.strictEqual(list[1].deltaMin, 30);
});

console.log('nextDepartures — Sunday 8:00am (before Sunday service starts)');
check('first BMC is Sun 9:30 AM in 90m', () => {
  const [first] = nextDepartures(SCHEDULE, 'leavesBMC', fakeNow(0, 8, 0), 3);
  assert.strictEqual(T(first.minOfDay), '9:30a');
  assert.strictEqual(first.deltaMin, 90);
});

console.log('nextDepartures — Sunday 11:30pm (last of week; wraps to Mon 7:35a)');
check('wraps to Mon 7:35 AM', () => {
  const list = nextDepartures(SCHEDULE, 'leavesBMC', fakeNow(0, 23, 30), 3);
  assert.strictEqual(T(list[0].minOfDay), '12:00a');
  assert.strictEqual(list[0].deltaMin, 30);
  const nextIsMon = list.slice(1).some(x => T(x.minOfDay) === '7:35a');
  assert(nextIsMon, 'expected 7:35 AM somewhere in the next-3');
});

console.log('fmtTime edge cases');
check('12:00 AM and 12:00 PM', () => {
  assert.strictEqual(T(0), '12:00a');
  assert.strictEqual(T(720), '12:00p');
  assert.strictEqual(T(1440), '12:00a'); // wraps
});

console.log('fmtTime 24h locale');
check('en-GB gives 24h format (no AM/PM)', () => {
  const morning = fmtTime(455,  'en-GB');
  const evening = fmtTime(1055, 'en-GB');
  assert.match(morning, /^0?7:35$/);
  assert.match(evening, /^17:35$/);
  assert(!/AM|PM/i.test(morning + evening), '24h locale should not include AM/PM');
});

console.log('departure Date fed to addDate()');
check('at is deltaMin from the top of the current minute', () => {
  const now = fakeNow(1, 7, 0);
  now.setSeconds(42);  // seconds must not leak into the countdown
  const [first] = nextDepartures(SCHEDULE, 'leavesBMC', now, 1);
  assert.strictEqual(first.deltaMin, 35);
  assert.strictEqual(first.at.getTime(), fakeNow(1, 7, 35).getTime());
});

console.log('fmtDelta (the LIVE_COUNTDOWN = false fallback)');
check('formats minutes, hours, hours+minutes', () => {
  assert.strictEqual(fmtDelta(4), '4m');
  assert.strictEqual(fmtDelta(60), '1h');
  assert.strictEqual(fmtDelta(65), '1h5m');
  assert.strictEqual(fmtDelta(125), '2h5m');
});

console.log('nextRefreshMinutes');
check('asks one minute after the next departure', () => {
  // Mon 7:00a: next BMC is 7:35 (35m), next HC is 7:50. Earliest is 35.
  assert.strictEqual(nextRefreshMinutes(fakeNow(1, 7, 0)), 36);
});
check('clamps up when a bus is about to leave', () => {
  // Mon 7:34a: departure is 1m away, +1 = 2, below the 3m floor.
  assert.strictEqual(nextRefreshMinutes(fakeNow(1, 7, 34)), REFRESH_MIN_MIN);
});
check('clamps down across an overnight gap', () => {
  // Sun 3:00a: nothing until 9:30a, so cap rather than sleep for hours.
  assert.strictEqual(nextRefreshMinutes(fakeNow(0, 3, 0)), REFRESH_MAX_MIN);
});

console.log('renameSelf — pasted script renames its own file');
check('iCloud: Untitled Script.js becomes Blue Bus.js', () => {
  globalThis.__FS = { name: 'Untitled Script', iCloud: { '/docs/Untitled Script.js': 'SRC' }, local: {} };
  assert.strictEqual(renameSelf(), true);
  assert.deepStrictEqual(__FS.iCloud, { '/docs/Blue Bus.js': 'SRC' });
});
check('iCloud Drive off falls back to the local folder', () => {
  globalThis.__FS = { name: 'Untitled Script 2', iCloud: null, local: { '/docs/Untitled Script 2.js': 'SRC' } };
  assert.strictEqual(renameSelf(), true);
  assert.deepStrictEqual(__FS.local, { '/docs/Blue Bus.js': 'SRC' });
});
check('re-paste over an existing install overwrites it', () => {
  globalThis.__FS = { name: 'Untitled Script', iCloud: { '/docs/Untitled Script.js': 'NEW', '/docs/Blue Bus.js': 'OLD' }, local: {} };
  assert.strictEqual(renameSelf(), true);
  assert.deepStrictEqual(__FS.iCloud, { '/docs/Blue Bus.js': 'NEW' });
});
check('already named Blue Bus is a no-op', () => {
  globalThis.__FS = { name: 'Blue Bus', iCloud: { '/docs/Blue Bus.js': 'SRC' }, local: {} };
  assert.strictEqual(renameSelf(), false);
  assert.deepStrictEqual(__FS.iCloud, { '/docs/Blue Bus.js': 'SRC' });
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
