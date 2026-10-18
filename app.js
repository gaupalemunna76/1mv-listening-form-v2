// 1MV Listening Form — one question per screen (Youth Voice look), with follow-ups, conditions,
// optional 🔊 listen and 🎤 speak, three languages, offline save and Google Sheet sync.
import { loadContent, toTools } from "./content.js?v=20261018-1727";
import { LANGS, UI, t } from "./i18n.js?v=20261018-1727";
import { assess, isDistress, configureChecks } from "./probe.js?v=20261018-1727";
import { SHEET_URL as CONFIG_SHEET_URL } from "./config.js?v=20261018-1727";
import { canSpeak, canListen, loadVoices, pickVoice, speak, stopSpeaking, unlockSpeech, listen, isMobile, browserName, speechBlocked } from "./speech.js?v=20261018-1727";

// Questions, languages, screen text and answer checks come from the published Questions Sheet (content/questions.json).
const CONTENT = await loadContent(new URL(import.meta.url).searchParams.get("v"));
const TOOLS = toTools(CONTENT);
LANGS.splice(0, LANGS.length, ...CONTENT.languages);
for (const [k, v] of Object.entries(CONTENT.ui || {})) UI[k] = { ...(UI[k] || {}), ...v };
configureChecks(CONTENT.checks);

const params0 = new URLSearchParams(location.search);
// Local test copies (localhost) never send to the real Sheet unless ?sync is added; ?sheet=<url> points at a test receiver.
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const SHEET_URL = LOCAL ? (params0.get("sheet") || (params0.has("sync") ? CONFIG_SHEET_URL : "")) : CONFIG_SHEET_URL;
const VERSION = "20261018-1727";
// Version 2 lives on the same domain as Version 1 (gaupalemunna76.github.io), and browser storage is shared per
// domain, so V2 uses its own storage names. Otherwise each version would pick up and send the other's responses.
const DRAFT = "lf2.draft";
const STORE = "lf2.responses";
const TOOL_NAME = "1MV Listening Form V2";
const STAGE_COLORS = ["--about", "--dream", "--path", "--support", "--voice"];
const $ = sel => document.querySelector(sel);
const app = $("#app");
const params = new URLSearchParams(location.search);

const S = { screen: "start", lang: "en", tool: null, pos: 0, A: {}, P: {}, V: {}, flag: false, sid: "", started: "", source: params.get("src") || "", consent: false };

// ---------------- storage (wrapped: private windows can refuse storage) ----------------
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const saveDraft = () => S.tool && S.screen === "q" && save(DRAFT, { tool: S.tool.key, lang: S.lang, pos: S.pos, A: S.A, P: S.P, V: S.V, flag: S.flag, sid: S.sid, started: S.started, source: S.source });
const clearDraft = () => { try { localStorage.removeItem(DRAFT); } catch {} };

// ---------------- helpers ----------------
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tx = (entry, vars) => esc(t(entry, S.lang, vars));
const textTypes = new Set(["short", "para"]);
const allItems = tool => tool.sections.flatMap(s => s.items);
const flat = () => S.tool.sections.flatMap((s, si) => s.items.map(q => ({ q, si })));
const visible = q => !q.showIf || !!q.showIf(S.A);
const newSid = () => {
  const d = new Date(), p = n => String(n).padStart(2, "0");
  return `LF-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
};
const speechLang = () => (LANGS.find(l => l.code === S.lang) || LANGS[0]).speech;
const go = (screen) => { S.screen = screen; render(); scrollTo(0, 0); };

// ---------------- language ----------------
// Any language in the Questions Sheet works without code changes: the right Google font is loaded for its script
// (or the "Font (optional)" set in the Languages tab), and right-to-left scripts flip the page.
const SCRIPT_FONT = { hi: "Noto Sans Devanagari", mr: "Noto Sans Devanagari", ne: "Noto Sans Devanagari", sa: "Noto Sans Devanagari",
  kok: "Noto Sans Devanagari", mai: "Noto Sans Devanagari", doi: "Noto Sans Devanagari", bho: "Noto Sans Devanagari",
  bn: "Noto Sans Bengali", as: "Noto Sans Bengali", pa: "Noto Sans Gurmukhi", gu: "Noto Sans Gujarati", or: "Noto Sans Oriya",
  ta: "Noto Sans Tamil", te: "Noto Sans Telugu", kn: "Noto Sans Kannada", ml: "Noto Sans Malayalam", ur: "Noto Nastaliq Urdu",
  ks: "Noto Nastaliq Urdu", sd: "Noto Naskh Arabic", sat: "Noto Sans Ol Chiki", mni: "Noto Sans Meetei Mayek" };
const RTL = new Set(["ur", "ks", "sd", "ar", "fa", "ps", "he"]);
function applyScript(code) {
  const root = document.documentElement, lang = LANGS.find(l => l.code === code) || {};
  const family = code === "en" ? "" : lang.font || SCRIPT_FONT[code] || "";
  root.lang = code;
  root.dir = RTL.has(code) ? "rtl" : "ltr";
  if (!family) { delete root.dataset.script; root.style.removeProperty("--lang-font"); return; }
  const id = "font-" + family.replace(/\W+/g, "-");
  if (!document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id; link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${family.trim().replace(/ +/g, "+")}&display=swap`;
    document.head.appendChild(link);
  }
  root.style.setProperty("--lang-font", `"${family}"`);
  root.dataset.script = code;
}

