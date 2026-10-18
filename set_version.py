"""Stamp a new version on every file link so phones load the latest code, not a cached copy.
Run before each push:  python set_version.py
"""
import re, datetime, pathlib

root = pathlib.Path(__file__).parent
ver = datetime.datetime.now().strftime("%Y%m%d-%H%M")

def stamp(path, pattern, repl):
    p = root / path
    s = p.read_text(encoding="utf-8")
    s2, n = re.subn(pattern, repl, s)
    if n == 0:
        raise SystemExit(f"nothing to stamp in {path}: {pattern}")
    p.write_text(s2, encoding="utf-8")

for f in ["app.js"]:
    stamp(f, r'"\./([a-z0-9-]+)\.js(\?v=[\w-]+)?"', rf'"./\1.js?v={ver}"')
stamp("index.html", r'(app\.js|styles\.css)(\?v=[\w-]+)?"', rf'\1?v={ver}"')
stamp("app.js", r'const VERSION = "[^"]*";', f'const VERSION = "{ver}";')
print("version", ver)
