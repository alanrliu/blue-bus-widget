// icon-color: blue; icon-glyph: bus;

// MAKE SURE YOU COPY ALL CONTENTS OF THIS SCRIPT FOR IT TO WORK
// Blue Bus (Bi-Co) — Scriptable small/medium widget
// Left: next departures from BMC. Right: next departures from HC.
// Tap opens the official schedule page. 
// To refresh the schedule: run scrape.js and paste its output over the SCHEDULE block below.

const SCHEDULE_URL = 'https://www.brynmawr.edu/inside/offices-services/transportation/blue-bus';
const ROWS_PER_SIDE = 3;
const SCRIPT_NAME = 'Blue Bus';

// Schedule is noted in minutes since midnight.
// ---- BEGIN SCHEDULE (from scrape.js) -----------------------------------
const SCHEDULE = {
  "mon": {
    "leavesBMC": [455, 495, 525, 550, 570, 605, 615, 635, 655, 670, 695, 730, 750, 790, 810, 840, 845, 885, 910, 960, 965, 980, 1030, 1070, 1100, 1155, 1200, 1235, 1265, 1295, 1335, 1375, 1425, 1470],
    "leavesHC":  [470, 530, 555, 580, 585, 620, 630, 650, 675, 690, 710, 760, 775, 825, 830, 860, 885, 920, 950, 970, 980, 995, 1045, 1085, 1130, 1170, 1215, 1250, 1280, 1325, 1350, 1390, 1440, 1485]
  },
  "tue": {
    "leavesBMC": [440, 475, 495, 530, 550, 570, 590, 635, 655, 680, 695, 740, 760, 770, 790, 835, 850, 875, 910, 940, 965, 980, 1030, 1065, 1100, 1150, 1200, 1235, 1265, 1295, 1335, 1375, 1425, 1470],
    "leavesHC":  [460, 490, 515, 555, 570, 610, 620, 665, 670, 700, 730, 755, 780, 800, 825, 850, 870, 910, 950, 965, 980, 1005, 1050, 1085, 1130, 1170, 1215, 1250, 1280, 1325, 1350, 1390, 1440, 1485]
  },
  "wed": {
    "leavesBMC": [455, 495, 525, 550, 565, 605, 615, 635, 655, 670, 695, 730, 755, 790, 810, 840, 845, 885, 910, 960, 965, 980, 1030, 1070, 1110, 1155, 1200, 1235, 1270, 1300, 1335, 1375, 1425, 1470],
    "leavesHC":  [470, 530, 555, 580, 585, 620, 635, 650, 675, 690, 705, 760, 775, 825, 830, 860, 885, 920, 950, 970, 980, 995, 1050, 1085, 1130, 1170, 1215, 1255, 1285, 1315, 1350, 1390, 1440, 1485]
  },
  "thu": {
    "leavesBMC": [440, 475, 495, 530, 550, 570, 590, 635, 655, 680, 695, 740, 760, 770, 790, 835, 850, 860, 910, 940, 965, 980, 1030, 1060, 1090, 1120, 1160, 1200, 1240, 1270, 1335, 1375, 1425, 1470],
    "leavesHC":  [460, 490, 515, 555, 570, 610, 620, 665, 670, 700, 730, 755, 780, 800, 825, 850, 870, 910, 950, 965, 980, 1005, 1045, 1075, 1105, 1140, 1180, 1220, 1255, 1300, 1350, 1390, 1440, 1485]
  },
  "fri": {
    "leavesBMC": [455, 495, 525, 550, 570, 605, 615, 635, 655, 665, 695, 730, 790, 845, 875, 910, 945, 980, 1030, 1070, 1100, 1140, 1200, 1235, 1265, 1295, 1325, 1375, 1405, 1465, 1515, 1560],
    "leavesHC":  [470, 530, 555, 580, 585, 620, 635, 650, 675, 690, 710, 760, 825, 860, 890, 930, 965, 995, 1050, 1085, 1130, 1170, 1215, 1250, 1280, 1310, 1340, 1390, 1440, 1485, 1545, 1600]
  },
  "sat": {
    "leavesBMC": [600, 675, 735, 795, 855, 915, 990, 1020, 1050, 1080, 1110, 1140, 1200, 1260, 1290, 1320, 1350, 1380, 1440, 1470, 1500, 1530, 1575],
    "leavesHC":  [660, 700, 760, 820, 880, 940, 1005, 1035, 1065, 1095, 1125, 1170, 1230, 1275, 1305, 1335, 1365, 1395, 1455, 1485, 1515, 1545, 1605]
  },
  "sun": {
    "leavesBMC": [570, 615, 690, 750, 810, 870, 930, 975, 1020, 1050, 1080, 1110, 1140, 1170, 1200, 1260, 1320, 1380, 1440],
    "leavesHC":  [585, 645, 705, 765, 825, 885, 945, 990, 1035, 1065, 1095, 1125, 1155, 1185, 1215, 1275, 1335, 1395, 1455]
  }
};
// ---- END SCHEDULE ------------------------------------------------------

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Build a full week of (absoluteWeeklyMinute, mins-of-day, dayKey) for one side.
// Absolute minute space is 0..10080 (7 * 24 * 60). Entries in a day's list
// that exceed 1440 already carry the wrap forward.
function weeklyEntries(schedule, side) {
  const out = [];
  for (let d = 0; d < 7; d++) {
    const key = DAY_KEYS[d];
    for (const m of schedule[key][side]) {
      out.push({ abs: d * 1440 + m, minOfDay: m % 1440, day: key });
    }
  }
  return out;
}

