/**
 * 1MV Listening Form V2 — QUESTIONS Sheet (where the questions and their translations live).
 *
 * Set up once: make a new blank Google Sheet → Extensions → Apps Script → paste this whole file → Save →
 * reload the Sheet → menu "1MV" → "Set up (first time)" → allow access. All tabs are created with today's questions.
 *
 * Tabs
 *   Read me            how to use
 *   Tracker            one row per language: green when every translation tab is complete
 *   Languages          languages, their code, the name shown in the form, the 🔊 voice, on/off
 *   Master (English)   ONLY for the admin: every question with all its details, in English
 *   Questions, Examples, Follow-ups, Options, Form text, Screen text
 *                      translation tabs: ID · English (base) · one column per language · Needs update
 *
 * When English changes, that row's existing translations are marked "Needs update" (orange) until a translator
 * edits them. Empty translations are yellow. The Tracker counts both.
 */
const SEED_URL = "https://gaupalemunna76.github.io/1mv-listening-form-v2/seed/questions_seed.json";
const MASTER = "Master (English)";
const TR_TABS = ["Questions", "Examples", "Follow-ups", "Options", "Form text", "Screen text"];
const FROM_MASTER = ["Questions", "Examples", "Follow-ups", "Options"];   // English comes from the Master
const EN = "English (base)", NEEDS = "Needs update";
const OPT_COL = "Options (English)  code: label | code: label";
const C = { head: "#1F5F8B", headText: "#FFFFFF", base: "#EEF2F7", empty: "#FFF4C2", stale: "#FBD3A8", done: "#D9F2E3", todo: "#FBE3D6" };

function onOpen() {
  SpreadsheetApp.getUi().createMenu("1MV")
    .addItem("Set up (first time)", "setupFromSeed")
    .addItem("Update translation tabs from Master", "syncFromMaster")
    .addItem("Add a language", "addLanguage")
    .addItem("Refresh tracker", "refreshTracker")
    .addToUi();
}

// ---------------------------------------------------------------- helpers
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function table_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 1) return { sh, head: [], rows: [] };
  const v = sh.getRange(1, 1, sh.getLastRow(), Math.max(1, sh.getLastColumn())).getValues();
  return { sh, head: v[0].map(String), rows: v.slice(1) };
}
function langs_() {
  const t = table_("Languages");
  const i = n => t.head.indexOf(n);
  return t.rows.filter(r => r[i("Language")] && String(r[i("Language")]) !== "English" && /^y/i.test(String(r[i("On?")])))
    .map(r => String(r[i("Language")]).trim());
}
function needsSet_(v) { return new Set(String(v || "").split(",").map(s => s.trim()).filter(Boolean)); }
function header_(sh, values) {
  sh.getRange(1, 1, 1, values.length).setValues([values]).setFontWeight("bold").setBackground(C.head).setFontColor(C.headText).setWrap(true);
  sh.setFrozenRows(1);
}
function sheet_(name, reset) {
  let sh = ss_().getSheetByName(name);
  if (!sh) sh = ss_().insertSheet(name);
  else if (reset) sh.clear();
  return sh;
}

// ---------------------------------------------------------------- set up
function setupFromSeed() {
  const ui = SpreadsheetApp.getUi();
  if (ss_().getSheetByName(MASTER)) {
    const a = ui.alert("Set up again?", "This replaces every tab with the questions from the live form. Translations typed here since then will be lost. Continue?", ui.ButtonSet.YES_NO);
    if (a !== ui.Button.YES) return;
  }
  const seed = JSON.parse(UrlFetchApp.fetch(SEED_URL).getContentText());
  buildFromSeed_(seed);
  ui.alert("Done", "All tabs are ready. Share this Sheet: General access → Anyone with the link → Viewer, and add translators as Editors.", ui.ButtonSet.OK);
}

