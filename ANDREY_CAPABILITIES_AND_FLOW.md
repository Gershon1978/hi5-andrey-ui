# Andrey — what he can do, his protocols, and the flow

Read from the **live system** (route allow-list, `verdict.py`, `jobs.py`, `funnel_state.py`,
`procedure_catalog.py`, and the live `/api/capture` + `/api/services` responses), not from prose.
Where something is *not* live yet it is marked. As of **2026-10-12**.

## 1 · One line

Andrey is a **bicycle mechanic who works from evidence**: he looks at the bike, names the probable
cause, tells the customer whether they can fix it themselves, and either walks them through it or
books the workshop — **never inventing a price, a procedure or a part number**.

## 2 · What he can actually do today

| # | Capability | Route / module | Live? |
|---|---|---|---|
| 1 | **Tell the customer how to film the bike** — passport clip (~10 s, silent, drive side: frame, brand/model markings, chain/derailleur, brakes) + problem clip (~10 s, with sound, close-up of the fault) | `GET /api/capture` | ✅ 200 |
| 2 | **Name the workshop's services** — «ТО базовое», «ТО полное», «Диагностика», «Ремонт», «Сборка из коробки» | `GET /api/services` | ✅ 200 |
| 3 | **Read the bike** — Bike Passport: identity + confirmed specs plus an explicit **unknown** list (never guessed) | `POST /api/passport`, `/api/flow` | ✅ |
| 4 | **Know the build** — blueprint of a model (spec refresh from catalogue/web) | `GET|POST /api/blueprint`, `/api/blueprint/validate` | ✅ |
| 5 | **Diagnose from a symptom** — ranked top-3 causes with confidence, offline rule table first | `POST /api/verdict` | ✅ |
| 6 | **Ask for evidence when unsure** — below 80 % requests 1–2 photos of the node, **max 2 rounds**, showing **no prices** | `POST /api/deeper` | ✅ |
| 7 | **Price the work from the real menu** — 23 CRM services + extras, each with minutes and the workshop's own base/difficult prices | `mechanic/jobs.py` (refreshes from `oc_crm_service`) | ✅ |
| 8 | **Offer the fork** — *DIY with the AI guide* (flat **150 ₽**, one price for every group) vs *book the workshop* (base→difficult estimate, summed over the matched basket) | `verdict.diy_fork` / `workshop_fork` | ✅ |
| 9 | **Promise the guarantee, verbatim** — «Если не получится доделать самому, вся сумма за AI-гид зачитывается как скидка на визит в мастерскую.» | `verdict.GUARANTEE` | ✅ |
| 10 | **Hand the case to the workshop** — creates the ticket, once per session | `POST /api/handoff` | ✅ |
| 11 | **Build the AR guide (S3)** — ordered steps from **real** jobs (name + minutes + price range), max 3 steps; unknown codes dropped; `pins` **always empty** by design | `procedure_catalog.build_guide` | ⚠ built — `ar/guide` **not in the live allow-list** |
| 12 | **Take payment for the session** (the order is handed to ocStore) | `ar/pay`, `ar/commit` | ⚠ staged, not live |
| 13 | **Show the cabinet** (bikes, history, ticket A–F, payments, chat) | `GET /api/cabinet` | ⚠ built + fixed, not deployed |
| 14 | **Voice session / booking / basket** | `audio`, `book`, `basket`, `basket/add` | ❌ excluded until the identity bridge exists |

**His vocabulary is closed.** A cause must come from the rule table or the job menu; a model may only
**select** from the job-code list — never author a procedure or a price. Adding a repair = adding a CRM
job, not writing prose.

## 3 · Protocol — the funnel is the authority, not the cookie

`funnel_state.py` is the authorization layer:

| Rule | Behaviour |
|---|---|
| **Stages** | `S0_NEW → S1_BIKE_SEEN → S2_VERDICT → S3_AR` |
| **Monotonic** | `advance()` carries `AND stage<?`, so a caller cannot move the funnel **backwards** (a unit test caught exactly that) |
| **Cookie = continuity, not permission** | `andrey_s`, path `/Andrey`, 30-min sliding TTL. A forged cookie naming nothing, an expired session, or the right session at the **wrong stage** all **fail closed** |
| **Client session ids are ignored** | legacy bodies may pass `session_id`; the cookie wins — you cannot act on someone else's session |
| **One paid pipeline at a time** | `busy_until` compare-and-set lease (≤240 s): a double-tap, a retry or a parallel request cannot start two paid runs |
| **Progress only on success** | `advance()` runs after a 2xx, so a rejected upload never consumes a stage |
| **Per-session caps** | verdict **1** · clarifier rounds **2** · workshop ticket **1** |