function nextDepartures(schedule, side, now, count) {
  const nowAbs = now.getDay() * 1440 + now.getHours() * 60 + now.getMinutes();
  // Truncate to the start of the current minute so that the countdown doesn't jump around as seconds tick.
  const nowMin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
  const entries = weeklyEntries(schedule, side);
  return entries
    .map(e => ({ ...e, deltaMin: ((e.abs - nowAbs) % 10080 + 10080) % 10080 }))
    .sort((a, b) => a.deltaMin - b.deltaMin)
    .slice(0, count)
    // `at` feeds addDate(), which iOS counts down on its own.
    .map(e => ({ ...e, at: new Date(nowMin.getTime() + e.deltaMin * 60000) }));
}

function fmtTime(minOfDay, locale) {
  const h24 = Math.floor(minOfDay / 60) % 24;
  const m   = minOfDay % 60;
  const d = new Date(2020, 0, 1, h24, m);
  return d.toLocaleTimeString(locale || [], { hour: 'numeric', minute: '2-digit' })
    .replace(/\s*AM$/i, 'a')
    .replace(/\s*PM$/i, 'p');
}

const LIVE_COUNTDOWN = true;

function addDelta(row, dep) {
  if (!LIVE_COUNTDOWN) return row.addText(fmtDelta(dep.deltaMin));
  const live = row.addDate(dep.at);
  live.applyOffsetStyle();
  return live;
}

function fmtDelta(deltaMin) {
  if (deltaMin < 60) return `${deltaMin}m`;
  const h = Math.floor(deltaMin / 60);
  const m = deltaMin % 60;
  return m ? `${h}h${m}m` : `${h}h`;
}

const BG_TOP    = new Color('#0b1e4f');
const BG_BOTTOM = new Color('#1a3a8a');
const FG        = new Color('#ffffff');
const FG_DIM    = new Color('#c9d4f2');
const ACCENT    = new Color('#ffd166');

function addColumn(stack, title, deps, sizes) {
  const col = stack.addStack();
  col.layoutVertically();
  col.size = new Size(0, 0);

  const header = col.addText(title);
  header.font = Font.semiboldSystemFont(sizes.header);
  header.textColor = FG_DIM;
  col.addSpacer(sizes.headerGap);

  if (deps.length === 0) {
    const t = col.addText('no service');
    t.font = Font.mediumSystemFont(sizes.small);
    t.textColor = FG_DIM;
    return;
  }

  for (let i = 0; i < deps.length; i++) {
    const d = deps[i];
    const row = col.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();

    const time = row.addText(fmtTime(d.minOfDay));
    time.font = i === 0 ? Font.boldSystemFont(sizes.big) : Font.systemFont(sizes.small);
    time.textColor = i === 0 ? FG : FG_DIM;
    time.lineLimit = 1;
    time.minimumScaleFactor = 0.8;

    row.addSpacer(6);

    const delta = addDelta(row, d);
    delta.font = i === 0 ? Font.mediumSystemFont(sizes.bigDelta) : Font.systemFont(sizes.smallDelta);
    delta.textColor = i === 0 ? ACCENT : FG_DIM;
    delta.lineLimit = 1;
    delta.minimumScaleFactor = 0.7;

    if (i < deps.length - 1) col.addSpacer(sizes.rowGap);
  }
}

function makeGradient() {
  const g = new LinearGradient();
  g.colors = [BG_TOP, BG_BOTTOM];
  g.locations = [0, 1];
  return g;
}

function addHeader(container, size) {
  const bar = container.addStack();
  bar.centerAlignContent();
  const emoji = bar.addText('🚎');
  emoji.font = Font.systemFont(size.emoji);
  bar.addSpacer(5);
  const label = bar.addText('Blue Bus');
  label.font = Font.semiboldSystemFont(size.title);
  label.textColor = FG;
  bar.addSpacer();
  return bar;
}

//shows updated at time
function addUpdated(stack, now) {
  const t = stack.addText('updated ' + fmtTime(now.getHours() * 60 + now.getMinutes()));
  t.font = Font.systemFont(9);
  t.textColor = FG_DIM;
  return t;
}

