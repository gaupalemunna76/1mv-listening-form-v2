// Optional speech features, using what the browser provides for free:
//  - read a question aloud (speechSynthesis, all modern browsers)
//  - speech to text in an answer box (SpeechRecognition: Chrome, Edge, Safari, Android Chrome; not Firefox).
// Taken from the Youth Voice tool (github.com/gaupalemunna76/youth-voice), including its phone fixes.
// Every call has a timeout so the form can never get stuck waiting on the browser.

const synth = window.speechSynthesis;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canSpeak = !!synth;
// Brave and Opera expose the speech API but their speech service always fails with "network".
// The mic still shows there; tapping it explains that speaking needs Chrome or Edge.
export const speechBlocked = !!(navigator.brave) || /OPR\/|Opera/.test(navigator.userAgent || "");
export const canListen = !!SR;
export function browserName() {
  const ua = navigator.userAgent || "";
  return navigator.brave ? "Brave" : /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet"
    : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "this browser";
}

let voices = [];
export function loadVoices() {
  return new Promise(res => {
    if (!synth) return res([]);
    const done = () => { voices = synth.getVoices(); res(voices); };
    voices = synth.getVoices();
    if (voices.length) return res(voices);
    synth.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 2500);
  });
}

export function voicesFor(lang) {
  const base = lang.split("-")[0];
  return voices.filter(v => v.lang.replace("_", "-").toLowerCase().startsWith(base));
}

export function pickVoice(lang) {
  const list = voicesFor(lang);
  const rank = v => {
    let s = 0;
    if (/natural/i.test(v.name)) s += 100;
    if (/microsoft/i.test(v.name)) s += 20;
    if (v.lang.replace("_", "-").toLowerCase() === lang.toLowerCase()) s += 50;
    if (/neerja|swara|aarav|madhur|prabhat/i.test(v.name)) s += 10;
    return s;
  };
  return list.sort((a, b) => rank(b) - rank(a))[0] || null;
}

let speakToken = 0;
export function stopSpeaking() { speakToken++; try { synth && (synth.speaking || synth.pending) && synth.cancel(); } catch {} }

// Phones only allow speech that starts inside a tap. Call this synchronously from a click handler
// (Start, Repeat, mic) so later questions can be read aloud without another tap.
export function unlockSpeech() {
  if (!synth) return;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    synth.speak(u);
  } catch {}
}

// Resolves { ok: true } when spoken, { ok: false } if the browser never started speaking.
export function speak(text, { voice, rate = 1, lang } = {}) {
  return new Promise(resolve => {
    if (!synth || !text) return resolve({ ok: false });
    stopSpeaking();
    const my = speakToken;
    const u = new SpeechSynthesisUtterance(text);
    if (voice) { u.voice = voice; u.lang = voice.lang; } else if (lang) u.lang = lang;
    u.rate = rate;
    let finished = false, began = false;
    const finish = ok => { if (finished) return; finished = true; clearTimeout(dog); clearTimeout(startDog); clearInterval(keep); resolve({ ok }); };
    u.onstart = () => { began = true; };
    u.onend = () => finish(true);
    u.onerror = e => finish(began && e.error === "interrupted");
    // If speech never starts (blocked, muted engine, no voice), move on instead of waiting.
    const startDog = setTimeout(() => { if (!began && !synth.speaking) { try { synth.cancel(); } catch {} finish(false); } }, 4000);
    // Some voices never fire onend. Allow ~85 ms per character at rate 1, plus slack.
    const dog = setTimeout(() => finish(began), Math.max(5000, (text.length * 85) / rate + 4000));
    // Desktop Chromium can pause long utterances after ~15 s; nudging it on phones breaks speech, so skip there.
    const keep = setInterval(() => { if (my !== speakToken) return finish(began); if (!isMobile && synth.paused) synth.resume(); }, 5000);
    const go = () => { if (my === speakToken) { try { synth.speak(u); } catch { finish(false); } } else finish(false); };
    if (isMobile) go(); else setTimeout(go, 60);
  });
}

// Phones (Android Chrome/Edge) behave differently from desktop Edge:
//  - each result is the WHOLE phrase so far ("I", "I can", "I can create"), not a new piece, and
//  - every start of the microphone plays a system beep.
// So on phones we listen in one-shot mode and never silently restart after speech.
export const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");

const norm = s => s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}' ]/gu, " ").replace(/\s+/g, " ").trim();

// Join transcript pieces without repeating text that a later piece already contains.
// cumulative=true: pieces are successive guesses of the SAME speech (phones), so a piece that
// re-says the tail with corrections replaces that tail instead of being added again.
export function mergeText(parts, cumulative = false) {
  let out = "";
  for (const raw of parts) {
    const p = (raw || "").trim();
    if (!p) continue;
    const a = norm(out), b = norm(p);
    if (!a) { out = p; continue; }
    if (b.startsWith(a)) { out = p; continue; }     // longer guess of the same words: replace
    if (a.includes(b)) continue;                     // already have it
    const aw = a.split(" "), bw = b.split(" ");
    if (cumulative && bw.length >= 2) {
      // Corrected guess: find where this piece's opening words last appear and replace from there.
      let j = -1;
      for (let i = aw.length - 2; i >= 0; i--) if (aw[i] === bw[0] && aw[i + 1] === bw[1]) { j = i; break; }
      if (j >= 0) { out = (j ? out.split(/\s+/).slice(0, j).join(" ") + " " : "") + p; continue; }
      if (aw[0] === bw[0]) { out = bw.length >= aw.length * 0.6 ? p : out; continue; }
    }
    // Overlap: end of what we have == start of the new piece.
    let k = Math.min(aw.length, bw.length);
    for (; k > 0; k--) if (aw.slice(-k).join(" ") === bw.slice(0, k).join(" ")) break;
    out = k > 0 ? out + " " + p.split(/\s+/).slice(k).join(" ") : out + " " + p;
  }
  return collapseRepeats(out.replace(/\s+/g, " ").trim());
}