function setLang(code) {
  S.lang = LANGS.some(l => l.code === code) ? code : "en";
  applyScript(S.lang);
  renderTop();
  saveDraft();
  render();
}
function renderTop() {
  $("#brandName").textContent = t(UI.appName, S.lang);
  $("#topLangs").innerHTML = LANGS.map(l => `<button type="button" class="ghost" data-lang="${l.code}" lang="${l.code}" aria-pressed="${l.code === S.lang}">${esc(l.name)}</button>`).join("");
}
document.addEventListener("click", e => { const b = e.target.closest("[data-lang]"); if (b) setLang(b.dataset.lang); });

// ---------------- screens ----------------
function render() {
  stopVoice();
  if (params.has("admin")) return renderAdmin();
  if (S.screen === "q" && S.tool) return renderQuestion();
  if (S.screen === "thanks") return renderThanks();
  return renderStart();
}

const ICON_SAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const ICON_MIC = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const supportBox = () => `<div class="support" role="note"><b>${tx(UI.supportTitle)}</b><span>${tx(UI.supportText)}</span></div>`;

function renderStart() {
  const d = load(DRAFT, null);
  const preset = params.get("t");
  if (!S.tool && preset && TOOLS[preset]) S.tool = TOOLS[preset];
  const forms = [["youth", UI.pickYouth], ["parent", UI.pickParent], ["public", UI.pickPublic]];
  app.innerHTML = `<section class="screen">
    <div class="panel stack">
      <h1>${tx(UI.startTitle)}</h1>
      <p class="small">${tx(UI.startLead)}</p>
    </div>
    ${d && TOOLS[d.tool] ? `<div class="panel stack"><p>${tx(UI.resume)} <b>${tx(TOOLS[d.tool].title)}</b></p>
      <div class="row"><button class="btn" id="resumeYes">${tx(UI.resumeYes)}</button><button class="ghost" id="resumeNo">${tx(UI.resumeNo)}</button></div></div>` : ""}
    <div class="panel stack">
      <h3>${tx(UI.stepLang)}</h3>
      <div class="langs" role="group">${LANGS.map(l => `<button type="button" data-lang="${l.code}" lang="${l.code}" aria-pressed="${l.code === S.lang}">${esc(l.name)}</button>`).join("")}</div>
    </div>
    <div class="panel stack">
      <h3>${tx(UI.stepForm)}</h3>
      <div class="forms">${forms.map(([k, sub], i) => `<button type="button" class="form" data-form="${k}" aria-pressed="${S.tool?.key === k}" style="--c:var(${STAGE_COLORS[i + 1]})">
        <b>${tx(TOOLS[k].title)}</b><span class="small">${tx(sub)}</span></button>`).join("")}</div>
    </div>
    <div class="panel stack">
      <h3>${tx(UI.stepStart)}</h3>
      ${S.tool ? `<p class="small">${tx(S.tool.intro)}</p>` : ""}
      <p class="notice">${tx(UI.privacy)}</p>
      ${UI.draftNote[S.lang] ? `<p class="small muted">${tx(UI.draftNote)}</p>` : ""}
      <label class="check"><input type="checkbox" id="consent" ${S.consent ? "checked" : ""}><span>${tx(UI.consent)}</span></label>
    </div>
    <div class="row"><button class="big" id="startBtn" ${S.tool && S.consent ? "" : "disabled"}>${tx(UI.start)} →</button>
      <span class="small muted" id="startHint">${S.tool ? "" : tx(UI.pickFormFirst)}</span></div>
  </section>`;
  app.querySelectorAll("[data-form]").forEach(b => b.onclick = () => { S.tool = TOOLS[b.dataset.form]; renderStart(); });
  $("#consent").onchange = e => { S.consent = e.target.checked; $("#startBtn").disabled = !(S.tool && S.consent); };
  $("#startBtn").onclick = () => {
    Object.assign(S, { A: {}, P: {}, V: {}, flag: false, sid: newSid(), started: new Date().toISOString() });
    S.pos = firstVisible(0);
    clearDraft(); go("q"); saveDraft();
  };
  if ($("#resumeYes")) {
    $("#resumeYes").onclick = () => {
      Object.assign(S, { tool: TOOLS[d.tool], pos: d.pos || 0, A: d.A || {}, P: d.P || {}, V: d.V || {}, flag: !!d.flag, sid: d.sid || newSid(), started: d.started || new Date().toISOString(), source: d.source || S.source, screen: "q" });
      setLang(d.lang || S.lang);
    };
    $("#resumeNo").onclick = () => { clearDraft(); renderStart(); };
  }
}

