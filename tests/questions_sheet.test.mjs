// Runs google_sheet/QuestionsSheet.gs against a small fake Google Sheet, to check set-up, the Master → translation
// sync, "needs update" marks, the Tracker and adding a language — without touching any real Sheet.
// Run: node tests/questions_sheet.test.mjs   (also writes tests/out/sheet_tabs.json for the build test)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";

const code = readFileSync(new URL("../google_sheet/QuestionsSheet.gs", import.meta.url), "utf-8");
const seedText = readFileSync(new URL("../seed/questions_seed.json", import.meta.url), "utf-8");

// ---------------- fake Apps Script services
const chain = () => new Proxy(function () {}, { get: (t, k) => k === "then" ? undefined : chain(), apply: () => chain() });
class Sheet {
  constructor(name) {
    this.name = name; this.data = [];
    const p = new Proxy(this, { get: (t, k) => k in t ? (typeof t[k] === "function" ? t[k].bind(p) : t[k]) : (typeof k === "string" ? () => chain() : undefined) });
    return p;
  }
  getName() { return this.name; }
  getLastRow() { for (let r = this.data.length; r > 0; r--) if (this.data[r - 1].some(v => String(v ?? "") !== "")) return r; return 0; }
  getLastColumn() { let m = 0; this.data.forEach(row => { for (let c = row.length; c > 0; c--) if (String(row[c - 1] ?? "") !== "") { m = Math.max(m, c); break; } }); return m; }
  getMaxRows() { return 1000; }
  getRange(r, c, nr = 1, nc = 1) { return new Range(this, r, c, nr, nc); }
  clear() { this.data = []; }
  insertColumnBefore(c) { this.data.forEach(row => { while (row.length < c - 1) row.push(""); row.splice(c - 1, 0, ""); }); }
  appendRow(vals) { this.data.splice(this.getLastRow(), 0, [...vals]); }
  getProtections() { return []; }
}
class Range {
  constructor(sh, r, c, nr, nc) {
    Object.assign(this, { sh, r, c, nr, nc });
    const p = new Proxy(this, { get: (t, k) => k in t ? (typeof t[k] === "function" ? t[k].bind(p) : t[k]) : (typeof k === "string" ? () => p : undefined) });
    return p;
  }
  getSheet() { return this.sh; } getRow() { return this.r; } getColumn() { return this.c; } getNumRows() { return this.nr; } getNumColumns() { return this.nc; }
  getValues() { return Array.from({ length: this.nr }, (_, i) => Array.from({ length: this.nc }, (_, j) => this.sh.data[this.r - 1 + i]?.[this.c - 1 + j] ?? "")); }
  setValues(v) { v.forEach((row, i) => { const R = this.r - 1 + i; while (this.sh.data.length <= R) this.sh.data.push([]); row.forEach((x, j) => { const line = this.sh.data[R]; while (line.length < this.c - 1 + j) line.push(""); line[this.c - 1 + j] = x; }); }); return this; }
  setValue(x) { return this.setValues([[x]]); }
  protect() { return chain(); }
}
const sheets = new Map(), props = {}, prompts = [], toasts = [];
const ss = {
  getSheetByName: n => sheets.get(n) || null,
  insertSheet: n => { const s = new Sheet(n); sheets.set(n, s); return s; },
  setActiveSheet: () => {}, toast: m => toasts.push(m),
};
const env = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ss, newDataValidation: () => chain(), ProtectionType: { RANGE: "RANGE" },
    getUi: () => ({ createMenu: () => chain(), alert: () => "YES", prompt: () => { const a = prompts.shift(); return { getSelectedButton: () => "OK", getResponseText: () => a }; },
      ButtonSet: {}, Button: { YES: "YES", OK: "OK" } }) },
  UrlFetchApp: { fetch: () => ({ getContentText: () => seedText }) },
  PropertiesService: { getDocumentProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
};
const api = new Function(...Object.keys(env), code + "\nreturn { setupFromSeed, syncFromMaster, refreshTracker, addLanguage, onEdit };")(...Object.values(env));

const tab = n => { const s = sheets.get(n); const v = s.getRange(1, 1, s.getLastRow(), s.getLastColumn()).getValues(); return { head: v[0].map(String), rows: v.slice(1) }; };
const cell = (n, id, col) => { const t = tab(n); const r = t.rows.find(r => String(r[0]) === id); return r ? r[t.head.indexOf(col)] : undefined; };
const tracker = lang => { const t = sheets.get("Tracker"); const v = t.getRange(1, 1, t.getLastRow(), t.getLastColumn()).getValues(); const h = v[3].map(String); const r = v.find(r => r[0] === lang); return r && Object.fromEntries(h.map((k, i) => [k, r[i]])); };
const edit = (n, id, col, value) => { const s = sheets.get(n), t = tab(n); const r = t.rows.findIndex(r => String(r[0]) === id) + 2, c = t.head.indexOf(col) + 1; s.getRange(r, c).setValue(value); api.onEdit({ range: s.getRange(r, c) }); };
const editMaster = (id, col, value) => { const s = sheets.get("Master (English)"), t = tab("Master (English)"); const r = t.rows.findIndex(r => String(r[1]) === id) + 2; s.getRange(r, t.head.indexOf(col) + 1).setValue(value); api.onEdit({ range: s.getRange(r, t.head.indexOf(col) + 1) }); };
let n = 0; const ok = (c, m) => { assert.ok(c, m); console.log("ok   " + m); n++; };

