// End-to-end check in headless Microsoft Edge: walks the Youth form one question at a time, triggers
// follow-ups and conditions, uses 🔊, switches Hindi/Marathi, submits, and checks the saved record.
// Run: python -m http.server 8790   (in the project folder, separate window)
//      node tests/e2e_edge.mjs
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const URL_ = "http://localhost:8790/?t=youth";
const prof = mkdtempSync(join(tmpdir(), "lf-edge-"));
const p = spawn(EDGE, ["--headless=new", "--disable-gpu", "--remote-debugging-port=9334", `--user-data-dir=${prof}`, URL_], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;
for (let i = 0; i < 40 && !ws; i++) {
  await sleep(500);
  try {
    const list = await (await fetch("http://127.0.0.1:9334/json")).json();
    const page = list.find(x => x.type === "page" && x.url.includes("8790"));
    if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
  } catch {}
}
await new Promise(r => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const ev = async expr => {
  const r = await new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: expr, returnByValue: true } })); });
  if (r.result?.exceptionDetails) throw new Error(expr + "\n" + JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result?.result?.value;
};
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "ok   " : "FAIL ") + msg); if (!cond) fails++; };

await sleep(1500);
await ev(`
  window.T = {
    q() { return document.querySelector('.card')?.dataset.q || ''; },
    txt(v) { const e = document.querySelector('.card textarea[id^=f_], .card input[id^=f_]'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('blur')); },
    sel(v) { const e = document.querySelector('.card select'); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); },
    chip(v) { document.querySelector('.opt[data-v="' + v + '"]').click(); },
    probe(v) { const e = document.querySelector('[id^=pa_]'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); },
    fu() { return !!document.querySelector('.followup'); },
    next() { document.getElementById('next').click(); },
    err() { return document.getElementById('err')?.textContent || ''; },
    text() { return document.getElementById('qtext')?.textContent || ''; },
  }; true`);
const step = async (expr, wait = 150) => {
  const before = await ev(`T.q()`);
  await ev(expr + "; true");
  if (wait < 900) return sleep(wait);
  // A choice tap moves on by itself: wait (up to 4 s) until the next question is on screen.
  for (let i = 0; i < 40 && (await ev(`T.q()`)) === before; i++) await sleep(100);
  await sleep(100);
};

// Start screen
ok(await ev(`document.querySelector('[data-form=youth]').getAttribute('aria-pressed')`) === "true", "?t=youth preselects the Youth form");
ok(await ev(`document.querySelectorAll('.langs button').length`) === 3, "three languages offered");
ok(await ev(`document.getElementById('startBtn').disabled`) === true, "Start locked until consent");
await step(`document.getElementById('consent').click(); document.getElementById('startBtn').click()`);
ok(await ev(`T.q()`) === "Y1_age", "first question shown alone");

// Profile questions, one per screen
await step(`T.next()`);
ok((await ev(`T.err()`)).length > 0 && await ev(`T.q()`) === "Y1_age", "required answer enforced");
await step(`T.sel('17'); T.next()`);
ok(await ev(`T.q()`) === "Y2_gender", "Next moves to the next question");
await step(`T.chip('female')`, 950);
ok(await ev(`T.q()`) === "Y3_state", "one tap on a choice moves on by itself");
await step(`T.sel('bihar'); T.next()`);
await step(`T.txt('Gaya'); T.next()`);
await step(`T.chip('working')`, 950);
ok(await ev(`T.q()`) === "Y7_institution", "class question skipped for 'Working'");
await step(`document.getElementById('back').click()`);
ok(await ev(`T.q()`) === "Y5", "Back returns to the previous question");
await step(`T.chip('school')`, 950);
ok(await ev(`T.q()`) === "Y6_class", "class question asked for 'In school'");
await step(`T.sel('c11_12'); T.next()`);
await step(`T.chip('govt')`, 950);
await step(`T.chip('lt3')`, 950);
await step(`T.chip('seeing'); T.chip('no')`);
ok(await ev(`[...document.querySelectorAll('.opt[aria-pressed=true]')].map(x=>x.dataset.v).join()`) === "no", "'No' unticks other disability options");
await step(`T.next()`);
ok(await ev(`T.q()`) === "Y11a_work", "future section starts");

// Optional speech
await ev(`window.SAID = []; speechSynthesis.speak = u => { if (u.text.trim()) SAID.push(u.text); setTimeout(() => u.onend && u.onend(), 50); }; true`);
ok(await ev(`!!document.getElementById('say') && !!document.querySelector('[data-mic]')`) === true, "Listen and mic buttons shown");
ok(await ev(`SAID.length`) === 0, "nothing is read aloud by default");
await step(`document.getElementById('say').click()`, 1200);
ok((await ev(`SAID.join('|')`)).includes("When you are 30, what work"), "Listen reads the question and its example");
await step(`document.querySelector('[data-mic]').click()`, 2500);
ok(await ev(`!document.getElementById('m_f_Y11a_work').hidden`) === true, "mic shows a status or error (no real mic here)");
await ev(`document.querySelector('.mic.listening')?.click(); true`);