function firstVisible(from) { const f = flat(); for (let i = from; i < f.length; i++) if (visible(f[i].q)) return i; return f.length; }
function prevVisible(from) { const f = flat(); for (let i = from; i >= 0; i--) if (visible(f[i].q)) return i; return -1; }

function renderQuestion() {
  const f = flat();
  if (S.pos >= f.length) return submit();
  const { q, si } = f[S.pos];
  const sec = S.tool.sections[si];
  const vis = f.filter(x => visible(x.q));
  const num = vis.findIndex(x => x.q === q) + 1;
  const firstInSec = f.findIndex(x => x.si === si && visible(x.q)) === S.pos;
  const req = q.required ? `<span class="req" title="${tx(UI.required)}">*</span>` : "";
  const p = S.P[q.id];
  app.innerHTML = `<section class="screen">
    <div class="progress" aria-hidden="true">
      <div class="stages">${S.tool.sections.map((s, i) => `<span class="${i === si ? "on" : i < si ? "done" : ""}" style="--c:var(${STAGE_COLORS[i % STAGE_COLORS.length]})">${tx(s.title)}</span>`).join("")}</div>
      <div class="bar"><i style="width:${Math.round(((num - 1) / vis.length) * 100)}%"></i></div>
    </div>
    <div id="supportSlot">${S.flag ? supportBox() : ""}</div>
    <article class="card" data-q="${q.id}" style="--c:var(${STAGE_COLORS[si % STAGE_COLORS.length]})">
      <div class="qstage">${tx(sec.title)} · ${tx(UI.qOf, { i: num, n: vis.length })}</div>
      ${firstInSec && sec.note ? `<p class="notice">${tx(sec.note)}</p>` : ""}
      <h2 class="qtext" id="qtext" lang="${S.lang}">${tx(q.label)}${req}</h2>
      ${q.hint ? `<p class="example">${tx(q.hint)}</p>` : ""}
      ${answerHTML(q)}
      <div id="fuSlot">${p ? followupHTML(q, p) : ""}</div>
      <p class="hint" id="err" aria-live="polite"></p>
      <div class="controls">
        <button type="button" class="btn" id="back">← ${tx(UI.back)}</button>
        <div class="row">
          ${canSpeak ? `<button type="button" class="btn say" id="say" aria-label="${tx(UI.listen)}">${ICON_SAY}<span>${tx(UI.listen)}</span></button>` : ""}
          <button type="button" class="big" id="next">${tx(isLast() ? UI.submit : UI.next)} →</button>
        </div>
      </div>
    </article>
  </section>`;
  wireAnswer(q);
  $("#back").onclick = onBack;
  $("#next").onclick = onNext;
  if ($("#say")) $("#say").onclick = () => onSay($("#say"), q, !!S.P[q.id]);
  app.querySelectorAll("textarea.grow").forEach(autoGrow);
  const focusEl = $("#pa_" + q.id) || $("#f_" + q.id);
  if (focusEl && !isMobile && textTypes.has(q.type)) focusEl.focus({ preventScroll: true });
}

function isLast() { const f = flat(); for (let i = S.pos + 1; i < f.length; i++) if (visible(f[i].q)) return false; return true; }

