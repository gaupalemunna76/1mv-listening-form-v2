"""Make the 🔊 audio for every question and follow-up, in each language's voice (Languages tab → voice).

  python tools/make_audio.py           (the Publish button runs this after build_questions.py)

Uses edge-tts (free, no account: Microsoft Edge's online voices, e.g. hi-IN-SwaraNeural, mr-IN-AarohiNeural,
en-IN-NeerjaNeural). If AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are set, it uses Azure's official Speech API
(free tier: 0.5M characters a month) instead. Files are named by a hash of voice + text, so only new or changed
text is generated; files no longer used are deleted. The map of files is added to content/questions.json ("audio").
If a voice fails, that text is skipped and the form falls back to the phone's own voice for it.
"""
import asyncio, hashlib, json, os, pathlib, re, sys, urllib.request

sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content" / "questions.json"
AUDIO = ROOT / "audio"


def say_text(q, lang, followup=False):
    """Same text the form reads aloud: question (without a trailing bracket note) + example + short option list."""
    pick = lambda d: (d or {}).get(lang) or (d or {}).get("en", "")
    if followup:
        return pick(q["probe"]["ask"])
    s = re.sub(r"\s*\(.*?\)\s*$", "", pick(q["label"]))
    if q.get("hint"):
        s += ". " + pick(q["hint"])
    if q.get("options") and (q["type"] != "dropdown" or len(q["options"]) <= 12):
        s += ". " + ", ".join(pick(o) for o in q["options"])
    return s


async def tts_edge(text, voice, out):
    import edge_tts
    await edge_tts.Communicate(text, voice).save(str(out))


async def tts_azure(text, voice, out, key, region):
    lang = "-".join(voice.split("-")[:2])
    ssml = f"<speak version='1.0' xml:lang='{lang}'><voice name='{voice}'>{text.replace('&', 'and').replace('<', ' ').replace('>', ' ')}</voice></speak>"
    req = urllib.request.Request(f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1", data=ssml.encode("utf-8"), method="POST",
                                 headers={"Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml",
                                          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3", "User-Agent": "1mv-listening-form"})
    data = await asyncio.to_thread(lambda: urllib.request.urlopen(req, timeout=60).read())
    out.write_bytes(data)


async def main():
    c = json.loads(CONTENT.read_text(encoding="utf-8"))
    key, region = os.environ.get("AZURE_SPEECH_KEY"), os.environ.get("AZURE_SPEECH_REGION")
    jobs, audio_map = {}, {}
    for lang in c["languages"]:
        voice = lang.get("voice")
        if not voice:
            print(f"- {lang['code']}: no voice set, phone voice will be used"); continue
        m = audio_map.setdefault(lang["code"], {})
        for fk, form in c["forms"].items():
            for sec in form["sections"]:
                for q in sec["items"]:
                    for kind in ("q", "f") if q.get("probe") else ("q",):
                        text = say_text(q, lang["code"], kind == "f").strip()
                        if not text:
                            continue
                        h = hashlib.sha1(f"{voice}|{text}".encode("utf-8")).hexdigest()[:16]
                        rel = f"audio/{lang['code']}/{h}.mp3"
                        m[f"{fk}/{q['id']}/{kind}"] = rel
                        jobs[rel] = (text, voice)
    todo = {rel: v for rel, v in jobs.items() if not (ROOT / rel).exists()}
    print(f"audio: {len(jobs)} needed, {len(jobs) - len(todo)} already made, {len(todo)} to make ({'Azure' if key else 'edge-tts'})")
    sem, failed = asyncio.Semaphore(4), []

    async def one(rel, text, voice):
        out = ROOT / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        async with sem:
            for attempt in range(3):
                try:
                    if key and region:
                        await tts_azure(text, voice, out, key, region)
                    else:
                        await tts_edge(text, voice, out)
                    if out.exists() and out.stat().st_size > 1000:
                        return
                except Exception as e:
                    err = e
                await asyncio.sleep(2 * (attempt + 1))
            out.unlink(missing_ok=True)
            failed.append(rel)
    await asyncio.gather(*(one(rel, t, v) for rel, (t, v) in todo.items()))
    for rel in failed:  # leave these to the phone's own voice
        for m in audio_map.values():
            for k in [k for k, v in m.items() if v == rel]:
                del m[k]
    used = set(jobs) - set(failed)
    removed = 0
    if AUDIO.exists():
        for f in AUDIO.rglob("*.mp3"):
            if f.relative_to(ROOT).as_posix() not in used:
                f.unlink(); removed += 1
    c["audio"] = audio_map
    CONTENT.write_text(json.dumps(c, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"audio: made {len(todo) - len(failed)}, failed {len(failed)} (phone voice will be used), removed {removed} old files")


if __name__ == "__main__":
    asyncio.run(main())
