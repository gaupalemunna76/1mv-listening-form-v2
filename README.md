> **This is VERSION 2** of the 1MV Listening Form, a separate copy for new features. See STATUS.md. Version 1 (live data collection) is at https://github.com/gaupalemunna76/1mv-listening-form.

# 1MV Listening Form

A web form for the **1 Million Voices** listening tools (Short Answer Focused version, 16 Oct 2026). It has the look of the Youth Voice tool (github.com/gaupalemunna76/youth-voice): one question per screen, section chips and a progress bar, tap-to-choose option chips, a big round 🎤 next to every answer box, and dark mode. It works like a Google Form (choices, dropdowns, short answers) and adds what Google Forms cannot do:

- **Follow-up questions (probing).** When a short answer is empty, a non-answer ("yes", "ok", "pata nahi"), too short, or only general words ("good", "peaceful", "hard work"), the form asks **one** follow-up under that question. It is asked once only; pressing Next again moves on.
- **If-conditions.** Questions appear only when they apply. For example, the class question shows only for youth in school or college, "What is stopping you?" shows only after "Not yet", and parents who never visited the school get "What makes it hard to visit?" instead of "Why did you visit?".
- **Languages.** English, Hindi and Marathi, switchable at any point without losing answers. More can be added (see below).
- **Safeguarding.** If an answer suggests self-harm, the form shows the free Tele-MANAS helpline (14416) and flags the response.
- **Works offline.** Answers are saved on the device as people type, so an unfinished form can be resumed. Finished forms are sent to the Google Sheet when the device is online.

- **Optional voice, never on by default:**
  - 🔊 next to every question (and every follow-up) reads it aloud, only when tapped. Uses the browser's built-in voices, which every modern browser has. Hindi needs a Hindi voice on the device; if there is none, the form says so.
  - 🎤 next to every short-answer box turns speech into text in that box. People can talk for as long as they like (up to 3 minutes per tap; tap again to add more) and then edit the text. Uses the browser's free speech recognition: Chrome, Edge, Safari and Android Chrome (needs internet). In Firefox the mic button doesn't show, and people type.
  - Only text is stored, never audio. The `<id>_spoken` column says whether the answer, the follow-up or both were spoken.

See STATUS.md for the current state, Sheet locks and how to change questions safely.

## Links
- **Live form:** https://gaupalemunna76.github.io/1mv-listening-form-v2/
- Straight to one form: `?t=youth`, `?t=parent`, `?t=public` (e.g. `…/1mv-listening-form/?t=parent&lang=mr`). The link opens the start screen with that form already chosen.
- Track a partner or channel: add `&src=<code>` (saved in the `source` column)
- Responses saved on this device and CSV download: `?admin`

## The three forms
| Form | Sections | Questions (incl. conditional) |
|---|---|---|
| Youth (12–25) | About you · Your future · Learning and support | 9 profile + 11 listening |
| Parents | About you and your child · School and learning · Home and future | 6 profile + 13 listening |
| General public | About you · Young people today | 5 profile + 7 listening |

Questions, examples, follow-ups and conditions are all in `questions.js`. Follow-up rules are in `probe.js`.

## Send responses to a Google Sheet (one-time, about 5 minutes)
1. Create a Google Sheet, for example "1MV Listening Form responses".
2. **Extensions → Apps Script.** Delete what is there, paste all of `google_sheet/Code.gs`, press **Save**.
3. **Deploy → New deployment →** gear icon **→ Web app.** *Execute as:* **Me**. *Who has access:* **Anyone**. **Deploy**, allow access, copy the **Web app URL** (ends in `/exec`).
4. **Connected 16 Oct 2026** (Sheet "1MV Listening Form – Responses", owned by Munna). To change it: put the URL in `config.js` (`SHEET_URL = "…/exec"`), run `python set_version.py`, commit and push.

Each form gets its own tab (Youth, Parents, General Public), one row per response. **Column names are the English question text**, so the Sheet reads like the form. A question that can get a follow-up has a second column named `Fups: <question>` holding the follow-up answer (blank if no follow-up was needed). `Fups: asked & why` lists which follow-ups were asked and why (e.g. `Y11a_work: short; Y12_reason: nonanswer`), and `Spoken answers` lists answers given with the mic. Youth 40, Parents 38, General Public 28 columns (+ `received_at`). `session_id` must stay the first column. If a question's English wording changes, the Sheet gets a new column for it. Answers are stored as plain text, never as formulas. Local test copies (localhost) never send to the Sheet unless `?sync` is added, so tests cannot add fake rows.

## Add a language
1. Add it to `LANGS` in `i18n.js`, for example `{ code: "mr", name: "मराठी", speech: "mr-IN" }` (`speech` is the language the 🔊 and 🎤 buttons use).
2. Add the same code next to `en`/`hi` in every entry of `UI` (`i18n.js`), `questions.js` and `states.js`. Anything not translated shows in English.
3. Add common non-answers, "no one" phrases and safety words in that language to `probe.js`.

The Hindi and Marathi text are working drafts (Marathi follows the team's "Natural" style, तुम्ही). Have native speakers review them before field use.

## Change and publish
```
node tests/probe.test.mjs                       # follow-up rules incl. Marathi (94 checks)
node tests/transcript.test.mjs && node tests/phone_speech.test.mjs   # speech-to-text clean-up (16 checks)
python -m http.server 8790                      # in another window, then:
node tests/e2e_edge.mjs                         # full Youth form in headless Edge (38 checks)
python set_version.py                           # stamp a new version so phones get the new files
git add -A && git commit -m "…" && git push     # GitHub Pages updates in about a minute
```