function answerHTML(q) {
  const v = S.A[q.id];
  if (q.type === "choice" || q.type === "multi") {
    const sel = q.type === "multi" ? (v || []) : [v];
    return `${q.type === "multi" ? `<p class="small muted">${tx(UI.chooseMany)}</p>` : ""}
      <div class="opts" role="group" aria-labelledby="qtext">${q.options.map(o => `<button type="button" class="opt" data-v="${esc(o.v)}" aria-pressed="${sel.includes(o.v)}">${tx(o)}</button>`).join("")}</div>`;
  }
  if (q.type === "dropdown") {
    return `<select id="f_${q.id}" aria-labelledby="qtext"><option value="">${tx(UI.choose)}…</option>
      ${q.options.map(o => `<option value="${esc(o.v)}"${v === o.v ? " selected" : ""}>${tx(o)}</option>`).join("")}
      ${q.other ? `<option value="__other"${v === "__other" ? " selected" : ""}>${tx(UI.other).replace(/:$/, "")}</option>` : ""}</select>
      ${q.other ? `<input type="text" id="o_${q.id}" maxlength="200" placeholder="${tx(UI.yourAnswer)}" value="${esc(S.A[q.id + "_other"])}" ${v === "__other" ? "" : "hidden"}>` : ""}`;
  }
  if (q.type === "number") return `<input type="number" id="f_${q.id}" inputmode="numeric" min="${q.min}" max="${q.max}" value="${esc(v)}" placeholder="${tx(UI.yourAnswer)}" aria-labelledby="qtext">`;
  const noMic = /district/.test(q.id);
  return textBox(`f_${q.id}`, v, q.type === "para" ? 3 : 1, UI.yourAnswer, noMic);
}

function textBox(id, value, rows, ph, noMic = false) {
  const field = `<textarea id="${id}" rows="${rows}" class="${rows === 1 ? "grow" : ""}" maxlength="3000" placeholder="${tx(ph)}" aria-labelledby="qtext">${esc(value)}</textarea>`;
  if (!canListen || noMic) return `<div class="type solo">${field}</div>`;
  return `<div class="type">${field}<button type="button" class="mic" data-mic="${id}" aria-label="${tx(UI.micStart)}" title="${tx(UI.micStart)}">${ICON_MIC}</button></div>
    <p class="stxt" id="m_${id}" hidden></p>`;
}

function followupHTML(q, p) {
  const lead = { empty: UI.probeEmpty, nonanswer: UI.probeShort, short: UI.probeShort, vague: UI.probeVague, unclear: UI.probeUnclear }[p.reason] || UI.probeShort;
  return `<div class="followup">
    <p class="fu"><span class="small">${tx(lead)}</span><br>${tx(q.probe.ask)}</p>
    ${textBox(`pa_${q.id}`, p.answer, 1, UI.moreHere)}
    <p class="small muted">${tx(UI.probeSkipNote)}</p></div>`;
}

