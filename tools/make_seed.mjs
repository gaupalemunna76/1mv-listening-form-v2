// Turns today's published questions (content/questions.json) + screen text (i18n.js) into the starting data for the
// simple Questions Sheet: a Master (English) tab and one translation tab per kind of text.
// Output: seed/questions_seed.json (served on GitHub Pages; the Sheet's "1MV → Set up" reads it).
// Run: node tools/make_seed.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { UI } from "../i18n.js";

const c = JSON.parse(readFileSync(new URL("../content/questions.json", import.meta.url), "utf-8"));
const LANGS = c.languages.filter(l => l.code !== "en");
const VOICE = { en: "en-IN-NeerjaNeural", hi: "hi-IN-SwaraNeural", mr: "mr-IN-AarohiNeural" };
const TYPE = { short: "Short text", para: "Long text", number: "Number", choice: "One choice", multi: "Many choices", dropdown: "Dropdown" };
const EN_NAME = { hi: "Hindi", mr: "Marathi" };   // translation-tab column names (English names of the languages)
const tr = (obj) => Object.fromEntries(LANGS.map(l => [EN_NAME[l.code] || l.code, obj?.[l.code] ?? ""]));
const cond = r => !r ? "" : r.op === "in" ? (r.values.length > 1 ? `${r.q} in ${r.values.join(", ")}` : `${r.q} = ${r.values[0]}`) : `${r.q} not ${r.values.join(", ")}`;

const master = [], T = { Questions: [], Examples: [], "Follow-ups": [], Options: [], "Form text": [], "Screen text": [] };
const sharedStates = [];
for (const [fk, f] of Object.entries(c.forms)) {
  T["Form text"].push({ id: `${fk}.title`, en: f.title.en, ...tr(f.title) }, { id: `${fk}.intro`, en: f.intro.en, ...tr(f.intro) });
  let order = 0;
  for (const s of f.sections) {
    T["Form text"].push({ id: `${fk}.${s.id}.title`, en: s.title.en, ...tr(s.title) });
    if (s.note?.en) T["Form text"].push({ id: `${fk}.${s.id}.note`, en: s.note.en, ...tr(s.note) });
    for (const q of s.items) {
      order++;
      let opts = "";
      if (q.options) {
        const isStates = q.options.length > 30 && q.options.some(o => o.v === "bihar");
        if (isStates) {
          opts = "@states";
          if (!sharedStates.length) q.options.forEach(o => sharedStates.push(o));
        } else {
          opts = q.options.map(o => `${o.v}: ${o.en}`).join(" | ");
          q.options.forEach(o => T.Options.push({ id: `${q.id}.${o.v}`, en: o.en, ...tr(o) }));
        }
      }
      master.push({
        "Form": fk, "ID": q.id, "Section": s.id, "Order": order, "Answer type": TYPE[q.type], "Required?": q.required ? "Yes" : "",
        "Show only if": cond(q.showIf), "Question (English)": q.label.en, "Example (English)": q.hint?.en ?? "",
        "Options (English)  code: label | code: label": opts, "Unticks the others": (q.exclusive || []).join(", "), "Other box?": q.other ? "Yes" : "",
        "Number min": q.min ?? "", "Number max": q.max ?? "",
        "Ask follow-up?": q.probe ? "Yes" : "", "Follow-up if fewer than (words)": q.probe?.minWords ?? "",
        "Follow-up question (English)": q.probe?.ask?.en ?? "",
        "Also accept as a full answer": q.probe?.allowNoOne ? "no one" : q.probe?.allowChoice ? "child's choice" : "",
      });
      T.Questions.push({ id: q.id, en: q.label.en, ...tr(q.label) });
      if (q.hint?.en) T.Examples.push({ id: q.id, en: q.hint.en, ...tr(q.hint) });
      if (q.probe) T["Follow-ups"].push({ id: q.id, en: q.probe.ask.en, ...tr(q.probe.ask) });
    }
  }
}
sharedStates.forEach(o => T.Options.push({ id: `@states.${o.v}`, en: o.en, ...tr(o) }));
for (const [k, v] of Object.entries(UI)) if (v.en) T["Screen text"].push({ id: k, en: v.en, ...tr(v) });

const languages = c.languages.map(l => ({ Language: l.code === "en" ? "English" : EN_NAME[l.code] || l.code, Code: l.code, "Name shown in form": l.name,
  Voice: VOICE[l.code] || l.voice || "", "Font (optional)": "", "On?": "Yes" }));
// Answer words: given by each language's team. Comma-separated; matched inside the answer.
const NOANS = "No-answer words (yes, ok, don't know…)", NOONE = "'No one' words", CHOICE = "'Child's choice' words", SAFE = "Safety words (self-harm)";
const answer_words = [
  { Language: "English",
    [NOANS]: "yes, yess, yes yes, yeah, ya, yep, no, nope, ok, okay, k, fine, same, as above, nothing, none, nil, na, n a, dont know, do not know, i dont know, idk, no idea, not sure, maybe, good, nice, correct, right, all right, alright",
    [NOONE]: "no one, noone, nobody, not anyone, myself, nothing this week",
    [CHOICE]: "whatever my child, whatever the child, child chooses, his choice, her choice, their choice",
    [SAFE]: "suicid, kill myself, kill my self, end my life, end this life, want to die, self harm, selfharm, no reason to live" },
  { Language: "Hindi",
    [NOANS]: "haan, han, ha, haa, ji, ji haan, nahi, nahin, nai, pata nahi, pata nhi, malum nahi, maloom nahi, kuch nahi, kuchh nahin, theek, thik, theek hai, thik hai, sahi, achha, accha, हाँ, हां, जी, जी हाँ, नहीं, ना, पता नहीं, मालूम नहीं, कुछ नहीं, ठीक, ठीक है, सही, अच्छा",
    [NOONE]: "kisi se nahi, koi nahi, किसी से नहीं, कोई नहीं, खुद से, इस हफ़्ते कुछ नहीं",
    [CHOICE]: "jo bachcha chahe, jo baccha chahe, jo bachcha chune, जो बच्चा, बच्चा खुद चुने, उसकी मर्ज़ी",
    [SAFE]: "aatmhatya, atmhatya, khudkushi, marna chahta, marna chahti, jeena nahi chahta, jeena nahi chahti, आत्महत्या, ख़ुदकुशी, खुदकुशी, मरना चाहता, मरना चाहती, जीना नहीं चाहता, जीना नहीं चाहती" },
  { Language: "Marathi",
    [NOANS]: "हो, होय, नाही, माहीत नाही, माहिती नाही, काही नाही, काहीच नाही, ठीक आहे, बरं, बरोबर, चांगले, चांगलं, हो हो",
    [NOONE]: "कोणालाच नाही, कोणालाही नाही, कोणी नाही, कोणीच नाही, स्वतःच, या आठवड्यात काही नाही",
    [CHOICE]: "मूल स्वतः ठरवेल, त्याला हवे ते, तिला हवे ते, मुलाला हवे ते, त्याची इच्छा, तिची इच्छा",
    [SAFE]: "आत्महत्या, मरायचे आहे, मरायचं आहे, जगायचे नाही, जगायचं नाही, जीव द्यायचा" },
];

mkdirSync(new URL("../seed/", import.meta.url), { recursive: true });
const seed = { made: new Date().toISOString(), languages, master, translations: T, answer_words };
writeFileSync(new URL("../seed/questions_seed.json", import.meta.url), JSON.stringify(seed, null, 1));
console.log("master rows", master.length, Object.fromEntries(Object.entries(T).map(([k, v]) => [k, v.length])));