// 1. Set up from the live form's questions
api.setupFromSeed();
ok(["Read me", "Tracker", "Languages", "Master (English)", "Questions", "Examples", "Follow-ups", "Options", "Form text", "Screen text", "Answer words"].every(t => sheets.has(t)), "set-up creates all 11 tabs");
ok(tab("Answer words").rows.length === 3 && tracker("Hindi")["Answer words"] === "✅", "Answer words: a filled row per language; tracker counts it");
ok(tab("Questions").head.join("|") === "ID|English (base)|Hindi|Marathi|Needs update", "translation tab columns: ID · English (base) · Hindi · Marathi · Needs update");
ok(tab("Master (English)").rows.length === 52 && tab("Options").rows.length === 144, "52 questions in the Master, 144 options");
ok(tracker("Hindi").Status === "✅ All done" && tracker("Marathi").Status === "✅ All done", "tracker: both languages green after set-up");

// 2. Admin changes a question in the Master
editMaster("Y11a_work", "Question (English)", "At 30, what work would you like to do?");
ok(String(sheets.get("Tracker").getRange(2, 1).getValues()[0][0]).includes("Master tab was edited"), "tracker warns that the Master changed");
api.syncFromMaster();
ok(cell("Questions", "Y11a_work", "English (base)") === "At 30, what work would you like to do?", "sync copies the new English into Questions");
ok(cell("Questions", "Y11a_work", "Needs update") === "Hindi, Marathi", "the changed row is marked 'Needs update' for Hindi and Marathi");
ok(cell("Questions", "Y1_age", "Needs update") === "", "unchanged rows are not marked");
ok(tracker("Hindi").Questions === "1 to update" && tracker("Hindi").Status === "Check: Questions", "tracker: Hindi shows 'Check: Questions'");

// 3. Hindi translator updates that row
edit("Questions", "Y11a_work", "Hindi", "30 साल की उम्र में आप कौन सा काम करना चाहेंगे?");
ok(cell("Questions", "Y11a_work", "Needs update") === "Marathi", "after the Hindi edit only Marathi still needs it");
ok(tracker("Hindi").Status === "✅ All done" && tracker("Marathi").Status === "Check: Questions", "tracker: Hindi green, Marathi still to do");

// 4. Admin adds a new question with a follow-up
const M = sheets.get("Master (English)"), mh = tab("Master (English)").head;
const newRow = mh.map(h => ({ "Form": "public", "ID": "G12_new", "Section": "views", "Order": 13, "Answer type": "Short text", "Question (English)": "What is one new idea for young people?", "Ask follow-up?": "Yes", "Follow-up if fewer than (words)": 4, "Follow-up question (English)": "Can you say a bit more?" })[h] ?? "");
M.appendRow(newRow);
api.syncFromMaster();
ok(cell("Questions", "G12_new", "Hindi") === "" && cell("Follow-ups", "G12_new", "English (base)") === "Can you say a bit more?", "new question appears in Questions and Follow-ups, untranslated");
ok(tracker("Hindi").Questions === "1 empty" && tracker("Hindi")["Follow-ups"] === "1 empty", "tracker: Hindi shows 1 empty in Questions and Follow-ups");
ok(cell("Options", "@states.bihar", "Hindi") === "बिहार", "shared @states options are kept through the sync");

// 5. Admin changes Screen text English directly
edit("Screen text", "next", "English (base)", "Continue");
ok(cell("Screen text", "next", "Needs update") === "Hindi, Marathi", "changing Screen text English marks it for both languages");

// 6. Add a language
prompts.push("Kannada", "kn", "ಕನ್ನಡ", "");
api.addLanguage();
ok(tab("Questions").head.join("|") === "ID|English (base)|Hindi|Marathi|Kannada|Needs update", "Kannada column added before 'Needs update' in every tab");
ok(tracker("Kannada") && tracker("Kannada").Questions === "53 empty" && tracker("Kannada").Status.startsWith("Check:"), "tracker: Kannada row with everything to do");
ok(tab("Answer words").rows.some(r => r[0] === "Kannada") && tracker("Kannada")["Answer words"] === "4 empty", "Kannada gets an empty Answer words row (4 empty in the tracker)");
ok(tab("Languages").head.includes("Font (optional)") && tab("Languages").rows.some(r => r[0] === "Kannada"), "Kannada added to Languages");

// Save the fake Sheet for the build test (Kannada and the test question removed again)
mkdirSync(new URL("./out/", import.meta.url), { recursive: true });
const dump = {};
for (const [name, s] of sheets) { const t = s.getLastRow() ? s.getRange(1, 1, s.getLastRow(), s.getLastColumn()).getValues() : []; dump[name] = t; }
writeFileSync(new URL("./out/sheet_tabs.json", import.meta.url), JSON.stringify(dump));
console.log(`ok - ${n} questions-sheet checks passed`);