function buildFromSeed_(seed) {
  const ss = ss_();
  readMe_(sheet_("Read me", true));
  sheet_("Tracker", true);
  const L = sheet_("Languages", true), lh = Object.keys(seed.languages[0]);
  header_(L, lh);
  L.getRange(2, 1, seed.languages.length, lh.length).setValues(seed.languages.map(l => lh.map(k => l[k] ?? "")));
  [16, 8, 18, 24, 8].forEach((w, i) => L.setColumnWidth(i + 1, w * 8));

  const M = sheet_(MASTER, true), mh = Object.keys(seed.master[0]);
  header_(M, mh);
  M.getRange(2, 1, seed.master.length, mh.length).setValues(seed.master.map(r => mh.map(k => r[k] ?? "")));
  M.setFrozenColumns(2);
  mh.forEach((k, i) => M.setColumnWidth(i + 1, /English/.test(k) ? 320 : /Show only|Unticks|Also accept|Answer type/.test(k) ? 150 : 90));
  M.getRange(2, 1, Math.max(1, M.getMaxRows() - 1), mh.length).setWrap(true).setVerticalAlignment("top");
  const types = ["Short text", "Long text", "Number", "One choice", "Many choices", "Dropdown"];
  M.getRange(2, mh.indexOf("Answer type") + 1, 999, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(types, true).build());
  ["Required?", "Other box?", "Ask follow-up?"].forEach(k => M.getRange(2, mh.indexOf(k) + 1, 999, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(["Yes", ""], true).build()));
  M.getRange(2, mh.indexOf("Also accept as a full answer") + 1, 999, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(["no one", "child's choice", ""], true).build());
  M.protect().setDescription("Master: admin only").setWarningOnly(true);

  const names = seed.languages.filter(l => l.Language !== "English").map(l => l.Language);
  TR_TABS.forEach(tab => {
    const sh = sheet_(tab, true), head = ["ID", EN].concat(names, [NEEDS]);
    header_(sh, head);
    const rows = (seed.translations[tab] || []).map(r => [r.id, r.en].concat(names.map(n => r[n] || ""), [""]));
    if (rows.length) sh.getRange(2, 1, rows.length, head.length).setValues(rows);
    formatTab_(sh, head);
  });
  ss.setActiveSheet(ss.getSheetByName("Tracker"));
  refreshTracker();
}

function formatTab_(sh, head) {
  sh.setColumnWidth(1, 150); sh.setColumnWidth(2, 340);
  for (let c = 3; c < head.length; c++) sh.setColumnWidth(c, 340);
  sh.setColumnWidth(head.length, 140);
  sh.setFrozenColumns(2);
  const n = Math.max(1, sh.getLastRow() - 1);
  sh.getRange(2, 1, n, head.length).setWrap(true).setVerticalAlignment("top");
  sh.getRange(2, 1, n, 2).setBackground(C.base);
  sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(p => p.remove());   // don't pile up old protections
  sh.getRange(1, 1, Math.max(2, sh.getLastRow()), 1).protect().setDescription("IDs: do not change").setWarningOnly(true);
  if (FROM_MASTER.indexOf(sh.getName()) !== -1) sh.getRange(1, 2, Math.max(2, sh.getLastRow()), 1).protect().setDescription("English comes from the Master tab").setWarningOnly(true);
  colour_(sh);
}

// Yellow = empty translation, orange = needs update, white = done.
function colour_(sh) {
  const last = sh.getLastRow(), width = sh.getLastColumn();
  if (last < 2) return;
  const v = sh.getRange(1, 1, last, width).getValues(), head = v[0].map(String), ni = head.indexOf(NEEDS);
  const bg = v.slice(1).map(r => {
    const needs = needsSet_(r[ni]);
    return head.map((h, c) => c < 2 ? C.base : c === ni ? (needs.size ? C.stale : "#FFFFFF")
      : !String(r[1]).trim() ? "#FFFFFF" : !String(r[c]).trim() ? C.empty : needs.has(h) ? C.stale : "#FFFFFF");
  });
  sh.getRange(2, 1, bg.length, width).setBackgrounds(bg);
}

