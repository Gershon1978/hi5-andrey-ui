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

## AR stage (S3) — the paid DIY guide  (**LIVE** — verified 2026-10-11)

After the verdict, a user who chooses **DIY** pays the **flat 150 ₽** and enters **S3 (AR
guidance)**. The funnel stage machine is `S0 → S1 → S2 → S3`, monotonic and server-enforced:
- `S0` new session · `S1` bike seen · `S2` verdict · **`S3` AR guidance (paid)**.
- A request to an AR endpoint at a lower stage is refused `409` with `code=stage_skipped`.

### AR endpoints (LIVE)

| method | path | body | gate |
|---|---|---|---|
| POST | `/api/ar/commit` | json `{session_id, use_credit}` | **S2** (advances S2 → S3) |
| GET | `/api/ar/guide` | — | **S3** |

`POST /api/ar/commit` is idempotent **by construction**: the transition is a compare-and-set, so
a replay cannot advance twice or charge twice; a session already at S3 answers `200` with
`already: true`.

```jsonc
{ "ok": true, "already": false, "stage": 3, "fee_rub": 150, "paid_with": "yoomoney" }
{ "ok": true, "already": false, "stage": 3, "fee_rub": 0,   "paid_with": "credit" }
{ "ok": false, "code": "payment_required", "fee_rub": 150, "pay_url": "…" }   // HTTP 402
```

`GET /api/ar/guide` returns the ordered repair steps + the pin coordinates for the overlay:
```json
{
  "ok": true,
  "guide": {
    "steps": [{"index": 1, "instruction": "Открутите винт H-limit…", "job_code": "derailleur_h_limit"}],
    "pins": [
      {"id": "h_limit", "x": 0.42, "y": 0.71, "label": "винт H-limit",
       "bbox": {"x": 0.38, "y": 0.66, "w": 0.08, "h": 0.10}}
    ],
    "frame_aspect": 1.7778
  },
  "unsupported_or_workshop": false
}
```
⚠️ **`pins` is always `[]` today.** A pin is only honest on a canonical still we control and
none exist yet, so the text-only turn is the designed fallback — the overlay must render nothing
rather than look broken. When no job code matches, the server answers
`unsupported_or_workshop: true`, `steps: []`, plus real booking options.

### Coordinate schema (LOCKED)
- **Normalized, not pixels**: `x`/`y`/`w`/`h` are fractions of the frame (0.0–1.0), so the
  overlay survives any resolution/device. Map normalized → CSS px with the rendered frame size.
- `pins[].bbox` is optional (bounding box); `pins[].x/y` is the landmark **centroid**.
- `frame_aspect` = source width / height, so the client can letterbox correctly.

### Pricing (LOCKED)
- AR **is** the flat **150 ₽** DIY guide — no separate charge, no tiers, no discounts. The server
  meters AR calls under the existing `expensive` reservation and the global 24 h spend brake
  (both already live).
- **There are no tokens and no balance** (owner ruling 2026-10-11). One product: **AI-ремонт =
  1 ремонт = 150 ₽**. No VAT.
- **Repair credit:** if the customer buys a part, they get **one free AI-repair** back, spendable
  on a **new** job started from their cabinet (`use_credit: true` on `ar/commit`).
- **Current live state (verified 2026-10-12):** the fee is **waived** — `_AR_FEE_RUB = 0` in
  `web/passport_api.py` — because the paid step is not built yet. `fee_rub` is *reported* from that
  one constant and never invented. So build the UI against the flat **150 ₽** and let the server
  report the number; never hardcode a fee of `0`.


