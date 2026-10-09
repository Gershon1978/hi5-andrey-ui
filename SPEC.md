# Andrey UI — build spec (for Google AI Studio "Build")

You are building the **front-end** for "Andrey", the hi5.bike bicycle-repair assistant.
The back-end already exists and is LIVE. **Do not** re-implement any AI logic — call the API.

## The brain lives at
`https://hi5.bike/Andrey`  (FastAPI). All endpoints are under `/api`.
`openapi.json` in this repo is the authoritative contract.

**IMPORTANT — call the API through the app's OWN server route (a proxy), never directly from
the browser.** That keeps the base URL + token server-side and avoids CORS. Set these Build
secrets and read them **server-side only**:
- `ANDREY_BASE` = `https://hi5.bike/Andrey`
- `ANDREY_TOKEN` = (optional for now; send as header `X-Andrey-Token` when set)

## The one screen that matters (the whole flow)
A single page, top to bottom:

1. **Capture guidance** — `GET /api/capture` → render `contract.lines` (how to film: 10 s
   drive-side clip, no audio; 10 s close-up of the fault, with audio).
2. **Inputs** — a model text field (optional) + a photo/video upload + a symptom text field.
3. **Run** — `POST /api/flow` (multipart: `files[]`, `model`, `symptom`) → returns
   `{ passport, verdict, audio, ticket }`.
4. **Render the Passport** — `passport.identity {make, model, year_window}`, a gate badge
   (`passport.gate` = `pass` / `unknown`), `passport.standards`, `passport.consumable_specs`,
   `passport.blueprint` (canonical specs), `passport.required_parts`, `passport.fit_constraints`.
5. **Render the Verdict + Fork** — gate-aware:
   - `verdict.gate === "verdict"` (≥80 %): show the two options —
     - **DIY** `verdict.diy` → label + `price_text` (**one flat 150 ₽ — no tiers for now**),
     - **Workshop** `verdict.workshop` → `price_text` (a range), `detail`,
     - the guarantee line `verdict.guarantee`,
     - a "Передать в мастерскую" button → `POST /api/handoff {session_id, model, symptom, paid_ar_credit_rub, ar_tier}`.
   - `verdict.gate === "deeper"` (<80 %): show **NO prices**; show `verdict.deeper` (the exact
     photo asks) and offer a clarifier upload → `POST /api/deeper {files[], symptom, model, round_no}`.
   - Always show `verdict.causes[]` (`label`, `confidence`, `job_code`).
6. **Ticket** — `POST /api/handoff` → show `ticket` (flat: `bike_summary`, `detected_specs`,
   `fault_codes`, `paid_ar_credit_rub`, `customer_note`).

## Pricing rules (do NOT invent prices)
- The AI-guide fee is a **flat 150 ₽** for now (the server sends `diy.price_text` and
  `diy.price_rub`). **No 50 ₽, no 100 ₽, and no discounts yet** — they come later.
- Workshop price = the job's own base…difficult **range** (server sends `workshop.price_text`).
- Multi-fault: the server applies the **single highest tier** rule.
- Guarantee: "если не получится доделать самому, вся сумма за AI-гид зачитывается как скидка
  на визит в мастерскую."

## Copy / language
Russian (ru). Keep server-supplied strings verbatim (prices, job names, causes).

## Endpoints (all relative to ANDREY_BASE)
| method | path | body |
|---|---|---|
| GET  | `/api/capture` | — (the filming contract) |
| POST | `/api/flow` | multipart `files[]`, `symptom`, `model` |
| POST | `/api/passport` | multipart `files[]`, `model`, `use_web` |
| GET  | `/api/blueprint` | query `model`, `use_web`, `refresh` |
| POST | `/api/verdict` | json `{symptom, model, use_model}` |
| POST | `/api/deeper` | multipart `files[]`, `symptom`, `model`, `round_no` |
| POST | `/api/handoff` | json `{session_id, model, symptom, paid_ar_credit_rub, ar_tier}` |