// Phones send each guess as the whole phrase so far. If so, the newest guess is the answer.
export function latestGuess(list) {
  const t = list.map(x => (x || "").trim()).filter(Boolean);
  if (!t.length) return "";
  if (t.length === 1) return collapseRepeats(t[0]);
  const first = norm(t[0]).split(" ")[0];
  const looksCumulative = t.slice(1).every(x => norm(x).split(" ")[0] === first);
  return looksCumulative ? collapseRepeats(t[t.length - 1]) : mergeText(t, true);
}

// Safety net: remove a phrase repeated back-to-back ("I can I can create" -> "I can create").
export function collapseRepeats(s) {
  let w = s.split(" ");
  for (let changed = true; changed;) {
    changed = false;
    for (let n = Math.min(8, Math.floor(w.length / 2)); n >= 1; n--) {
      for (let i = 0; i + 2 * n <= w.length; i++) {
        const x = w.slice(i, i + n).join(" ").toLowerCase(), y = w.slice(i + n, i + 2 * n).join(" ").toLowerCase();
        if (x === y) { w.splice(i + n, n); changed = true; break; }
      }
      if (changed) break;
    }
  }
  return w.join(" ");
}

// One listening turn. Resolves with { text } (possibly ""), or { error }.
export function listen({ lang = "en-IN", silenceMs = 2200, maxMs = 60000, noSpeechMs = 9000, onInterim, onEvent } = {}) {
  let cancel = () => {};
  const promise = new Promise(resolve => {
    if (!SR) return resolve({ error: "unsupported" });
    let prior = "", sessionFinal = "", sessionInterim = "";
    let done = false, rec = null, restarts = 0, heard = false, silenceTimer = null, netRetries = 0, netRetryPending = false;
    const started = Date.now();
    const text = () => mergeText([prior, sessionFinal, sessionInterim], isMobile);
    const finish = r => {
      if (done) return; done = true;
      clearTimeout(silenceTimer); clearTimeout(maxTimer); clearTimeout(noSpeechTimer);
      try { rec && (isMobile ? rec.stop() : rec.abort()); } catch {}
      resolve(r);
    };
    const armSilence = () => { clearTimeout(silenceTimer); silenceTimer = setTimeout(() => finish({ text: text() }), silenceMs); };
    const maxTimer = setTimeout(() => finish({ text: text() }), maxMs);
    const noSpeechTimer = setTimeout(() => { if (!heard) finish({ text: "" }); }, noSpeechMs);

    const start = () => {
      sessionFinal = ""; sessionInterim = "";
      rec = new SR();
      rec.lang = lang; rec.continuous = !isMobile; rec.interimResults = true; rec.maxAlternatives = 1;
      // Diagnostics (only used in ?debug): report each step the browser goes through.
      if (onEvent) for (const ev of ["start", "audiostart", "soundstart", "speechstart", "speechend", "soundend", "audioend", "nomatch"]) rec.addEventListener(ev, () => onEvent(ev));
      if (onEvent) { rec.addEventListener("result", () => onEvent("result")); rec.addEventListener("error", e => onEvent("error:" + e.error)); rec.addEventListener("end", () => onEvent("end")); }
      rec.onresult = e => {
        heard = true;
        // Rebuild this session's text from ALL results each time (works for both piecewise and cumulative results).
        const finals = [], interims = [];
        for (let i = 0; i < e.results.length; i++) (e.results[i].isFinal ? finals : interims).push(e.results[i][0].transcript);
        if (isMobile) {
          // Phones: every result is a fresh guess of the whole answer, so keep only the newest one.
          sessionFinal = latestGuess([...finals, ...interims]);
          sessionInterim = "";
        } else {
          sessionFinal = mergeText(finals);
          sessionInterim = interims.length ? interims[interims.length - 1] : "";
        }
        onInterim && onInterim(text());
        if (!isMobile) armSilence();
      };
      rec.onerror = e => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") return finish({ error: "not-allowed" });
        // Laptop browsers sometimes fail to reach the speech service on the first try: retry twice before giving up.
        if (e.error === "network") {
          if (netRetries < 2 && navigator.onLine) { netRetries++; netRetryPending = true; return; }
          return finish({ error: "network", text: text() });
        }
        if (e.error === "language-not-supported") return finish({ error: "lang", text: text() });
        if (e.error === "audio-capture") return finish({ error: "no-mic" });
        // "no-speech" and "aborted" are handled by onend / timers
      };
      rec.onend = () => {
        if (done) return;
        if (netRetryPending) { netRetryPending = false; prior = text(); setTimeout(() => { if (!done) { try { start(); } catch { finish({ error: "network", text: text() }); } } }, 500); return; }
        prior = text(); sessionFinal = ""; sessionInterim = "";
        if (isMobile) {
          // The phone decided the person stopped talking: take the answer (no restart = no extra beep).
          if (heard && prior) return finish({ text: prior });
          if (restarts < 1 && Date.now() - started < noSpeechMs - 1500) { restarts++; try { start(); } catch { finish({ text: "" }); } }
          else finish({ text: "" });
          return;
        }
        // Desktop Edge ends recognition on its own after a pause; keep listening until our own timers decide.
        if (restarts < 15 && Date.now() - started < maxMs) { restarts++; try { start(); } catch { finish({ text: text() }); } }
        else finish({ text: text() });
      };
      try { rec.start(); } catch (e) { finish({ error: "start-failed" }); }
    };
    start();
    cancel = () => finish({ cancelled: true, text: text() });
  });
  return { promise, cancel: () => cancel() };
}
