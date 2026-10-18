// One-time export: turns today's questions.js / i18n.js / states.js / probe rules into the tabs of the
// "Questions (source)" Google Sheet. Output: tools/sheet_seed.json (rows per tab), made into .xlsx by make_seed_xlsx.py.
// Run: node tools/export_to_sheet.mjs
import { writeFileSync } from "node:fs";
import { TOOLS } from "./legacy/questions.js";
import { LANGS, UI } from "../i18n.js";
import { STATES } from "./legacy/states.js";

const L = LANGS.map(l => l.code);                       // en, hi, mr
const VOICE = { en: "en-IN-NeerjaNeural", hi: "hi-IN-SwaraNeural", mr: "mr-IN-AarohiNeural" };
const per = (prefix, obj) => Object.fromEntries(L.map(c => [`${prefix}_${c}`, obj?.[c] ?? ""]));

// Conditions written as plain text the form can read: "<QID> = code", "<QID> != code", "<QID> in code1, code2".
const SHOW_IF = { Y6_class: "Y5 in school, college", Y14_where: "Y14_now in yes, sometimes", Y14_stop: "Y14_now = notyet",
  P8_reason: "P7_visits != 0", P8_notvisit: "P7_visits = 0" };
// Named lists of "general words" that alone don't answer the question.
const VAGUE_NAME = { Y11a_work: "life", Y13_skills: "effort", Y16_onething: "support", P11_change: "school_general",
  G7_learn: "education_general", P15_onething: "help_general" };

const forms = [], sections = [], questions = [], options = [], vague = new Map();
const lists = new Map(); // shared option lists, e.g. @states, @gender
for (const [key, tool] of Object.entries(TOOLS)) {
  forms.push({ form: key, ...per("title", tool.title), ...per("intro", tool.intro) });
  let qn = 0;
  tool.sections.forEach((s, si) => {
    sections.push({ form: key, section: s.id, order: si + 1, ...per("title", s.title), ...per("note", s.note) });
    for (const q of s.items) {
      qn++;
      let listRef = "";
      if (q.options) {
        const sig = JSON.stringify(q.options);
        if (q.options.length === STATES.length && q.options[0].v === STATES[0].v) listRef = "@states";
        else if (q.id.endsWith("_gender")) listRef = "@gender";
        if (listRef) { if (!lists.has(listRef)) lists.set(listRef, q.options); }
        else q.options.forEach((o, i) => options.push({ list: q.id, code: o.v, order: i + 1, ...per("label", o) }));
      }
      let vagueRef = "";
      if (q.probe?.vague) {
        const sig = JSON.stringify([...q.probe.vague].sort());
        for (const [name, w] of vague) if (JSON.stringify([...w].sort()) === sig) vagueRef = name;
        if (!vagueRef) { vagueRef = VAGUE_NAME[q.id] || q.id.toLowerCase(); vague.set(vagueRef, q.probe.vague); }
      }
      questions.push({
        form: key, id: q.id, order: qn, section: s.id, type: q.type, required: q.required ? "yes" : "",
        show_if: SHOW_IF[q.id] || "", options: q.options ? (listRef || q.id) : "",
        number_min: q.min ?? "", number_max: q.max ?? "", exclusive: (q.exclusive || []).join(", "), other_box: q.other ? "yes" : "",
        followup: q.probe ? "yes" : "", followup_min_words: q.probe?.minWords ?? "", followup_general_words: vagueRef,
        followup_accepts: q.probe?.allowNoOne ? "no one" : q.probe?.allowChoice ? "child's choice" : "",
        ...Object.fromEntries(L.flatMap(c => [[`question_${c}`, q.label?.[c] ?? ""], [`example_${c}`, q.hint?.[c] ?? ""], [`followup_${c}`, q.probe?.ask?.[c] ?? ""]])),
      });
    }
  });
}
for (const [name, opts] of lists) opts.forEach((o, i) => options.push({ list: name, code: o.v, order: i + 1, ...per("label", o) }));

