"""Build content/questions.json from the Questions Sheet, after checking everything.

  python tools/build_questions.py --sheet-id <GOOGLE_SHEET_ID>     (what the Publish button runs)
  python tools/build_questions.py --json tests/out/sheet_tabs.json  (tests: a saved copy of the tabs)

Sheet layout (made by google_sheet/QuestionsSheet.gs → menu 1MV → Set up):
  Languages          Language · Code · Name shown in form · Voice · On?
  Master (English)   one row per question, with all details, in English
  Questions, Examples, Follow-ups, Options, Form text, Screen text
                     ID · English (base) · one column per language (named as in Languages) · Needs update
The Sheet must be viewable by anyone with the link. If anything is wrong the script lists every problem, exits with
an error and writes nothing, so the live form keeps the last good questions.
"""
import argparse, csv, hashlib, io, json, pathlib, re, sys, urllib.parse, urllib.request

sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "content" / "questions.json"
MASTER = "Master (English)"
TR_TABS = ["Questions", "Examples", "Follow-ups", "Options", "Form text", "Screen text"]
TABS = ["Languages", MASTER] + TR_TABS
OPT_COL = "Options (English)  code: label | code: label"
TYPES = {"short text": "short", "long text": "para", "number": "number", "one choice": "choice", "many choices": "multi", "dropdown": "dropdown"}
problems, notes = [], []


def read_sheet(sheet_id):
    """Download the whole Sheet as .xlsx (exact cell values; CSV export can drop numbers in mixed columns)."""
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=xlsx"
    try:
        with urllib.request.urlopen(url, timeout=120) as r:
            data = r.read()
    except Exception as e:
        sys.exit(f"Could not download the Questions Sheet ({e}). Is it shared as 'Anyone with the link: Viewer'?")
    if not data.startswith(b"PK"):
        sys.exit("Could not download the Questions Sheet: Google returned a web page. Share it as 'Anyone with the link: Viewer'.")
    from openpyxl import load_workbook
    wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    cell = lambda v: "" if v is None else str(int(v)) if isinstance(v, float) and v.is_integer() else str(v)
    return {t: [[cell(v) for v in row] for row in wb[t].iter_rows(values_only=True)] if t in wb.sheetnames else [] for t in TABS}


def read_json(path):
    d = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    return {t: d.get(t, []) for t in TABS}


def records(grid, where):
    if not grid:
        problems.append(f"Tab '{where}' is missing or empty"); return [], []
    head = [str(h or "").strip() for h in grid[0]]
    rows = []
    for g in grid[1:]:
        r = {head[i]: ("" if v is None else str(v)).strip() for i, v in enumerate(g) if i < len(head) and head[i]}
        if any(r.values()):
            rows.append(r)
    return head, rows


def yes(v): return str(v).strip().lower() in ("yes", "y", "true", "1", "✓")
def num(v, where):
    if str(v).strip() == "": return None
    try:
        f = float(v); return int(f) if f.is_integer() else f
    except ValueError:
        problems.append(f"{where}: '{v}' should be a number")
def split_list(v): return [w.strip() for w in re.split(r"[,\n]", v or "") if w.strip()]


def parse_options(text):
    out = []
    for part in [p.strip() for p in str(text).split("|") if p.strip()]:
        if ":" in part:
            code, label = part.split(":", 1)
            out.append((code.strip(), label.strip()))
        else:
            out.append((re.sub(r"[^a-z0-9]+", "_", part.lower()).strip("_"), part))
    return out


def parse_condition(text, where, known):
    """'Y5 in school, college' | 'Y14_now = notyet' | 'P7_visits not 0' | 'P7_visits != 0'"""
    m = re.fullmatch(r"\s*([A-Za-z0-9_]+)\s*(=|!=|in|not in|not)\s*(.+?)\s*", text or "")
    if not m:
        problems.append(f"{where}: 'Show only if' = '{text}'. Write it like 'Y5 in school, college' or 'Y14_now = notyet' or 'P7_visits not 0'")
        return None
    q, op, vals = m.group(1), m.group(2), split_list(m.group(3))
    if q not in known:
        problems.append(f"{where}: 'Show only if' uses {q}, which is not an earlier question in this form"); return None
    for v in vals:
        if known[q] is not None and v not in known[q]:
            problems.append(f"{where}: 'Show only if' value '{v}' is not an option code of {q} ({', '.join(sorted(known[q]))})")
    return {"q": q, "op": "in" if op in ("=", "in") else "notin", "values": vals}


