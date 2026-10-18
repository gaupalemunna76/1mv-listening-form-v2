// Queue test in headless Edge, with a fake Sheet receiver (nothing reaches the real Sheet).
// Run: python -m http.server 8790   (project folder, separate window)
//      node tests/queue_edge.mjs
// 1. The receiver is "busy" twice, then says ok → the response must stay queued and arrive on the 3rd try.
// 2. The receiver says "rejected: before lock" → the response is marked not-sent and never retried.
import http from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let mode = "busy-twice", hits = 0, okHits = 0;
const receiver = http.createServer((req, res) => {
  let body = ""; req.on("data", c => body += c); req.on("end", () => {
    hits++;
    const reply = mode === "reject" ? "rejected: before lock" : hits <= 2 ? "error" : "ok";
    if (reply === "ok") okHits++;
    res.writeHead(200, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" }); res.end(reply);
  });
}).listen(8796);

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const p = spawn(EDGE, ["--headless=new", "--disable-gpu", "--remote-debugging-port=9352", `--user-data-dir=${mkdtempSync(join(tmpdir(), "lfq-"))}`,
  "http://localhost:8790/?t=public&sheet=" + encodeURIComponent("http://localhost:8796/")], { stdio: "ignore" });
let ws;
for (let i = 0; i < 40 && !ws; i++) { await sleep(400); try { const l = await (await fetch("http://127.0.0.1:9352/json")).json(); const pg = l.find(x => x.type === "page" && x.url.includes("8790")); if (pg) ws = new WebSocket(pg.webSocketDebuggerUrl); } catch {} }
await new Promise(r => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = m => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); };
const ev = e => new Promise(r => { const n = ++id; pend.set(n, d => r(d.result?.result?.value)); ws.send(JSON.stringify({ id: n, method: "Runtime.evaluate", params: { expression: e, returnByValue: true, awaitPromise: true } })); });
let fails = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) fails++; };

const fillPublic = `(async()=>{ const W=ms=>new Promise(r=>setTimeout(r,ms));
  if (document.getElementById('consent')) { document.getElementById('consent').click(); document.getElementById('startBtn').click(); await W(300); }
  for (let n=0; n<40 && !document.querySelector('.thanks'); n++) {
    const card=document.querySelector('.card'); if(!card){ await W(200); continue; }
    const sel=card.querySelector('select'), num=card.querySelector('input[type=number]'), ta=card.querySelector('textarea[id^=f_]'), opt=card.querySelector('.opt');
    if (sel) { sel.value=sel.options[1].value; sel.dispatchEvent(new Event('change',{bubbles:true})); }
    else if (num) { num.value='40'; num.dispatchEvent(new Event('input',{bubbles:true})); }
    else if (ta) { ta.value='Queue test answer with enough words here'; ta.dispatchEvent(new Event('input',{bubbles:true})); }
    else if (opt) { opt.click(); await W(900); continue; }
    document.getElementById('next').click(); await W(250);
  }
  return !!document.querySelector('.thanks'); })()`;
const rec = () => ev(`JSON.stringify(JSON.parse(localStorage.getItem('lf2.responses')||'[]').map(r=>({sent:!!r.sent,skipped:!!r.skipped,tries:r.tries||0,reply:r.reply||''})))`).then(JSON.parse);

await sleep(2000);
ok(await ev(fillPublic), "form submitted");
await sleep(3500);
let r = await rec();
ok(r[0] && !r[0].sent && r[0].tries === 1 && r[0].reply === "error", "busy reply: response kept on the phone, not marked sent");
ok((await ev(`document.querySelector('.thanks p').textContent`)).includes("saved on this device"), "thank-you screen says it will be sent automatically");
for (let i = 0; i < 40 && !(await rec())[0].sent; i++) await sleep(1000);
r = await rec();
ok(r[0].sent && hits === 3 && okHits === 1, `arrives after retries (receiver calls: ${hits})`);
ok((await ev(`document.querySelector('.thanks p').textContent`)).includes("have been sent"), "thank-you screen updates to 'sent'");

mode = "reject"; hits = 0;
await ev(`document.getElementById('again').click(); true`); await sleep(400);
ok(await ev(fillPublic), "second response submitted");
await sleep(4000);
r = await rec();
ok(r[1] && r[1].skipped && !r[1].sent && r[1].reply.startsWith("rejected"), "rejected reply: marked not-sent, no retry");
await sleep(9000);
ok(hits === 1, `rejected response was not retried (receiver calls: ${hits})`);

ws.close(); p.kill(); receiver.close();
console.log(fails ? `${fails} FAILED` : "all passed");
process.exit(fails ? 1 : 0);
