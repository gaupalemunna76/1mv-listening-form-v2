/**
 * 1MV Listening Form VERSION 2 -> Google Sheet receiver (use a NEW Sheet, not Version 1's).
 * Paste into Extensions -> Apps Script of the V2 responses Sheet, then
 * Deploy -> New deployment -> Web app (Execute as: Me, Who has access: Anyone). Put the /exec URL in config.js.
 *
 * Each form has its own tab (Youth / Parents / General Public). Two header rows:
 *   row 1 = column IDs (stable, e.g. Y11a_work, Y11a_work_fup) — you can hide this row, but don't edit it
 *   row 2 = readable labels (the English question; "Fups: <question>" for follow-ups)
 * Rewording a question only updates its label in row 2. A new question gets a new column at the end.
 * Sending the same response again updates its row (matched by session_id).
 * Lock: responses submitted before LOCK_AFTER are rejected.
 */
const TABS = { youth: "Youth", parent: "Parents", public: "General Public" };
const MAX_COLS = 400;
const LOCK_AFTER = "2026-10-16T18:12:00Z";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const data = JSON.parse(e.postData.contents);
    const cols = data.columns, labels = data.labels, values = data.values;
    if (data.tool !== "1MV Listening Form V2" || !TABS[data.persona] || !Array.isArray(cols) || !Array.isArray(values) || !Array.isArray(labels)
        || cols.length !== values.length || labels.length !== cols.length || cols.length > MAX_COLS
        || cols[0] !== "session_id" || !/^LF-\d{8}-[A-Z0-9]{4,10}$/.test(String(values[0]))
        || cols.some(c => !/^[A-Za-z][A-Za-z0-9_]*$/.test(String(c)))) {
      return text_("rejected");
    }
    const sub = cols.indexOf("submitted_at");
    if (sub === -1 || String(values[sub]) < LOCK_AFTER) return text_("rejected: before lock");

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const name = TABS[data.persona];
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);

    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 2, cols.length + 1).setValues([["received_at"].concat(cols), ["Received at"].concat(labels)]);
      sh.setFrozenRows(2);
      sh.getRange(2, 1, 1, cols.length + 1).setFontWeight("bold");
    }
    const width = sh.getLastColumn();
    let ids = sh.getRange(1, 1, 1, width).getValues()[0].map(String);
    let heads = sh.getRange(2, 1, 1, width).getValues()[0].map(String);

    // New questions: add their columns at the end (never reorder). Changed wording: update the label.
    const missing = cols.filter(c => ids.indexOf(c) === -1);
    if (missing.length) {
      sh.getRange(1, ids.length + 1, 2, missing.length).setValues([missing, missing.map(c => labels[cols.indexOf(c)])]);
      sh.getRange(2, ids.length + 1, 1, missing.length).setFontWeight("bold");
      ids = ids.concat(missing); heads = heads.concat(missing.map(c => labels[cols.indexOf(c)]));
    }
    cols.forEach((c, i) => {
      const k = ids.indexOf(c);
      if (labels[i] && heads[k] !== labels[i]) { sh.getRange(2, k + 1).setValue(clean_(labels[i])); heads[k] = labels[i]; }
    });

    const row = ids.map(id => {
      if (id === "received_at") return new Date();
      const i = cols.indexOf(id);
      return i === -1 ? "" : clean_(values[i]);
    });

    const idCol = ids.indexOf("session_id") + 1;
    const last = sh.getLastRow();
    let target = -1;
    if (last > 2) {
      const found = sh.getRange(3, idCol, last - 2, 1).createTextFinder(String(values[0])).matchEntireCell(true).findNext();
      if (found) target = found.getRow();
    }
    if (target > 0) sh.getRange(target, 1, 1, row.length).setValues([row]);
    else sh.appendRow(row);
    return text_("ok");
  } catch (err) {
    return text_("error");
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return text_("1MV Listening Form V2 endpoint is running.");
}

// Store everything as plain text so an answer can never run as a spreadsheet formula.
function clean_(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" || typeof v === "boolean") return v;
  let s = String(v).slice(0, 5000);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function text_(s) {
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT);
}
