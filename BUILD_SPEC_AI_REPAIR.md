# BUILD SPEC — «AI-ремонт», the paid journey

**Round-3 owner rulings, 2026-10-11 (authoritative — everything below derives from these):**

> 1. *forget about the balance. user buy Ai repair. we provide all advise for the exact thing as
>    in verdict. we fix only what the user paid for by choosing ai repair after viewing the
>    verdict and the free repair path. We hardcode that path and offer the user personal
>    guiding for 150 rub. we try to help as much as possible, videos, photos from user as
>    necessary.*
> 2. *do up* (rounding)
> 3. *if they end up buying something we refund them 1 repair credit so they can start a new
>    job from their cabinet and it will have a credit.*
> 4. (backup alarm) *i do not care for this — do your best*
> 5. (sweep cadence) *daily*
> 6. (watch-script wiring) *have no idea* → my call
> 7. *send email and verdict, we keep track for videos they shared — match them to email. all
>    user accounts are kept for now. we do not expect hundreds. tens ok.*
> 8. *registered adress: Москва, Кудринская пл. д. 1 … no need Огрнип data; VAT — no vat, no
>    tokens either. just 1 AI repair = 150 rub.*
> 11. *same phone we merge of course. any payment triggers registrations. we make them accept
>     storing and contacting them with information on their orders, some marketing.*
> 12. *yes, use the openstore crm.*
> 13. *it's not push crm it's a custom app on my android … but lets wait with this.*

**Three things are therefore DEAD and must not be built:** token balances, VAT, SMS.

**One number governs everything:** `AI_GUIDE_FEE_RUB = 150` — one repair, one payment, already
the single source of truth in `mechanic/verdict.py:35` (live md5 `6a881040…`).

---

## 0 · Current state (read before changing anything)

| item | state | source |
|---|---|---|
| funnel stages `S0→S1→S2→S3` | **live**, `S3_AR` | `web/funnel_state.py` md5 `3c6a9568…` |
| `POST /api/ar/commit` (S2→S3, idempotent CAS) | **live but FEE-WAIVED** (`_AR_FEE_RUB = 0`) | `_AR_LANE_DEPLOY_20261011.md` |
| `GET /api/ar/guide` | **live**, delegates to `mechanic/procedure_catalog.py`, `pins` always `[]` | same |
| AR contract `ArGuideResponse`/`ArStep`/`ArPin`/`ArBBox` | **LOCKED** | `hi5-andrey-ui/openapi.json` |
| UI | `hi5-andrey-ui` @ `69ea5ff`, React 18 + Vite 5 + TS 5.6, no UI libs | `package.json` |
| payment | **nothing processes payment** | `CURRENT_STATUS.md` #1 |
| identity bridge | `set_identity()` exists, **never called** | `ANDREY_AUTH_MATRIX.md` |

**The single biggest delta this round:** the fee must be turned back **on** and routed through
ocStore, and *paying* must be what creates the account.

---

## Part A · Server (`/root/aim/app`, Python/FastAPI)

### A1 — Un-waive the fee
`web/passport_api.py`: `_AR_FEE_RUB` goes `0 → verdict.AI_GUIDE_FEE_RUB` (import it; never
hardcode 150 in a second place). `POST /api/ar/commit` keeps its CAS idempotency and its
`"expensive"` classification in `_RELAY_ROUTES` — waiving was never allowed to bypass the 24 h
brake, and charging must not either.

### A2 — Payment is the gate to S3
`POST /api/ar/commit` gains `use_credit` and one new outcome:

```jsonc
// request
{ "session_id": "…", "use_credit": false }
// 200 — paid
{ "ok": true, "already": false, "stage": 3, "fee_rub": 150, "paid_with": "yoomoney" }
// 200 — paid with the free repair credit (ruling 3)
{ "ok": true, "already": false, "stage": 3, "fee_rub": 0, "paid_with": "credit" }
// 402 — nothing paid yet and no credit on the account
{ "ok": false, "code": "payment_required", "fee_rub": 150, "pay_url": "…" }
```
`402 payment_required` is **new** and joins the refusal-normalisation set beside `rate_limit`,
`stage_skipped`, `busy_lease`, `session_expired`. The UI's "don't-strand-the-user" pass must
route it back to the offer, never into a dead end.