function wireAnswer(q) {
  const changed = () => { $("#err").textContent = ""; saveDraft(); };
  if (q.type === "choice" || q.type === "multi") {
    const btns = [...app.querySelectorAll(".opt")];
    btns.forEach(b => b.onclick = () => {
      if (q.type === "choice") {
        btns.forEach(x => x.setAttribute("aria-pressed", x === b));
        S.A[q.id] = b.dataset.v; changed();
        // One tap answers a single-choice question; move on after a short pause so the choice is visible.
        clearTimeout(wireAnswer.auto);
        wireAnswer.auto = setTimeout(() => { if (S.screen === "q" && flat()[S.pos]?.q === q) onNext(); }, 380);
      } else {
        const on = b.getAttribute("aria-pressed") !== "true";
        if (on && q.exclusive?.includes(b.dataset.v)) btns.forEach(x => x.setAttribute("aria-pressed", "false"));
        else if (on && q.exclusive) btns.forEach(x => { if (q.exclusive.includes(x.dataset.v)) x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", on);
        S.A[q.id] = btns.filter(x => x.getAttribute("aria-pressed") === "true").map(x => x.dataset.v); changed();
      }
    });
    return;
  }
  const f = $(`#f_${q.id}`);
  if (q.type === "dropdown") {
    const o = $(`#o_${q.id}`);
    f.onchange = () => { S.A[q.id] = f.value; if (o) { o.hidden = f.value !== "__other"; if (!o.hidden) o.focus(); } changed(); };
    if (o) o.oninput = () => { S.A[q.id + "_other"] = o.value; saveDraft(); };
    return;
  }
  f.oninput = () => { S.A[q.id] = f.value; changed(); };
  f.onblur = () => checkDistress(f.value);
  wireFollowup(q);
}

function wireFollowup(q) {
  const pa = $(`#pa_${q.id}`);
  if (!pa) return;
  pa.oninput = () => { S.P[q.id].answer = pa.value; saveDraft(); };
  pa.onblur = () => checkDistress(pa.value);
}

function checkDistress(text) {
  if (!S.flag && isDistress(text)) {
    S.flag = true; saveDraft();
    const slot = $("#supportSlot");
    if (slot) { slot.innerHTML = supportBox(); slot.scrollIntoView({ behavior: "smooth", block: "start" }); }
  }
}

function isEmpty(q) {
  const v = S.A[q.id];
  if (q.type === "multi") return !v || !v.length;
  if (v === "__other") return !String(S.A[q.id + "_other"] || "").trim();
  return v === undefined || v === null || String(v).trim() === "";
}

function onNext() {
  stopVoice();
  clearTimeout(wireAnswer.auto);
  const q = flat()[S.pos].q;
  const err = msg => { $("#err").textContent = msg; $("#err").scrollIntoView({ behavior: "smooth", block: "center" }); };
  if (q.required && isEmpty(q)) return err(t(UI.requiredError, S.lang));
  if (q.type === "number" && !isEmpty(q)) {
    const n = Number(S.A[q.id]);
    if (!Number.isFinite(n) || n < q.min || n > q.max) return err(t(UI.numberError, S.lang, { min: q.min, max: q.max }));
  }
  // Follow-up: asked once, the first time Next is pressed with a weak short answer.
  if (q.probe && !S.P[q.id]) {
    const reason = assess(S.A[q.id], q.probe);
    if (reason) {
      S.P[q.id] = { reason, answer: "" };
      saveDraft();
      $("#fuSlot").innerHTML = followupHTML(q, S.P[q.id]);
      wireFollowup(q);
      $("#fuSlot").querySelectorAll("textarea.grow").forEach(autoGrow);
      $("#fuSlot").scrollIntoView({ behavior: "smooth", block: "center" });
      if (!isMobile) $(`#pa_${q.id}`).focus({ preventScroll: true });
      return;
    }
  }
  S.pos = firstVisible(S.pos + 1);
  if (S.pos >= flat().length) return submit();
  saveDraft(); render(); scrollTo(0, 0);
}

function onBack() {
  const p = prevVisible(S.pos - 1);
  if (p < 0) { saveDraft(); return go("start"); }
  S.pos = p; saveDraft(); render(); scrollTo(0, 0);
}

// ---------------- optional speech: 🔊 read a question, 🎤 speak an answer ----------------
function sayText(q, followup) {
  if (followup) return t(q.probe.ask, S.lang);
  let s = t(q.label, S.lang).replace(/\s*\(.*?\)\s*$/, "");
  if (q.hint) s += ". " + t(q.hint, S.lang);
  if (q.options && (q.type !== "dropdown" || q.options.length <= 12)) s += ". " + q.options.map(o => t(o, S.lang)).join(", ");
  return s;
}

let saying = null;
// 🔊 plays the pre-made audio (Swara / Aarohi / Neerja, made by the Publish button) when there is one for this
// question and language; otherwise the phone's own voice reads it.
const player = new Audio();
function stopAudio() { try { player.pause(); player.currentTime = 0; } catch {} }
function playFile(url) {
  return new Promise(resolve => {
    stopAudio();
    player.src = url;
    player.onended = () => resolve(true);
    player.onerror = () => resolve(false);
    player.onpause = () => resolve(true);
    player.play().catch(() => resolve(false));
  });
}

async function onSay(btn, q, followup) {
  stopMic();
  if (saying) { stopSpeaking(); stopAudio(); saying.classList.remove("on"); const was = saying; saying = null; if (was === btn) return; }
  unlockSpeech();
  saying = btn; btn.classList.add("on");
  const file = CONTENT.audio?.[S.lang]?.[`${S.tool.key}/${q.id}/${followup ? "f" : "q"}`];
  if (file && await playFile(file)) { btn.classList.remove("on"); if (saying === btn) saying = null; return; }
  if (saying !== btn) return;
  await loadVoices();
  const voice = pickVoice(speechLang());
  const r = await speak(sayText(q, followup), { voice, lang: speechLang(), rate: S.lang === "en" ? 1 : 0.95 });
  btn.classList.remove("on");
  if (saying === btn) saying = null;
  if (!r.ok && !voice && $("#err")) $("#err").textContent = t(UI.noVoice, S.lang);
}

let mic = null; // { btn, field, handle }
function stopMic() { if (mic) mic.handle.cancel(); }
function stopVoice() { stopMic(); if (saying) { stopSpeaking(); stopAudio(); saying.classList.remove("on"); saying = null; } }

function onMic(btn) {
  if (mic) { const same = mic.btn === btn; stopMic(); if (same) return; }
  if (saying) { stopSpeaking(); stopAudio(); saying.classList.remove("on"); saying = null; }
  const field = document.getElementById(btn.dataset.mic);
  const msg = document.getElementById("m_" + btn.dataset.mic);
  if (speechBlocked) { msg.hidden = false; msg.textContent = t(UI.micBrowser, S.lang, { browser: browserName() }); return; }
  const base = field.value.trim();
  const put = text => { field.value = (base && text ? base + " " : base) + (text || ""); field.dispatchEvent(new Event("input", { bubbles: true })); autoGrow(field); };
  btn.classList.add("listening"); btn.setAttribute("aria-label", t(UI.micStop, S.lang)); btn.title = t(UI.micStop, S.lang);
  msg.hidden = false; msg.textContent = t(UI.micStop, S.lang);
  const dbg = params.has("debug") ? micDebug(msg) : null;
  const handle = listen({ lang: speechLang(), silenceMs: 5000, maxMs: 180000, noSpeechMs: 9000, onInterim: put, onEvent: dbg?.log });
  if (dbg) handle.promise.then(r => dbg.stop(r));
  mic = { btn, field, handle };
  handle.promise.then(r => {
    if (mic && mic.handle === handle) mic = null;
    btn.classList.remove("listening"); btn.setAttribute("aria-label", t(UI.micStart, S.lang)); btn.title = t(UI.micStart, S.lang);
    if (r.text) {
      put(r.text);
      const id = btn.dataset.mic.replace(/^(f|pa)_/, ""), part = btn.dataset.mic.startsWith("pa_") ? "followup" : "answer";
      S.V[id] = S.V[id] && S.V[id] !== part ? "both" : part; saveDraft();
      checkDistress(field.value);
    }
    const errMsg = { "not-allowed": UI.micDenied, network: UI.micNoNet, lang: UI.micNoLang, "no-mic": UI.micNoMic, "start-failed": UI.micDenied }[r.error];
    if (!msg.isConnected) return;
    // The small technical note (error · browser) helps when someone reports a problem.
    msg.textContent = errMsg ? `${t(errMsg, S.lang)} (${r.error} · ${browserName()})` : r.text ? t(UI.micAgain, S.lang) : r.cancelled ? "" : t(UI.micNothing, S.lang);
    msg.hidden = !msg.textContent;
  });
}

// ?debug: show what the browser's speech service is doing, and a live microphone level meter.
function micDebug(msg) {
  const box = document.createElement("pre");
  box.className = "micdebug";
  msg.after(box);
  const steps = [], t0 = Date.now();
  const show = () => { box.textContent = `Browser: ${browserName()} · language ${speechLang()} · online ${navigator.onLine}\nMic level: ${"█".repeat(Math.round(level / 4)) || "·"} (${Math.round(level)})\n` + steps.join("\n"); };
  let level = 0, stream = null, ctx = null, raf = 0, peak = 0;
  navigator.mediaDevices?.getUserMedia({ audio: true }).then(s => {
    stream = s;
    const track = s.getAudioTracks()[0];
    steps.push(`mic device: ${track?.label || "(unknown)"}${track?.muted ? " (MUTED)" : ""}`);
    ctx = new AudioContext(); const an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(s).connect(an);
    const buf = new Uint8Array(an.fftSize);
    const tick = () => { an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); level = m; peak = Math.max(peak, m); show(); raf = requestAnimationFrame(tick); };
    tick();
  }).catch(e => { steps.push("getUserMedia failed: " + e.name); show(); });
  return {
    log: ev => { steps.push(`${((Date.now() - t0) / 1000).toFixed(1)}s  ${ev}`); show(); },
    stop: r => { cancelAnimationFrame(raf); stream?.getTracks().forEach(x => x.stop()); ctx?.close(); steps.push(`DONE → text: "${r.text || ""}"  error: ${r.error || "none"}  loudest mic level: ${Math.round(peak)} (under 5 = no sound reached the browser)`); show(); },
  };
}

function autoGrow(el) { if (el.classList.contains("grow")) { el.style.height = "auto"; el.style.height = el.scrollHeight + 2 + "px"; } }
app.addEventListener("click", e => { const m = e.target.closest("[data-mic]"); if (m) onMic(m); });
app.addEventListener("input", e => { if (e.target.classList?.contains("grow")) autoGrow(e.target); });
// Enter in a one-line answer = Next (Shift+Enter for a new line).
app.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && e.target.classList?.contains("grow")) { e.preventDefault(); onNext(); } });