def build(tabs):
    _, langs = records(tabs["Languages"], "Languages")
    langs = [l for l in langs if yes(l.get("On?", "yes")) and l.get("Code")]
    if not langs or langs[0].get("Code") != "en":
        problems.append("Languages: English (code en) must be the first row; other languages fall back to it")
    code_of = {l["Language"]: l["Code"] for l in langs}            # "Hindi" → "hi"
    other = [l for l in langs if l["Code"] != "en"]

    # translation tabs: id → {lang code: text}, plus English base and needs-update marks
    T = {}
    for tab in TR_TABS:
        head, rows = records(tabs[tab], tab)
        for name in code_of:
            if name != "English" and head and name not in head:
                problems.append(f"Tab '{tab}': column '{name}' is missing (Languages says it is on)")
        T[tab] = {}
        for r in rows:
            d = {"en": r.get("English (base)", "")}
            for l in other:
                if r.get(l["Language"]): d[l["Code"]] = r[l["Language"]]
            T[tab][r.get("ID", "")] = d
            if r.get("Needs update"):
                notes.append(f"{tab} {r.get('ID')}: still marked 'Needs update' for {r['Needs update']} (old translation used)")

    def text(tab, key, en, where, required=True):
        d = {"en": en} if en else {}
        d.update({k: v for k, v in T[tab].get(key, {}).items() if k != "en"})
        if required and not d.get("en"):
            problems.append(f"{where}: English text is empty")
        miss = [l["Language"] for l in other if d.get("en") and not d.get(l["Code"])]
        if miss:
            notes.append(f"{where}: not yet in {', '.join(miss)} (English will show)")
        return d

    head, master = records(tabs[MASTER], MASTER)
    for col in ("Form", "ID", "Section", "Order", "Answer type", "Question (English)"):
        if head and col not in head:
            problems.append(f"{MASTER}: column '{col}' is missing")
    forms, known, secs = {}, {}, {}
    for r in sorted(master, key=lambda r: (r.get("Form", ""), num(r.get("Order", ""), "Order") or 0)):
        fk, qid = r.get("Form", ""), r.get("ID", "")
        where = f"{MASTER} {fk}/{qid or '(no ID)'}"
        if not fk:
            problems.append(f"{where}: Form is empty"); continue
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", qid):
            problems.append(f"{where}: ID must be letters, numbers and _ only"); continue
        typ = TYPES.get(r.get("Answer type", "").lower())
        if not typ:
            problems.append(f"{where}: Answer type '{r.get('Answer type')}' must be one of: Short text, Long text, Number, One choice, Many choices, Dropdown"); continue
        if fk not in forms:
            forms[fk] = {"key": fk, "title": text("Form text", f"{fk}.title", T["Form text"].get(f"{fk}.title", {}).get("en", ""), f"Form text {fk}.title"),
                         "intro": text("Form text", f"{fk}.intro", T["Form text"].get(f"{fk}.intro", {}).get("en", ""), f"Form text {fk}.intro"), "sections": []}
        kf = known.setdefault(fk, {})
        if qid in kf:
            problems.append(f"{where}: ID used twice in this form"); continue
        sid = r.get("Section", "")
        if (fk, sid) not in secs:
            base = T["Form text"].get(f"{fk}.{sid}.title", {}).get("en", "")
            note = T["Form text"].get(f"{fk}.{sid}.note", {})
            sec = {"id": sid, "title": text("Form text", f"{fk}.{sid}.title", base, f"Form text {fk}.{sid}.title (section name)"),
                   "note": text("Form text", f"{fk}.{sid}.note", note.get("en", ""), f"Form text {fk}.{sid}.note", required=False) if note.get("en") else {}, "items": []}
            secs[(fk, sid)] = sec; forms[fk]["sections"].append(sec)
        item = {"id": qid, "type": typ, "label": text("Questions", qid, r.get("Question (English)", ""), where)}
        if r.get("Example (English)"):
            item["hint"] = text("Examples", qid, r["Example (English)"], f"{where} example", required=False)
        if yes(r.get("Required?", "")): item["required"] = True
        if typ == "number":
            item["min"], item["max"] = num(r.get("Number min", ""), where), num(r.get("Number max", ""), where)
            if item["min"] is None or item["max"] is None:
                problems.append(f"{where}: a Number question needs 'Number min' and 'Number max'")
        codes = None
        if typ in ("choice", "multi", "dropdown"):
            spec = r.get(OPT_COL, "")
            if spec.startswith("@"):
                lst = [(k.split(".", 1)[1], v) for k, v in T["Options"].items() if k.startswith(spec + ".")]
                pairs = [(c, v["en"]) for c, v in lst]
                key_of = lambda c: f"{spec}.{c}"
            else:
                pairs = parse_options(spec); key_of = lambda c: f"{qid}.{c}"
            if not pairs:
                problems.append(f"{where}: this {r.get('Answer type')} question has no options")
            seen = set()
            item["options"] = []
            for c, label in pairs:
                if c in seen: problems.append(f"{where}: option code '{c}' appears twice")
                seen.add(c)
                o = text("Options", key_of(c), label, f"{where} option {c}")
                item["options"].append({"v": c, **o})
            codes = seen
            ex = split_list(r.get("Unticks the others", ""))
            if ex:
                item["exclusive"] = ex
                for c in ex:
                    if c not in codes: problems.append(f"{where}: 'Unticks the others' code '{c}' is not an option")
            if yes(r.get("Other box?", "")): item["other"] = True
        if r.get("Show only if"):
            cond = parse_condition(r["Show only if"], where, kf)
            if cond: item["showIf"] = cond
        if yes(r.get("Ask follow-up?", "")):
            if typ not in ("short", "para"):
                problems.append(f"{where}: follow-ups work only on Short text / Long text questions")
            pr = {"minWords": num(r.get("Follow-up if fewer than (words)", ""), where) or 3,
                  "ask": text("Follow-ups", qid, r.get("Follow-up question (English)", ""), f"{where} follow-up")}
            acc = r.get("Also accept as a full answer", "").lower()
            if acc.startswith("no one"): pr["allowNoOne"] = True
            elif acc.startswith("child"): pr["allowChoice"] = True
            elif acc: problems.append(f"{where}: 'Also accept as a full answer' must be 'no one', \"child's choice\" or empty")
            item["probe"] = pr
        secs[(fk, sid)]["items"].append(item)
        kf[qid] = codes
    if not forms:
        problems.append(f"{MASTER}: no questions found")

    ui = {}
    for key, d in T["Screen text"].items():
        if key: ui[key] = {k: v for k, v in d.items() if v}
    languages = [{"code": l["Code"], "name": l.get("Name shown in form") or l["Language"], "speech": f"{l['Code']}-IN" if len(l["Code"]) == 2 else l["Code"],
                  "voice": l.get("Voice", "")} for l in langs]
    content = {"languages": languages, "forms": forms, "ui": ui, "checks": {}}
    content["version"] = hashlib.sha1(json.dumps(content, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:10]
    return content


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--sheet-id"); g.add_argument("--json")
    ap.add_argument("--report")
    ap.add_argument("--out", default=str(OUT))
    a = ap.parse_args()
    content = build(read_sheet(a.sheet_id) if a.sheet_id else read_json(a.json))
    if problems:
        lines = ["## ❌ Publish stopped — please fix these in the Questions Sheet", ""] + [f"- {p}" for p in problems] + ["", "The live form was not changed."]
    else:
        n = sum(len(s["items"]) for f in content["forms"].values() for s in f["sections"])
        out = pathlib.Path(a.out); out.parent.mkdir(exist_ok=True)
        out.write_text(json.dumps(content, ensure_ascii=False, indent=1), encoding="utf-8")
        lines = [f"## ✅ Questions checked: {len(content['forms'])} forms, {n} questions, languages: {', '.join(l['code'] for l in content['languages'])}",
                 f"Written {out.name} (version {content['version']})."]
    if notes:
        lines += ["", "### Notes (not errors)", ""] + [f"- {x}" for x in notes[:200]]
    report = "\n".join(lines)
    print(report)
    if a.report: pathlib.Path(a.report).write_text(report + "\n", encoding="utf-8")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