// Follow-up + language switches
await step(`T.txt('Teacher'); T.next()`);
ok(await ev(`T.q()`) === "Y11a_work" && await ev(`T.fu()`) === true, "follow-up appears for 'Teacher' (too short)");
await step(`document.querySelector('.toplangs [data-lang=hi]').click()`);
ok((await ev(`T.text()`)).includes("30 साल"), "Hindi switch shows the question in Hindi");
ok(await ev(`T.fu()`) === true && await ev(`document.getElementById('f_Y11a_work').value`) === "Teacher", "answer and follow-up kept after switch");
await step(`document.querySelector('.toplangs [data-lang=mr]').click()`);
ok((await ev(`T.text()`)).includes("३० वर्षांचे"), "Marathi switch shows the question in Marathi");
await step(`document.querySelector('.toplangs [data-lang=hi]').click()`);
await step(`T.probe('Science teacher in a government school in Patna'); T.next()`);
ok(await ev(`T.q()`) === "Y11b_life", "second Next moves on (follow-up asked once)");
await step(`T.txt('In my own house in Gaya near my parents'); T.next()`);
ok(await ev(`T.q()`) === "Y12_sure" && await ev(`T.fu()`) === false, "good answer: no follow-up");
await step(`T.chip('quite')`, 950);
await step(`T.txt('Yes'); T.next()`);
ok(await ev(`T.fu()`) === true, "follow-up appears for 'Yes'");
await step(`T.next()`);
ok(await ev(`T.q()`) === "Y13_skills", "follow-up can be left blank");
await step(`T.txt('Spoken English and typing'); T.next()`);
await step(`T.chip('notyet')`, 950);
const atQ = await ev(`T.q()`);
ok(atQ === "Y14_stop", "'Not yet' leads to 'what is stopping you'" + (atQ === "Y14_stop" ? "" : ` (on ${atQ})`));
await step(`T.txt('No coaching centre near my village'); T.next()`);
await step(`T.txt('My senior showed me interview preparation'); T.next()`);
await step(`T.txt('Career counselling in Class 10'); T.next()`);
await step(`T.txt('No one'); T.next()`);
ok(await ev(`T.q()`) === "Y18_mydo", "'No one' accepted without a follow-up");
await step(`T.txt('Sometimes I want to die')`);
ok(await ev(`document.getElementById('supportSlot').textContent.includes('14416')`) === true, "support line (Tele-MANAS) appears for a distress phrase");
await step(`T.next()`, 900);
ok(await ev(`!!document.querySelector('.thanks')`) === true, "thank-you screen shown");

const rec = JSON.parse(await ev(`localStorage.getItem('lf2.responses')`))[0];
const v = c => rec.values[rec.cols.indexOf(c)];
ok(rec && rec.tool === "youth" && /^LF-\d{8}-/.test(rec.sid), "record saved with a session id");
ok(v("Which class or course are you in?") === "Class 11–12" && v("Do you have a disability? Tick any that apply.") === "No" && v("What are you doing right now?") === "In school", "columns are named by the question; choices saved as English labels");
ok(rec.cols.length === 9 + 21 + 10, "one column per question + one Fups column per follow-up question (40 for Youth)");
ok(v("When you are 30, what work do you want to be doing?") === "Teacher" && v("Fups: When you are 30, what work do you want to be doing?") === "Science teacher in a government school in Patna", "follow-up answer in its own Fups: column");
ok(v("Fups: What is the main reason you feel this way?") === "", "blank follow-up saved blank");
ok(v("Fups: asked & why") === "Y11a_work: short; Y12_reason: nonanswer", "Fups: asked & why lists where and why");
ok(v("Where or how are you learning them?") === "" && v("What is stopping you from learning them now?").startsWith("No coaching"), "skipped question saved blank");
ok(v("Safety flag") === "YES" && v("Language") === "hi" && v("Spoken answers") === "", "safety flag, language and spoken saved");
ok(rec.cols[0] === "session_id" && new Set(rec.cols).size === rec.cols.length, "session_id first, no duplicate column names");
ok(await ev(`localStorage.getItem('lf2.draft')`) === null, "draft cleared after submit");

ws.close(); p.kill();
console.log(fails ? `${fails} FAILED` : "all passed");
process.exit(fails ? 1 : 0);