// ---------------- records ----------------
// Column names are the English question text, so the Sheet reads like the form.
// A question that can get a follow-up has a second column "Fups: <question>" with the follow-up answer.
// "Fups: asked & why" lists which follow-ups were asked and why; "Spoken answers" lists mic answers.
// (session_id must stay the first column: the Sheet script uses it to find and update a response.)
// V2 Sheet columns are tied to stable IDs (row 1 of the Sheet), with the English question as a readable label
// (row 2). Rewording a question in the Questions Sheet only updates its label; it never makes a new column.
// A follow-up answer has its own column "<id>_fup", labelled "Fups: <question>".
const META = [["session_id", "Session ID"], ["form", "Form"], ["language", "Language"], ["source", "Source"], ["submitted_at", "Submitted at"],
  ["duration_sec", "Time taken (sec)"], ["safety_flag", "Safety flag"], ["fups_asked", "Fups: asked & why"], ["spoken", "Spoken answers"]];
function columnPairs(tool) {
  return [...META, ...allItems(tool).flatMap(q => q.probe ? [[q.id, q.label.en], [q.id + "_fup", "Fups: " + q.label.en]] : [[q.id, q.label.en]])];
}
const columns = tool => columnPairs(tool).map(c => c[0]);

function valueOf(q) {
  const v = S.A[q.id];
  const label = code => code === "__other" ? "Other: " + String(S.A[q.id + "_other"] || "").trim() : (q.options.find(o => o.v === code)?.en ?? code);
  if (q.type === "multi") return (v || []).map(label).join("; ");
  if (q.type === "choice" || q.type === "dropdown") return v ? label(v) : "";
  return String(v ?? "").trim();
}