function buildMedium(w, now) {
  w.setPadding(14, 16, 12, 16);
  addUpdated(addHeader(w, { emoji: 15, title: 14 }), now).rightAlignText();
  w.addSpacer(8);

  const body = w.addStack();
  body.layoutHorizontally();
  body.spacing = 12;

  const sizes = { header: 12, headerGap: 6, big: 24, small: 15, bigDelta: 14, smallDelta: 12, rowGap: 3 };
  const bmc = nextDepartures(SCHEDULE, 'leavesBMC', now, ROWS_PER_SIDE);
  const hc  = nextDepartures(SCHEDULE, 'leavesHC',  now, ROWS_PER_SIDE);
  addColumn(body, 'From BMC →', bmc, sizes);

  const divider = body.addStack();
  divider.size = new Size(1, 0);
  divider.backgroundColor = new Color('#ffffff', 0.15);

  addColumn(body, '← From Haverford', hc, sizes);

  w.addSpacer();
  const hint = w.addText('tap to see full schedule');
  hint.font = Font.systemFont(9);
  hint.textColor = FG_DIM;
  hint.centerAlignText();
}

function buildSmall(w, now) {
  w.setPadding(12, 12, 10, 12);
  addHeader(w, { emoji: 14, title: 13 });
  w.addSpacer(6);

  const [bmc] = nextDepartures(SCHEDULE, 'leavesBMC', now, 1);
  const [hc]  = nextDepartures(SCHEDULE, 'leavesHC',  now, 1);

  addSmallRow(w, 'From BMC', bmc);
  w.addSpacer(6);
  addSmallRow(w, 'From HC',  hc);
  w.addSpacer();
  addUpdated(w, now);
}

function addSmallRow(container, label, dep) {
  const labelText = container.addText(label);
  labelText.font = Font.semiboldSystemFont(11);
  labelText.textColor = FG_DIM;

  const row = container.addStack();
  row.centerAlignContent();
  if (!dep) {
    const none = row.addText('—');
    none.font = Font.systemFont(18);
    none.textColor = FG_DIM;
    return;
  }
  const time = row.addText(fmtTime(dep.minOfDay));
  time.font = Font.boldSystemFont(20);
  time.textColor = FG;
  time.lineLimit = 1;
  time.minimumScaleFactor = 0.8;
  row.addSpacer(6);
  const delta = addDelta(row, dep);
  delta.font = Font.mediumSystemFont(13);
  delta.textColor = ACCENT;
  delta.lineLimit = 1;
  delta.minimumScaleFactor = 0.7;
}

// refresh the script after a bus departs, since that's all that matters with limited refreshes
const REFRESH_MIN_MIN = 3;
const REFRESH_MAX_MIN = 60;

function nextRefreshMinutes(now) {
  const [nbmc] = nextDepartures(SCHEDULE, 'leavesBMC', now, 1);
  const [nhc]  = nextDepartures(SCHEDULE, 'leavesHC',  now, 1);
  const nextDelta = Math.min(nbmc ? nbmc.deltaMin : Infinity, nhc ? nhc.deltaMin : Infinity);
  const target = nextDelta + 1; // one minute after it pulls away
  return Math.max(REFRESH_MIN_MIN, Math.min(REFRESH_MAX_MIN, target));
}

async function buildWidget() {
  const now = new Date();
  const w = new ListWidget();
  w.url = SCHEDULE_URL;
  w.refreshAfterDate = new Date(now.getTime() + nextRefreshMinutes(now) * 60 * 1000);
  w.backgroundGradient = makeGradient();

  const family = (typeof config !== 'undefined' && config.widgetFamily) || 'medium';
  if (family === 'small') buildSmall(w, now);
  else                    buildMedium(w, now);

  return w;
}

// Scriptable takes a script's name from its filename, so a pasted script
// lands as "Untitled Script". On the first in-app run we write ourselves to
// "Blue Bus.js" in Scriptable's documents folder and delete the file we came
// from. Scripts live at <documentsDirectory>/<Script.name()>.js; iCloud is
// the real folder when iCloud Drive is on, local otherwise, so try both.
function renameSelf() {
  if (Script.name() === SCRIPT_NAME) return false;
  for (const open of [() => FileManager.iCloud(), () => FileManager.local()]) {
    let fm;
    try { fm = open(); } catch (e) { continue; }  // iCloud Drive turned off
    const dir = fm.documentsDirectory();
    const src = fm.joinPath(dir, Script.name() + '.js');
    if (!fm.fileExists(src)) continue;
    // writeString rather than copy to overwrite old versions
    fm.writeString(fm.joinPath(dir, SCRIPT_NAME + '.js'), fm.readString(src));
    fm.remove(src);
    return true;
  }
  return false;
}

// Scriptable entry specific
if (config.runsInApp && renameSelf()) {
  const a = new Alert();
  a.title = `Renamed to \u201c${SCRIPT_NAME}\u201d`;
  a.message = `Close this editor without editing. The script is now "${SCRIPT_NAME}" in your Scriptable list, ready to pick in the widget settings.`;
  a.addAction('OK');
  await a.present();
}

const widget = await buildWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else if (config.widgetFamily === 'small') {
  await widget.presentSmall();
} else {
  await widget.presentMedium();
}
Script.complete();