// ---------------------------------------------------------------- Master → translation tabs
function expected_() {
  const m = table_(MASTER), i = n => m.head.indexOf(n);
  const out = { Questions: [], Examples: [], "Follow-ups": [], Options: [] };
  m.rows.forEach(r => {
    const id = String(r[i("ID")]).trim();
    if (!id) return;
    if (String(r[i("Question (English)")]).trim()) out.Questions.push([id, String(r[i("Question (English)")]).trim()]);
    if (String(r[i("Example (English)")]).trim()) out.Examples.push([id, String(r[i("Example (English)")]).trim()]);
    if (/^y/i.test(String(r[i("Ask follow-up?")])) && String(r[i("Follow-up question (English)")]).trim())
      out["Follow-ups"].push([id, String(r[i("Follow-up question (English)")]).trim()]);
    const opts = String(r[i(OPT_COL)] || "").trim();
    if (opts && opts.charAt(0) !== "@") parseOptions_(opts).forEach(o => out.Options.push([id + "." + o.code, o.label]));
  });
  return out;
}

// "school: In school | college: In college"  →  [{code, label}]
function parseOptions_(text) {
  return String(text).split("|").map(p => p.trim()).filter(Boolean).map(p => {
    const k = p.indexOf(":");
    return k > 0 ? { code: p.slice(0, k).trim(), label: p.slice(k + 1).trim() } : { code: p.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""), label: p };
  });
}

function syncFromMaster() {
  const exp = expected_(), names = langs_();
  let changed = 0, added = 0;
  FROM_MASTER.forEach(tab => {
    const t = table_(tab), head = ["ID", EN].concat(names, [NEEDS]);
    const old = {};
    t.rows.forEach(r => {
      const o = { en: String(r[1]), tr: {}, needs: needsSet_(r[t.head.indexOf(NEEDS)]) };
      t.head.forEach((h, c) => { if (c >= 2 && h !== NEEDS) o.tr[h] = r[c]; });
      old[String(r[0])] = o;
    });
    const rows = exp[tab].map(([id, en]) => {
      const o = old[id];
      if (!o) { added++; return [id, en].concat(names.map(() => ""), [""]); }
      const needs = new Set(o.needs);
      if (o.en !== en) { names.forEach(n => { if (String(o.tr[n] || "").trim()) needs.add(n); }); changed++; }
      return [id, en].concat(names.map(n => o.tr[n] || ""), [Array.from(needs).filter(n => names.indexOf(n) !== -1).join(", ")]);
    });
    if (tab === "Options")   // shared lists (e.g. @states) are written straight into the Options tab
      t.rows.filter(r => String(r[0]).charAt(0) === "@").forEach(r => {
        const o = old[String(r[0])];
        rows.push([String(r[0]), o.en].concat(names.map(n => o.tr[n] || ""), [Array.from(o.needs).join(", ")]));
      });
    const sh = t.sh || sheet_(tab, true);
    sh.clear();
    header_(sh, head);
    if (rows.length) sh.getRange(2, 1, rows.length, head.length).setValues(rows);
    formatTab_(sh, head);
  });
  setMasterFlag_(false);
  refreshTracker();
  ss_().toast(`${added} new and ${changed} changed rows sent to translators. See the Tracker.`, "1MV", 8);
}