function buildRecord() {
  const now = new Date();
  const shown = allItems(S.tool).filter(visible);
  const row = {
    session_id: S.sid, form: S.tool.key, language: S.lang, source: S.source, submitted_at: now.toISOString(),
    duration_sec: Math.round((now - new Date(S.started)) / 1000), safety_flag: S.flag ? "YES" : "",
    fups_asked: shown.filter(q => S.P[q.id]).map(q => `${q.id}: ${S.P[q.id].reason}`).join("; "),
    spoken: shown.filter(q => S.V[q.id]).map(q => S.V[q.id] === "answer" ? q.id : `${q.id} (${S.V[q.id]})`).join("; "),
  };
  for (const q of allItems(S.tool)) {
    const show = visible(q);
    row[q.id] = show ? valueOf(q) : "";
    if (q.probe) row[q.id + "_fup"] = show && S.P[q.id] ? String(S.P[q.id].answer || "").trim() : "";
  }
  const pairs = columnPairs(S.tool);
  return { sid: S.sid, tool: S.tool.key, cols: pairs.map(c => c[0]), labels: pairs.map(c => c[1]), values: pairs.map(c => row[c[0]] ?? ""),
    content: CONTENT.version, sent: false, saved: now.toISOString() };
}

async function submit() {
  const all = load(STORE, []);
  if (!all.some(r => r.sid === S.sid)) { all.push(buildRecord()); save(STORE, all); }
  clearDraft();
  go("thanks");
  // Spread out a crowd pressing Submit together (e.g. a classroom): wait a random 0–2 s before sending.
  await new Promise(r => setTimeout(r, Math.random() * 2000));
  await syncWaiting();
}

// Sheet lock: only responses submitted after the tabs were created (CUTOFF) and in today's column format
// are sent. Older or old-format responses stay on the device (see ?admin) and never reach the Sheet.
const CUTOFF = "2026-10-16T18:12:00Z";
// The V2 Sheet matches columns by ID, so a response saved before a question change can still be sent.
const sendable = r => r.saved >= CUTOFF && !!TOOLS[r.tool] && Array.isArray(r.labels) && r.cols[0] === "session_id";

// Queue: every response stays on the phone until the Sheet replies "ok". If the Sheet is busy (Google allows
// 30 at the same moment), offline, or errors, the response is retried later with a growing, random delay
// (about 5–10 s, then 15–20 s, … up to ~10 min) so a crowd does not collide again. Sending the same response
// twice is safe: the Sheet updates the row with the same session_id instead of adding a new one.
// A reply starting with "rejected" (before the lock / old columns) is final and is not retried.
const retryDelay = tries => Math.min(600000, 5000 * 2 ** (tries - 1)) + Math.random() * 5000;
let syncing = false, retryTimer = 0;
async function syncWaiting() {
  if (!SHEET_URL || syncing) return;
  if (!navigator.onLine) return scheduleRetry();
  syncing = true;
  clearTimeout(retryTimer);
  try {
    const waiting = load(STORE, []);
    let marked = false;
    for (const r of waiting) if (!r.sent && !r.skipped && !sendable(r)) { r.skipped = true; marked = true; }
    if (marked) save(STORE, waiting);
    for (const r of waiting.filter(r => !r.sent && !r.skipped && !(r.nextTry > Date.now()))) {
      let reply = "";
      try {
        const res = await fetch(SHEET_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ tool: TOOL_NAME, persona: r.tool, columns: r.cols, labels: r.labels, values: r.values }) });
        reply = res.ok ? (await res.text()).trim() : "http " + res.status;
      } catch { reply = "network"; }
      const all = load(STORE, []);
      const x = all.find(y => y.sid === r.sid);
      if (!x) continue;
      if (reply === "ok") { x.sent = true; x.sentAt = new Date().toISOString(); delete x.nextTry; }
      else if (reply.startsWith("rejected")) { x.skipped = true; x.reply = reply; }
      else { x.tries = (x.tries || 0) + 1; x.reply = reply.slice(0, 80); x.nextTry = Date.now() + retryDelay(x.tries); }
      save(STORE, all);
      if (reply === "network") break;   // offline: stop and try the rest later
    }
  } finally { syncing = false; }
  scheduleRetry();
  if (S.screen === "thanks") renderThanks();
}
function scheduleRetry() {
  clearTimeout(retryTimer);
  const due = load(STORE, []).filter(r => !r.sent && !r.skipped).map(r => r.nextTry || Date.now() + 15000);
  if (due.length) retryTimer = setTimeout(syncWaiting, Math.max(1000, Math.min(...due) - Date.now()));
}

