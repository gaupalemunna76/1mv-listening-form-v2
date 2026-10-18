// Questions, options, languages, screen text and answer-check words come from content/questions.json,
// which the Publish button builds from the "Questions (source)" Google Sheet (tools/build_questions.py).

const CACHE = "lf2.content";

// Load the published questions. If the network fails (e.g. offline on a later visit), use the last copy this
// phone saw, so an unfinished form can still be completed.
export async function loadContent(version) {
  try {
    const res = await fetch(`content/questions.json?v=${encodeURIComponent(version || Date.now())}`, { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const c = await res.json();
    try { localStorage.setItem(CACHE, JSON.stringify(c)); } catch {}
    return c;
  } catch (e) {
    try { const c = JSON.parse(localStorage.getItem(CACHE)); if (c) return c; } catch {}
    throw e;
  }
}

// A show_if rule from the Sheet ({ q, op: "in"|"notin", values }) becomes a function of the answers so far.
// "notin" also needs the question to be answered (e.g. "P7_visits != 0" is false until P7 is answered).
export function condition(rule) {
  if (!rule) return undefined;
  return answers => {
    const a = answers[rule.q];
    const has = a !== undefined && a !== null && a !== "" && !(Array.isArray(a) && !a.length);
    const vals = Array.isArray(a) ? a : [a];
    const hit = vals.some(v => rule.values.includes(String(v)));
    return rule.op === "in" ? hit : has && !hit;
  };
}

// Same shape the form already uses: { youth: { key, title, intro, sections: [{ id, title, note, items }] }, … }
export function toTools(content) {
  const tools = {};
  for (const [key, f] of Object.entries(content.forms)) {
    tools[key] = {
      key, title: f.title, intro: f.intro,
      sections: f.sections.map(s => ({
        id: s.id, title: s.title, note: s.note && Object.keys(s.note).length ? s.note : undefined,
        items: s.items.map(q => ({ ...q, showIf: condition(q.showIf) })),
      })),
    };
  }
  return tools;
}