// ---------------------------------------------------------------- edits by translators / admin
function onEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet(), name = sh.getName();
  if (name === MASTER) { setMasterFlag_(true); refreshTracker(); return; }
  if (TR_TABS.indexOf(name) === -1 || e.range.getRow() < 2) return;
  const width = sh.getLastColumn(), head = sh.getRange(1, 1, 1, width).getValues()[0].map(String), ni = head.indexOf(NEEDS);
  const names = langs_(), r0 = e.range.getRow(), nr = e.range.getNumRows(), c0 = e.range.getColumn(), nc = e.range.getNumColumns();
  const v = sh.getRange(r0, 1, nr, width).getValues();
  let touched = false;
  v.forEach((row, k) => {
    const needs = needsSet_(row[ni]);
    for (let c = c0; c < c0 + nc; c++) {
      const h = head[c - 1];
      if (names.indexOf(h) !== -1) needs.delete(h);                      // translator updated this language
      if (h === EN && FROM_MASTER.indexOf(name) === -1)                  // admin changed Form/Screen text English
        names.forEach(n => { if (String(row[head.indexOf(n)] || "").trim()) needs.add(n); });
    }
    if (ni !== -1) { sh.getRange(r0 + k, ni + 1).setValue(Array.from(needs).join(", ")); touched = true; }
  });
  if (touched) colour_(sh);
  refreshTracker();
}

function setMasterFlag_(on) {
  PropertiesService.getDocumentProperties().setProperty("masterChanged", on ? "1" : "");
}

// ---------------------------------------------------------------- tracker
function refreshTracker() {
  const names = langs_();
  const counts = {};   // tab -> lang -> {missing, stale}
  TR_TABS.forEach(tab => {
    const t = table_(tab), ni = t.head.indexOf(NEEDS);
    counts[tab] = {};
    names.forEach(n => {
      const c = t.head.indexOf(n);
      let missing = 0, stale = 0;
      t.rows.forEach(r => {
        if (!String(r[1]).trim()) return;
        if (c === -1 || !String(r[c]).trim()) missing++;
        else if (needsSet_(r[ni]).has(n)) stale++;
      });
      counts[tab][n] = { missing, stale };
    });
  });
  const sh = sheet_("Tracker", true);
  const head = ["Language"].concat(TR_TABS, ["Status"]);
  sh.getRange(1, 1).setValue("Translation tracker — a language turns green when every tab is complete").setFontWeight("bold").setFontSize(13);
  const flag = PropertiesService.getDocumentProperties().getProperty("masterChanged");
  sh.getRange(2, 1).setValue(flag ? "⚠️ The Master tab was edited. Admin: run menu 1MV → Update translation tabs from Master." : "Last updated: " + new Date().toLocaleString())
    .setFontColor(flag ? "#A23A32" : "#5A6475");
  sh.getRange(4, 1, 1, head.length).setValues([head]).setFontWeight("bold").setBackground(C.head).setFontColor(C.headText);
  const rows = [], bgs = [];
  names.forEach(n => {
    const todo = [];
    const cells = TR_TABS.map(tab => {
      const { missing, stale } = counts[tab][n];
      if (!missing && !stale) return "✅";
      todo.push(tab);
      return [missing ? missing + " empty" : "", stale ? stale + " to update" : ""].filter(Boolean).join(" · ");
    });
    rows.push([n].concat(cells, [todo.length ? "Check: " + todo.join(", ") : "✅ All done"]));
    bgs.push(["#FFFFFF"].concat(cells.map(c => c === "✅" ? C.done : C.todo), [todo.length ? C.todo : C.done]));
  });
  if (rows.length) {
    sh.getRange(5, 1, rows.length, head.length).setValues(rows).setBackgrounds(bgs).setVerticalAlignment("middle");
    sh.getRange(5, head.length, rows.length, 1).setFontWeight("bold");
  }
  sh.setColumnWidth(1, 120);
  for (let c = 2; c <= head.length; c++) sh.setColumnWidth(c, c === head.length ? 260 : 130);
  sh.getRange(rows.length + 6, 1).setValue("Empty = not translated yet (yellow in the tab). To update = the English changed after it was translated (orange).").setFontColor("#5A6475");
}

