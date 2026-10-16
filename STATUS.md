# 1MV Listening Form — status and handover (17 Oct 2026)

## What it is
A web form for the 1 Million Voices listening tools (Short Answer Focused questionnaire, 16 Oct 2026),
for **Youth (12–25)**, **Parents** and **General Public**. It looks like the Youth Voice tool (one question per
screen) and adds what Google Forms can't: one follow-up when a short answer is weak, conditional questions,
optional 🔊 listen / 🎤 speak, three languages, offline save, and a safety line (Tele-MANAS 14416).

- **Live:** https://gaupalemunna76.github.io/1mv-listening-form/
  - one form: `?t=youth` · `?t=parent` · `?t=public` — language: `&lang=en|hi|mr` — partner/channel: `&src=<code>`
  - responses kept on a device: `?admin` (counts, CSV, "Not sent" for blocked old ones)
- **Code:** https://github.com/gaupalemunna76/1mv-listening-form (public, for GitHub Pages). Local: `Desktop\Claude\1mv-listening-form`.
- **Collecting since:** 16 Oct 2026, 23:42 IST.

## Where the data goes
Google Sheet **"1MV Listening Form – Responses"** (owned by Munna), via the Apps Script web app in
`google_sheet/Code.gs` (URL in `config.js`). One tab per form, one row per response.

| Tab | Columns (+ received_at) |
|---|---|
| Youth | 40 |
| Parents | 38 |
| General Public | 28 |

- Column names are the **English question text**. Questions that can get a follow-up have a second column
  **`Fups: <question>`** with the follow-up answer.
- Summary columns: `session_id` (must stay first), Form, Language, Source, Submitted at, Time taken (sec),
  Safety flag, **`Fups: asked & why`** (e.g. `Y11a_work: short`), Spoken answers.

## Locks (why old answers can't break the Sheet)
| Where | Rule |
|---|---|
| Form (`app.js` `CUTOFF`) | Sends only responses saved after **2026-10-16T18:12:00Z** whose columns match today's exactly. Others stay on the device, shown as "Not sent" in `?admin`. |
| Sheet script (`Code.gs` `LOCK_AFTER`) | Rejects responses submitted before the same time. Never adds columns to an existing tab: a response with different columns is rejected. Deployed as a new version on 16 Oct (verified: "rejected: before lock"). |
| Local copies (localhost) | Never send to the Sheet unless `?sync` is in the URL, so tests can't add rows. |

## Changing questions safely
Changing a question's **English wording** changes its column name, so the Sheet will **reject** new responses
for that form. To change questions:
1. Edit `questions.js` (all three languages).
2. In the Sheet, rename that form's tab, e.g. `Youth (v1)`.
3. Set `CUTOFF` (app.js) and `LOCK_AFTER` (Code.gs) to the switch time; redeploy the script as a **New version**
   (Deploy → Manage deployments → ✏️ → New version — same URL).
4. `python set_version.py`, test, push. The next response creates a fresh tab.

Hindi/Marathi-only wording changes don't touch the Sheet.

## Run and test
```
node tests/probe.test.mjs                       # follow-up rules, EN/HI/MR (94)
node tests/transcript.test.mjs && node tests/phone_speech.test.mjs && node tests/speech_retry.test.mjs   # speech clean-up + laptop retry
python -m http.server 8790   +   node tests/e2e_edge.mjs             # whole Youth form in headless Edge (38)
python set_version.py && git add -A && git commit && git push        # publish (Pages updates in ~1 min)
```

## Open items
1. Native-speaker review of the Hindi and Marathi text (drafts).
2. Try 🎤 on an Android phone in Hindi and Marathi (headless tests can't use a real mic).
3. Watch the `Safety flag` column; a person on the team should follow up on YES rows.
4. Scale (see the Features & Scalability report, 17 Oct): plan ~50,000 responses per Sheet (Sheets limit is 20M cells or 100 MB; size is reached first) and ~1,000–2,000 responses an hour (Apps Script: 30 at the same moment, ~1.4–2.5 s per call). Before scaling: confirm saves (read the script reply, retry on failure) and make writes append-only. No-cost path to 1M: Cloudflare Workers + D1.
5. Optional ideas not built: review-your-answers page, "skip follow-up" button, partner dashboard, more languages.