const ui = Object.entries(UI).map(([k, v]) => ({ key: k, ...Object.fromEntries(L.map(c => [c, v[c] ?? ""])) }));
const languages = LANGS.map(l => ({ code: l.code, name: l.name, speech_code: l.speech, voice: VOICE[l.code], enabled: "yes" }));
const general_words = [...vague].map(([name, words]) => ({ list: name, words: words.join(", ") }));

// Answer-check word lists (phrases are matched inside the answer; one list per row, any language, comma-separated).
const answer_checks = [
  { check: "non_answer", meaning: "The whole answer is only this → ask the follow-up",
    words: "yes, yess, yes yes, yeah, ya, yep, no, nope, ok, okay, k, fine, same, as above, nothing, none, nil, na, n a, dont know, do not know, i dont know, idk, no idea, not sure, maybe, good, nice, correct, right, all right, alright, haan, han, ha, haa, ji, ji haan, nahi, nahin, nai, pata nahi, pata nhi, malum nahi, maloom nahi, kuch nahi, kuchh nahin, theek, thik, theek hai, thik hai, sahi, achha, accha, हाँ, हां, जी, जी हाँ, नहीं, ना, पता नहीं, मालूम नहीं, कुछ नहीं, ठीक, ठीक है, सही, अच्छा, हो, होय, नाही, माहीत नाही, माहिती नाही, काही नाही, काहीच नाही, ठीक आहे, बरं, बरोबर, चांगले, चांगलं, हो हो" },
  { check: "no_one", meaning: "Counts as a real answer where follow-up accepts 'no one'",
    words: "no one, noone, nobody, not anyone, myself, kisi se nahi, koi nahi, किसी से नहीं, कोई नहीं, खुद से, nothing this week, इस हफ़्ते कुछ नहीं, कोणालाच नाही, कोणालाही नाही, कोणी नाही, कोणीच नाही, स्वतःच, या आठवड्यात काही नाही" },
  { check: "childs_choice", meaning: "Counts as a real answer where follow-up accepts \"child's choice\"",
    words: "whatever my child, whatever the child, child chooses, his choice, her choice, their choice, jo bachcha chahe, jo baccha chahe, jo bachcha chune, जो बच्चा, बच्चा खुद चुने, उसकी मर्ज़ी, मूल स्वतः ठरवेल, त्याला हवे ते, तिला हवे ते, मुलाला हवे ते, त्याची इच्छा, तिची इच्छा" },
  { check: "distress", meaning: "Shows the Tele-MANAS helpline and flags the response",
    words: "suicid, kill myself, kill my self, end my life, end this life, want to die, self harm, selfharm, no reason to live, aatmhatya, atmhatya, khudkushi, marna chahta, marna chahti, jeena nahi chahta, jeena nahi chahti, आत्महत्या, ख़ुदकुशी, खुदकुशी, मरना चाहता, मरना चाहती, जीना नहीं चाहता, जीना नहीं चाहती, मरायचे आहे, मरायचं आहे, जगायचे नाही, जगायचं नाही, जीव द्यायचा" },
  { check: "filler", meaning: "Small words ignored when counting real words",
    words: ("a an the and or but to of in on at for with my me i we our you your it is am are be will would should can could want wish hope like some very more much also just so that this there their them they he she his her as by from do give provide get make have take need try become being keep all every dena karna chahiye hona देना करना चाहिए होना aur ya ki ka ke ko se mein me main hum mai hai hain ho tha thi bhi to toh ek koi apna apni apne और या की का के को से में मैं हम है हैं हो था थी भी तो एक कोई अपना अपनी अपने वह ये यह आणि किंवा मी आम्ही माझा माझी माझे आहे आहेत ला ने चा ची चे च्या मध्ये तर पण हे ते ती तो एक काही आपला आपली आपले करणे पाहिजे असावे").split(" ").join(", ") },
];

writeFileSync(new URL("./sheet_seed.json", import.meta.url), JSON.stringify({ languages, forms, sections, questions, options, general_words, answer_checks, ui }, null, 1));
console.log({ forms: forms.length, sections: sections.length, questions: questions.length, options: options.length, general_words: general_words.length, ui: ui.length });
