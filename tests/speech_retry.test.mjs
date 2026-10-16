// Run: node tests/speech_retry.test.mjs
// A fake speech service checks that a laptop "network" error is retried before the form gives up.
import assert from "node:assert/strict";

let failFirst = 0, starts = 0;
class FakeSR {
  start() {
    starts++;
    const fail = starts <= failFirst;
    setTimeout(() => {
      if (fail) { this.onerror?.({ error: "network" }); this.onend?.(); return; }
      this.onresult?.({ results: [Object.assign([{ transcript: "I want to be a nurse" }], { isFinal: true })] });
      setTimeout(() => this.onend?.(), 10);
    }, 20);
  }
  stop() {} abort() {}
}
globalThis.window = { webkitSpeechRecognition: FakeSR };
Object.defineProperty(globalThis, "navigator", { value: { userAgent: "Mozilla/5.0 Windows Chrome/129.0", onLine: true }, configurable: true });
const { listen, canListen, browserName } = await import("../speech.js");

assert.equal(canListen, true); assert.equal(browserName(), "Chrome");

// 1. Two network errors, then speech: the text still comes through.
failFirst = 2; starts = 0;
let r = await listen({ lang: "en-IN", silenceMs: 200, noSpeechMs: 5000 }).promise;
assert.equal(r.text, "I want to be a nurse"); assert.equal(r.error, undefined);

// 2. The service keeps failing: after 2 retries the form reports "network".
failFirst = 99; starts = 0;
r = await listen({ lang: "en-IN", silenceMs: 200, noSpeechMs: 5000 }).promise;
assert.equal(r.error, "network"); assert.equal(starts, 3);

console.log("ok - speech retry checks passed");
process.exit(0);