function renderThanks() {
  const rec = load(STORE, []).find(r => r.sid === S.sid);
  app.innerHTML = `<section class="screen">
    <div class="panel stack thanks">
      <div class="tick" aria-hidden="true">✓</div>
      <h1>${tx(UI.thanksTitle)}</h1>
      <p>${tx(UI.thanksText)} ${rec?.sent ? tx(UI.thanksSent) : SHEET_URL ? tx(UI.thanksQueued) : ""}</p>
      <p class="small muted">${tx(UI.refCode)}: <span class="code">${esc(S.sid)}</span></p>
      ${S.flag ? supportBox() : ""}
      <div class="row"><button class="big" id="again">${tx(UI.another)}</button><button class="ghost" id="home">${tx(UI.home)}</button></div>
    </div></section>`;
  $("#again").onclick = () => { Object.assign(S, { A: {}, P: {}, V: {}, flag: false, sid: newSid(), started: new Date().toISOString() }); S.pos = firstVisible(0); go("q"); saveDraft(); };
  $("#home").onclick = () => { S.tool = null; S.consent = false; go("start"); };
}

// ---------------- device admin: ?admin ----------------
function csvOf(recs) {
  if (!recs.length) return "";
  const last = recs[recs.length - 1], cols = last.cols, labels = last.labels || last.cols;
  const cell = v => { let s = String(v ?? ""); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + [labels.map(cell).join(","), ...recs.map(r => cols.map(c => cell(r.values[r.cols.indexOf(c)])).join(","))].join("\n");
}
function renderAdmin() {
  const all = load(STORE, []);
  const rows = Object.values(TOOLS).map(tool => {
    const recs = all.filter(r => r.tool === tool.key);
    return `<tr><td>${esc(tool.title.en)}</td><td>${recs.length}</td><td>${recs.filter(r => r.sent).length}</td><td>${recs.filter(r => !r.sent && !r.skipped).length}${recs.some(r => !r.sent && !r.skipped && r.reply) ? ` <span class="small muted">(last: ${esc(recs.filter(r => !r.sent && !r.skipped && r.reply).pop().reply)})</span>` : ""}</td><td>${recs.filter(r => r.skipped).length}</td>
      <td><button class="btn" data-csv="${tool.key}" ${recs.length ? "" : "disabled"}>CSV</button></td></tr>`;
  }).join("");
  app.innerHTML = `<section class="screen">
    <div class="panel stack"><h1>Responses on this device</h1>
      <p class="small">Google Sheet: ${SHEET_URL ? "connected" : "not set up — responses stay on this device until it is"}</p></div>
    <div class="panel stack"><div class="tbl"><table><thead><tr><th>Form</th><th>Saved</th><th>Sent</th><th>Waiting</th><th>Not sent (before lock / old format)</th><th>Download</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="row"><button class="big" id="sync" ${SHEET_URL ? "" : "disabled"}>Send waiting now</button><a class="ghost" href="./">Open the form</a></div></div></section>`;
  app.querySelectorAll("[data-csv]").forEach(b => b.onclick = () => {
    const blob = new Blob([csvOf(all.filter(r => r.tool === b.dataset.csv))], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `1MV_${b.dataset.csv}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  });
  $("#sync").onclick = async () => { await syncWaiting(); renderAdmin(); };
}

// ---------------- start ----------------
$("#ver").textContent = "v " + VERSION;
const qlang = params.get("lang");
S.lang = qlang && LANGS.some(l => l.code === qlang) ? qlang : "en";
applyScript(S.lang);
renderTop();
render();
syncWaiting();
addEventListener("online", syncWaiting);