### A3 — `POST /api/ar/pay`: hand off to ocStore
Creates (or reuses, keyed by `session_id`) an ocStore order for the product **«AI-ремонт»** —
150 ₽, non-shippable, `tax_class_id = 0` — and returns the storefront checkout URL carrying
`session_id` in the order comment. **ocStore owns the order** (ruling 12); the AI mechanic never
implements a payment rail.

### A4 — Registration on ANY payment + merge by phone
On any paid order (the AI-repair order **or** a parts order) run exactly one routine:

1. Normalise the phone to `7XXXXXXXXXX`; look up `oc_customer` by `telephone`, then by `email`.
2. **Found → MERGE** — reuse that `customer_id`, never create a second row (*"same phone we
   merge of course"*).
3. **Not found → CREATE** one and attach the guest order to it (`customer_id = 0 → new id`).
   This is the 187-of-209-guests problem finally closing.
4. Require both consents before the account is usable: **storage + order contact** (mandatory)
   and **marketing** (separate, optional) — `CONSENT_152FZ_hi5bike.md` §2.6 + §8.

### A5 — The repair credit (this replaces tokens completely)
One tiny table. No ledger, no expiry, no balance the customer can see.

```sql
CREATE TABLE ai_repair_credit (
  credit_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id     INTEGER NOT NULL,                 -- oc_customer.customer_id
  source_order_id INTEGER,                          -- the PARTS order that earned it
  state           TEXT NOT NULL DEFAULT 'open',     -- open | spent
  created         REAL NOT NULL,
  spent_at        REAL,
  spent_session   TEXT
);
```
* **earned** — a paid **parts** order inserts one `open` row (ruling 3).
* **spent** — `ar/commit` with `use_credit: true` flips that row to `spent` via a CAS
  (`UPDATE … WHERE credit_id=? AND state='open'`), so a double tap cannot spend it twice. Same
  discipline as the stage machine.
* **no expiry** (*"all user accounts are kept for now"*).

### A6 — Rounding = ceiling, in one place
One helper `mechanic/money.py: ceil_rub(v) -> int` (`math.ceil`) used by every price the
customer is shown (ruling 2). 4 317,20 ₽ → **4 318 ₽**. Never `round()`.

### A7 — The scope lock ("only what they paid for")
`GET /api/ar/guide` is driven by `verdict.causes[0].job_code` — **the exact thing in the
verdict** — and must never become a general repair menu. `procedure_catalog.py` already
validates `job_codes` against `jobs.BY_CODE` and drops unknown ones; keep that and add an
assertion that the guide's step set ⊆ the verdict's cause set.

### A8 — Email + verdict, and the email as the join key
Free verdicts (S2) accept an optional `email`. When present: send the verdict **and the free
repair path** to it, and store it against the session so the videos the user later shares can be
**matched to that email** (ruling 7 / O12). Retention ≡ account lifetime; M3's unlink must
cover this column.

### A9 — Cabinet read route (identity-required)
`GET /api/cabinet` → `{ orders: […], credits_open: n, jobs: […] }`. It needs the same two
allowlists as `ar/commit` (app `_ROUTES` **and** the nginx relay's route set), so it ships only
together with A10.

### A10 — Turn the identity bridge on
`funnel_state.set_identity()` is defined and **never called**, so `identity` is always `''` and
every identity-required route answers 401 today. Site-wide cookie → validate against the shop's
session table → bind `customer_id`. **This is the gate for A9 and for the credit to be
per-person at all.**

### A11 — Ops (decided by me, rulings 4/5/6)
Add to the **existing** `/usr/local/bin/ai-mechanic-watch.sh` (already every 5 min, already has
the off-box `HC_URL` dead-man + `NTFY_URL` push hooks) — **no new cron**:
* `sweep_temp()` — **daily** (guard it so it runs at most once per day inside the 5-min script);
* warn if **free space < 8 GB**;
* warn if `_uploads/` + `sessions.db` **> 5 GB** — that is *our* footprint, which is what
  "back up now" actually means.

---

## Part B · UI (`hi5-andrey-ui`, React 18 + Vite 5 + TS 5.6)

**Constraints that are not negotiable:** no new runtime dependencies (React + ReactDOM only —
no router, no state library, no canvas library); TypeScript strict; all requests through
`PROXY_BASE` from `src/api.ts`; the `X-Andrey-Token` header is injected server-side and must
never appear in browser code; every string in Russian, with server-supplied strings rendered
**verbatim**.

### B1 — The verdict screen, in this exact order
1. the free content (passport, gate badge, causes) — unchanged;
2. **the free repair path for exactly that fault** (already available from the verdict);
3. **then** the offer: «AI-ремонт — 150 ₽, персональное сопровождение».
   The offer must not appear before the free path — that ordering is the owner's ruling.

### B2 — `AI-ремонт` button → `POST /api/ar/pay` → checkout → back to S3
* `402 payment_required` → return to B1 step 3 with the returned `pay_url`.
* `200 paid_with: "credit"` → enter S3 with a visible «использован бесплатный AI-ремонт» badge.

### B3 — The S3 guidance screen (the thing AI Studio builds)
Consumes `GET /api/ar/guide`. Three parts:
* **Steps 1..n** from `guide.steps[]`, 1-based indices, in the caller's order, each showing the
  real job name / minutes / ₽ that the payload carries — no invented copy.
* **Overlay canvas** over the user's media, mapping normalised `pins[]` (`x`,`y` + optional
  `bbox`) onto the rendered frame with `guide.frame_aspect` letterboxing. **`pins` is `[]`
  today** — so the overlay must render nothing and *not* look broken; the text-only turn is the
  designed fallback, not an error state.
* **"Нужна ещё фотография / видео"** — the affordance that makes this "personal guiding": upload
  more media, refresh the guide, **inside the same job and never re-charged**.

### B4 — The cabinet
Orders + `credits_open` + past jobs, and one primary action: **«Начать новый ремонт
(использовать кредит)»** → `POST /api/ar/commit {use_credit: true}`. The credit must be visible
where the customer would look for it, because that is the whole point of ruling 3.

### B5 — Refusal handling stays intact
`409 stage_skipped` → back to the verdict; `409 busy_lease` → resume, never a dead end;
`402 payment_required` → back to the offer; `401 identity_required` → the shop's login.

### B6 — Mock-first
`src/mock/` holds fixtures that conform to `ArGuideResponse` + the cabinet payload, selected by
`import.meta.env.VITE_AR_MOCK`. Going live is a one-line switch. This is what lets us **inspect
the build before the backend routes exist**.

---

## Part C · Acceptance tests (all must pass before anything is deployed)

**Server**
1. `_AR_FEE_RUB == verdict.AI_GUIDE_FEE_RUB == 150` and the string `150` appears in exactly one
   source file.
2. `ar/commit` with no payment and no credit → **402 `payment_required`** with a `pay_url`, and
   the session is **still S2**.
3. `ar/commit` replay after a successful commit → `200 already: true`, session unmoved, nothing
   charged twice (CAS).
4. `ar/commit` without the lease at S2 → the existing refusal, unchanged.
5. Two credits: the second `use_credit` spends the second row; a third → 402. A double tap
   spends **one** row.
6. `ceil_rub(4317.20) == 4318`; `ceil_rub(4317.01) == 4318`; `ceil_rub(4317.0) == 4317`.
7. Phone `+7 (999) 123-45-67` and `8 999 1234567` normalise to the same `79991234567` and
   resolve to **one** `customer_id` (merge, not duplicate).
8. A paid order with `customer_id = 0` becomes attached to the found/created customer.
9. `ar/guide` at S3 returns steps whose `job_code`s ⊆ the verdict's cause set; an unknown code
   is dropped, never rendered; `pins == []` is a valid 200, not an error.
10. `GET /api/cabinet` without identity → 401; with identity → the customer's own rows only.

**UI**
11. `npm run build` (`tsc --noEmit` + `vite build`) is clean, with the mock switch both ways.
12. Killing the mock server mid-journey produces the recovery UI, not a blank screen.
13. The overlay renders **zero** pins without breaking layout, and positions correctly for a
    non-1.0 `frame_aspect` (e.g. 9:16 from a phone).
14. No `X-Andrey-Token` anywhere in `dist/`.
15. The 150 ₽ offer never appears before the free repair path.

---

## Part D · Explicitly OUT of scope (do not build)

* tokens, balances, points, expiry, bundles — **none exist**;
* VAT anywhere;
* SMS and any Android-app work (*"lets wait with this"*);
* the canonical procedure stills / pin authoring (that is what would make `pins` non-empty);
* the custom `/var/www/hi5.bike/crm/` app — ocStore is the CRM (ruling 12);
* the O2/O3 backup-archive machinery (stays deferred — nothing is deleted);
* a redesign. This is a wiring job, not a re-theme.
