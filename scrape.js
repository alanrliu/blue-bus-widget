#!/usr/bin/env node
// Fetches the BMC Blue Bus page, parses the schedule tables, and prints a
// JS `SCHEDULE` constant ready to paste into widget.js.
//
// Usage:
//   node scrape.js                     # fetches live HTML from BMC
//   node scrape.js path/to/local.html  # parses a local copy
//
// Times are stored as minutes-of-day (0-1439). Post-midnight entries in a
// table wrap forward: a "12:30a" appearing after "11:45p" becomes 1470.

const URL = 'https://www.brynmawr.edu/inside/offices-services/transportation/blue-bus';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'saturday-night', 'sunday'];

// Which columns (0-indexed) carry "leaves BMC" and "leaves HC" per table shape.
// Weekday tables: [Leaves BMC, Arrives HC, Leaves HC, Arrives BMC]
// Sat Daytime:    [Leaves BMC, Leaves Suburban, Leaves HC South Lot, Leaves Stokes, Leaves Suburban]
// Sat Night:      [BMC to HC, HC to BMC, -, -]
// Sunday:         [BMC to HC, HC to BMC, -, -]
const COLS = {
  monday:          { bmc: 0, hc: 2 },
  tuesday:         { bmc: 0, hc: 2 },
  wednesday:       { bmc: 0, hc: 2 },
  thursday:        { bmc: 0, hc: 2 },
  friday:          { bmc: 0, hc: 2 },
  saturday:        { bmc: 0, hc: 3 }, // Stokes is the main HC pickup
  'saturday-night':{ bmc: 0, hc: 1 },
  sunday:          { bmc: 0, hc: 1 },
};

function parseTime(raw) {
  // raw like "7:35a", "12:10p", "9:30a & 9:40a", "10:15p&nbsp;"
  // returns array of minutes-of-day (may be empty if "--" or blank)
  const cleaned = raw.replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').trim();
  if (!cleaned || cleaned === '--') return [];
  const parts = cleaned.split('&').map(s => s.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    const m = p.match(/^(\d{1,2}):(\d{2})\s*([ap])$/i);
    if (!m) continue;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3].toLowerCase();
    if (ampm === 'a') { if (h === 12) h = 0; }
    else              { if (h !== 12) h += 12; }
    out.push(h * 60 + min);
  }
  return out;
}

// Wrap post-midnight times: if any minute is smaller than the previous kept
// minute, add 1440 to it and all subsequent entries in this table.
function wrapMidnight(times) {
  const out = [];
  let bump = 0;
  let prev = -1;
  for (const t of times) {
    let v = t + bump;
    if (prev >= 0 && v < prev) {
      bump += 1440;
      v = t + bump;
    }
    out.push(v);
    prev = v;
  }
  return out;
}

function extractTable(html, anchorId) {
  // Find the anchor, then take the first <table>...</table> after it.
  const anchor = new RegExp(`id="${anchorId}"`);
  const start = html.search(anchor);
  if (start < 0) throw new Error(`anchor #${anchorId} not found`);
  const rest = html.slice(start);
  const tableMatch = rest.match(/<table\b[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) throw new Error(`no <table> after #${anchorId}`);
  return tableMatch[1];
}

function parseRows(tableHtml) {
  // Return rows as arrays of cell HTML strings. Skips header rows (rows
  // containing <th>).
  const rows = [];
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = trRe.exec(tableHtml))) {
    const body = m[1];
    if (/<th\b/.test(body)) continue;
    const cells = [];
    const tdRe = /<td\b[^>]*>([\s\S]*?)<\/td>/g;
    let c;
    while ((c = tdRe.exec(body))) cells.push(c[1]);
    if (cells.length) rows.push(cells);
  }
  return rows;
}

function buildDay(html, dayId) {
  const table = extractTable(html, dayId);
  const rows = parseRows(table);
  const { bmc, hc } = COLS[dayId];
  const bmcTimes = [];
  const hcTimes = [];
  for (const row of rows) {
    if (row[bmc] !== undefined) bmcTimes.push(...parseTime(row[bmc]));
    if (row[hc]  !== undefined) hcTimes.push(...parseTime(row[hc]));
  }
  return {
    leavesBMC: wrapMidnight(bmcTimes),
    leavesHC:  wrapMidnight(hcTimes),
  };
}

async function loadHtml(arg) {
  if (arg) {
    return require('fs').readFileSync(arg, 'utf8');
  }
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function main() {
  const html = await loadHtml(process.argv[2]);
  const schedule = {};
  // Merge saturday-night into saturday (single Saturday list with day+night)
  for (const day of DAYS) schedule[day] = buildDay(html, day);
  const satMerged = {
    leavesBMC: [...schedule.saturday.leavesBMC, ...schedule['saturday-night'].leavesBMC].sort((a, b) => a - b),
    leavesHC:  [...schedule.saturday.leavesHC,  ...schedule['saturday-night'].leavesHC ].sort((a, b) => a - b),
  };
  const final = {
    mon: schedule.monday, tue: schedule.tuesday, wed: schedule.wednesday,
    thu: schedule.thursday, fri: schedule.friday, sat: satMerged, sun: schedule.sunday,
  };
  process.stdout.write('const SCHEDULE = ' + JSON.stringify(final, null, 2) + ';\n');
}

main().catch(e => { console.error(e); process.exit(1); });