**Rate + money guards:** 60 requests / 60 s per IP · video ingest 12 accepted uploads / 60 min (raised
from 3 on 2026-10-10) · costed routes take a reservation and pass the budget check · `ceil_rub()`
rounds money up in one place (ruling 2).

**The bar is 80 %, everywhere** (owner A1) — the same `GATE_CONF` drives both the verdict gate and part
fitment. `RULE-PART-MATCH-70` is superseded.

## 4 · The flow, as it actually runs

```
customer                server                                   what is decided
────────                ──────                                   ───────────────
GET /api/capture   →    capture.CONTRACT                          how to film it
                                                        clamp:  passport + problem clips
POST /api/flow     →    passport (identify) ─┬─ blueprints       what bike is it
   (or /passport)                           └─ verdict rules     what is probably wrong
        ── S1_BIKE_SEEN ────────────────────────────────────────── the bike has been seen
                                 │
              confidence ≥ 80 %? │
              ┌──── no ──────────┴──────── yes ────┐
   POST /api/deeper                            the fork
   ask 1–2 photos, no prices        ┌──────────┴──────────┐
   (max 2 rounds)                   │                     │
   ↳ still < 80 % → workshop        DIY + AI guide     book workshop
                                    flat 150 ₽         base→difficult, summed
        ── S2_VERDICT ────────────────────────────────────────── a priced verdict exists
                                 │
        ┌────────────────────────┴────────────────────┐
   pay the fee                         POST /api/handoff
   (ocStore owns the order)             → ticket, once per session
        ── S3_AR ─────────────────────────────────────────────── paid session, guide unlocked
        GET ar/guide  →  steps (real job names/minutes/prices), pins: []  (until canonical stills exist)
```

**Two honest exits.** If nothing matches the menu the guide is **not** improvised: it returns
`unsupported_or_workshop: true` together with the workshop's real booking options. And `DEFAULT_JOB` is
deliberately *not* applied to a guide the customer did not ask for — an unsupported fault exits as a
workshop suggestion instead of a made-up procedure.

## 5 · Analysis — where it is strong, and where it breaks

**Strong (worth protecting, because it is structural rather than editorial)**

1. **The price promise cannot drift by accident.** Every figure traces to `oc_crm_service`, and
   `jobs.refresh_from_db()` re-reads the live CRM table, so the menu follows the workshop's own list.
2. **It fails closed by construction.** Monotonic stages, CAS leases, cookie-as-continuity: replay,
   double-tap, stale session and "someone else's session" were all designed against, not patched after.
3. **Honesty beats helpfulness.** Below 80 % → ask for photos and show **no prices**; unknown job codes
   are dropped rather than rendered; the passport carries an explicit *unknown* list.
4. **The 150 ₽ is safe and, as of today, spendable** — flat for every group, credited 1:1 toward a visit,
   and there are now 23 real workshop services for that credit to convert into.

**Where it breaks or is unfinished**

| Gap | Consequence | State |
|---|---|---|
| `pins` is always `[]` — no canonical stills exist | the "AR" half is text-only; the overlay is unproven | by design, waits on stills we control |
| `ar/guide`, `ar/pay`, `ar/commit`, `cabinet` are outside the live allow-list | the entire paid S3 + cabinet side is unreachable from a browser | staged: reviewed, fixed, **not deployed** |
| No identity bridge | no `audio`, `book`, `basket` → a customer cannot book or buy inside the journey | Phase 1; the `x-customer-id` bypass that blocked it is now *deleted* |
| Clarifier rounds cap at 2 | an ambiguous fault ends at "come to the workshop" — correct, but an exit rather than a resolution | accepted |
| Prices live in two places (CRM → `jobs.py`, CRM → the store products) | the app refreshes from the CRM; the **store products** added today do not auto-refresh | new debt; needs a small sync |
| `base` = ordinary bike, `diff` = difficult case (old/dirty/e-bike/seized) | the site legitimately shows it as a range, but the meaning is conditional — customer copy should say so | copy decision |
| `oc_return` rows are not linked to orders (`order_id = 0`) | a "return" must be read from the **order status** (8/13), not that table | known, recorded in the spec |

**The shortest path to "working"**

1. **Deploy the S3 + cabinet side** (the fixes are done): `ar/guide`, `ar/pay`, `ar/commit`, `cabinet`
   into the allow-list, plus the F4 patch and the dormant `purge_media` removal. Until this happens the
   paid journey is fully built and fully unreachable.
2. **Then the AR overlay** — but only against stills we control; until then the text-only turn *is* the
   product, and the empty-pins rule keeps it honest.
3. **Then identity** — the session bridge is what unlocks `book`/`basket` and makes the cabinet show real
   orders, which is also when the guest-order merge (187 of 209 orders) starts to matter.


