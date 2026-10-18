"""Publish checks: a good Sheet builds, a broken Sheet is refused (live file untouched), and the tabs written by the
Questions Sheet script (tests/out/sheet_tabs.json, from questions_sheet.test.mjs) build too.
Run: node tests/questions_sheet.test.mjs && python tests/build_check.py
"""
import copy, json, pathlib, subprocess, sys, tempfile
sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(__file__).resolve().parent.parent
BUILD = ROOT / "tools" / "build_questions.py"
LIVE = ROOT / "content" / "questions.json"
seed = json.loads((ROOT / "seed" / "questions_seed.json").read_text(encoding="utf-8"))
names = [l["Language"] for l in seed["languages"] if l["Language"] != "English"]

def grid(rows):
    h = list(rows[0].keys()); return [h] + [[r.get(k, "") for k in h] for r in rows]
tabs = {"Languages": grid(seed["languages"]), "Master (English)": grid(seed["master"])}
for t, rows in seed["translations"].items():
    tabs[t] = [["ID", "English (base)"] + names + ["Needs update"]] + [[r["id"], r["en"]] + [r.get(n, "") for n in names] + [""] for r in rows]

tmp = pathlib.Path(tempfile.mkdtemp())
def run(t, name):
    p = tmp / f"{name}.json"; p.write_text(json.dumps(t, ensure_ascii=False), encoding="utf-8")
    r = subprocess.run([sys.executable, "-I", str(BUILD), "--json", str(p), "--out", str(tmp / f"{name}_out.json")], capture_output=True, text=True, encoding="utf-8")
    return r.returncode, r.stdout, tmp / f"{name}_out.json"

before = LIVE.read_bytes()
checks = []
code, out, res = run(tabs, "good")
checks.append((code == 0, "the Sheet made from today's form builds"))
c = json.loads(res.read_text(encoding="utf-8"))
checks.append((sum(len(s["items"]) for f in c["forms"].values() for s in f["sections"]) == 52, "52 questions"))

bad = copy.deepcopy(tabs)
M = bad["Master (English)"]; h = M[0]; col = {k: i for i, k in enumerate(h)}
for r in M[1:]:
    if r[col["ID"]] == "Y11a_work": r[col["Question (English)"]] = ""
    if r[col["ID"]] == "Y6_class": r[col["Show only if"]] = "Y5 in school, univ"
    if r[col["ID"]] == "Y7_institution": r[col["Options (English)  code: label | code: label"]] = ""
    if r[col["ID"]] == "G1_age": r[col["Answer type"]] = "Slider"
bad["Questions"][0][2] = "Hindee"          # translator renamed the Hindi column
code, out, _ = run(bad, "bad")
checks += [
    (code == 1, "broken Sheet → Publish stops (exit 1)"),
    ("youth/Y11a_work: English text is empty" in out, "reports the empty English question"),
    ("'univ' is not an option code of Y5" in out, "reports the wrong 'Show only if' code"),
    ("Y7_institution: this One choice question has no options" in out, "reports a choice question with no options"),
    ("Answer type 'Slider'" in out, "reports the unknown answer type"),
    ("Tab 'Questions': column 'Hindi' is missing" in out, "reports a renamed language column"),
]
dump = ROOT / "tests" / "out" / "sheet_tabs.json"
if dump.exists():
    code, out, res = run(json.loads(dump.read_text(encoding="utf-8")), "fromscript")
    c = json.loads(res.read_text(encoding="utf-8")) if code == 0 else {}
    ids = [q["id"] for f in c.get("forms", {}).values() for s in f["sections"] for q in s["items"]]
    checks += [
        (code == 0, "tabs written by the Questions Sheet script build"),
        ("G12_new" in ids and "kn" in [l["code"] for l in c.get("languages", [])], "includes the question and the language added in the Sheet"),
        (c.get("forms", {}).get("youth", {}).get("sections", [{}])[1].get("items", [{}])[0].get("label", {}).get("hi", "").startswith("30 साल की उम्र"), "includes the Hindi translator's update"),
        ("not yet in Kannada" in out, "notes Kannada translations still to do (English shows meanwhile)"),
    ]
checks.append((LIVE.read_bytes() == before, "live questions.json untouched by all of this"))
for good, msg in checks:
    print(("ok   " if good else "FAIL ") + msg)
fails = sum(not g for g, _ in checks)
print("all passed" if not fails else f"{fails} FAILED")
sys.exit(1 if fails else 0)