// ---------------------------------------------------------------- add a language
function addLanguage() {
  const ui = SpreadsheetApp.getUi();
  const ask = (q, hint) => { const r = ui.prompt("Add a language", q + (hint ? "\n" + hint : ""), ui.ButtonSet.OK_CANCEL); return r.getSelectedButton() === ui.Button.OK ? r.getResponseText().trim() : null; };
  const name = ask("Language name in English (e.g. Kannada)"); if (!name) return;
  const code = ask("Short code (e.g. kn)", "Two letters, lower case."); if (!code) return;
  const shown = ask("Name shown in the form (e.g. ಕನ್ನಡ)") || name;
  const voice = ask("Voice for 🔊 audio (optional, e.g. kn-IN-SapnaNeural)", "Leave empty to use the phone's own voice.") || "";
  const L = ss_().getSheetByName("Languages");
  const lh = L.getRange(1, 1, 1, L.getLastColumn()).getValues()[0].map(String);
  L.appendRow(lh.map(h => ({ "Language": name, "Code": code, "Name shown in form": shown, "Voice": voice, "On?": "Yes" })[h] ?? ""));
  TR_TABS.forEach(tab => {
    const sh = ss_().getSheetByName(tab);
    if (!sh) return;
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String), ni = head.indexOf(NEEDS);
    if (head.indexOf(name) !== -1) return;
    sh.insertColumnBefore(ni + 1);
    sh.getRange(1, ni + 1).setValue(name).setFontWeight("bold").setBackground(C.head).setFontColor(C.headText);
    sh.setColumnWidth(ni + 1, 340);
    colour_(sh);
  });
  refreshTracker();
  ui.alert("Added", name + " is added to every translation tab and to the Tracker. Translators can start filling the yellow cells.", ui.ButtonSet.OK);
}

// ---------------------------------------------------------------- read me
function readMe_(sh) {
  const lines = [
    ["1MV Listening Form — Questions and translations", true],
    ["Translators / अनुवादक / अनुवादक", true],
    ["1. Open your tab: Questions, Examples, Follow-ups, Options, Form text, Screen text.", false],
    ["2. Read the English (base) column. Write your language in your column. Yellow cells are empty; orange cells changed in English — please check and update them.", false],
    ["3. Do not change the ID or English columns.", false],
    ["4. The Tracker tab shows what is left for your language. It turns green when everything is done.", false],
    ["अपना कॉलम भरें: पीले खाने खाली हैं, नारंगी खानों में अंग्रेज़ी बदली है — कृपया जाँच कर अपडेट करें। ID और English कॉलम न बदलें।", false],
    ["तुमचा कॉलम भरा: पिवळे रकाने रिकामे आहेत, नारिंगी रकान्यांत इंग्रजी बदलले आहे — कृपया तपासून अद्ययावत करा. ID आणि English कॉलम बदलू नका.", false],
    ["", false],
    ["Admin", true],
    ["• Change questions only in Master (English). Then menu 1MV → Update translation tabs from Master. Changed rows go orange for translators; new rows are yellow.", false],
    ["• Never change an ID or an option code (the part before ':' in Options, e.g. school: In school).", false],
    ["• Follow-up: Ask follow-up? = Yes, and it is asked once if the answer has fewer words than 'Follow-up if fewer than (words)'.", false],
    ["• Show only if: e.g. 'Y5 in school, college' or 'Y14_now = notyet' or 'P7_visits not 0'.", false],
    ["• New language: menu 1MV → Add a language.", false],
    ["• When the Tracker is green (or when you are ready), press Publish on GitHub: Actions → Publish questions → Run workflow.", false],
  ];
  sh.getRange(1, 1, lines.length, 1).setValues(lines.map(l => [l[0]])).setWrap(true);
  lines.forEach((l, i) => { if (l[1]) sh.getRange(i + 1, 1).setFontWeight("bold").setFontColor("#1F5F8B"); });
  sh.getRange(1, 1).setFontSize(14);
  sh.setColumnWidth(1, 900);
}
