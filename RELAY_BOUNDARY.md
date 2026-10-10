# ANDREY — THE RELAY BOUNDARY (and the fitment evidence contract)

**Status:** converged with an external model over 4 rounds, 2026-10-09/10
(thread: `gemini.google.com/app/7577c09a47c57d5a`), after a code review of our public repo
found the production relay was an **open proxy**. This doc is the operations contract.

## 0 · THE RULE (paste-grade, from the final round)

```
THE RELAY BOUNDARY — the rule
1. The relay is a bounded door for public traffic, NOT an authorization boundary.
2. The route allowlist is exhaustive: only the listed endpoints are reachable; everything
   else returns 404.
3. Reject unknown HTTP verbs (405) and drop X-HTTP-Method-Override / verb-tunneling
   headers (400).
4. Enforce body caps at the gate: 16 KB for JSON, 256 KB for capture-check, 25 MB for
   media (413).
5. Apply three layered brakes: same-site caller validation, per-IP limits
   (60 req/min; 3 video uploads/hour), and the rolling 24-hour spend cap.
6. The spend cap halts all expensive vision/LLM pipelines at 3 000 ₽ / 86 400 s,
   read in-process from `mechanic.ledger` and persisted to disk.
7. Strip internal traces: upstream connection errors, internal IPs and the injected
   auth header must never leak to the client.
8. `/api/ledger`, debug and admin endpoints stay strictly internal (127.0.0.1),
   unreachable through the relay.
9. Free sessions run on budgeted anonymity; irreversible commitments (booking, orders,
   basket checkout) require real authentication — the hi5.bike session bridge (Phase 1).
```

## 1 · WHAT WAS ACTUALLY BROKEN (measured, not guessed)

```
BEFORE  api/health 200 · api/capture 200 · api/ledger 200 · api/services 200
        POST api/verdict with NO token → 200      with a BOGUS token → 200
```
`require_token()` contained `if path.startswith("/relay"): return` — the relay injects the
brain's token server-side, so **anyone** could spend our money with a bare `curl`. It was
also an unrestricted `{path:path}` forward allowing GET/POST/PUT/PATCH/DELETE to
`/api/*`, and its error path echoed `relay: ConnectError ... 127.0.0.1:8140` plus the
injected header name back to the caller.

## 2 · WHAT IS NOW TRUE (all verified live, 2026-10-09/10)

| guard | probe | result |
|---|---|---|
| same-site caller | `curl` with no headers | **401** |
| | `Sec-Fetch-Site: same-origin`, or `Referer: https://hi5.bike/…` | **200** |
| | a REAL browser on `/Andrey/`, in-page `fetch` | **200** |
| route allowlist | `GET /relay/api/ledger` (our spend + funnel) | **404** |
| | `GET …/chat`, `…/identify`, `…/basket`, `…/media` (retired beta) | **404** |
| | the 11 declared routes | **200** |
| verbs | `PUT /relay/api/health`, `DELETE …/verdict` | **405** |
| | `OPTIONS …/health` (answered locally, never forwarded) | **204** |
| smuggling | `X-HTTP-Method-Override: DELETE` | **400** |
| body caps | 20 KB of JSON onto the 16 KB `/api/verdict` | **413** |
| money brake | `_DAILY_CAP_RUB=3000`, `_SPEND_WINDOW=86400`, in-process ledger read | live |
| token isolation | token in `index.html` / `assets/*.js` | **0 occurrences** |

**The 11 browser-reachable routes** (everything else is internal):
`health`, `capture`, `services` (GET) · `capture/check`, `blueprint`, `blueprint/validate`,
`verdict`, `handoff` (POST) · `passport`, `flow`, `deeper` (POST, media).
Deliberately **excluded until Phase 1**: `audio`, `book`, `basket`, `basket/add` (the last
three create irreversible commitments).

## 3 · THE TWO CORRECTIONS THAT MATTERED

1. **A calendar-day cap has a "midnight drain" hole** (3 000 ₽ at 23:55 + 3 000 ₽ at
   00:05). The window is a **rolling 24 h**, sampled from the ledger's monotonic total.
2. **An in-memory window is exploitable**: a deploy, a restart or an OOM zeroes the
   counter and an abuser can simply wait for one. The fix went through three stages, and
   the naive two both failed:
   - *absolute totals* persisted → after a restart the ledger starts at 0 while the
     persisted totals belong to the old process, so the difference was meaningless
     (`spend_24h = 0.0` — the exploit survived, measured);
   - **the final design persists cost DELTAS**: every expensive response appends
     `[ts, cost_delta]` to `andrey_spend.jsonl`, and `spend_24h` is the sum of the deltas
     in the window. Immune to restarts by construction.

   **Proof (live):** one `use_model: true` verdict through the relay → the service ledger
   read **0.50778 ₽**, the file got `[ts, 0.50096]`, and **after a full restart**
   `spend_24h = 0.501 ₽` with the cap/window intact (3 000 ₽ / 86 400 s).

## 3b · THE CORRECTED COST MODEL (both reviewers assumed wrong)

`/api/verdict` is **not** an LLM route by default. `diagnose(..., use_model=False)` runs a
deterministic keyword ruleset — two live calls moved the ledger by **exactly 0 ₽**
(`calls = 0`). It becomes a real spend vector only when the body says `"use_model": true`
(which is how the brake was finally exercised). The genuine spenders are the **media**
routes — `/api/passport`, `/api/flow`, `/api/deeper`, `/api/audio` — i.e. the ones already
braced by the 3-uploads-per-hour-per-IP limit, because none of them can be reached without
pushing a real 10–20 MB video through the gate. Every real cost lands in the ledger via
`mechanic/clients.py` (`ledger.add(Call(...))`), which is exactly what the brake reads.

## 3c · THE STRICT CEILING (the concurrency race, and how it was closed)

Durable deltas bound **completed** spend. They cannot bound a **burst**: ten expensive
requests arriving together can all pass the budget check before any of their costs land.
Measured first, then fixed — admission is now **check + reserve in one synchronous block
with no `await` between them** (atomic on a single event loop), and each in-flight
expensive call holds a generous estimate (`media` 25 ₽, `expensive` 12 ₽) until its real
cost is accrued. `inflight` is capped at 3, and the reservation is released in `finally`.

**Proof (live, with the cap temporarily lowered to 30 ₽):**

```
6 PARALLEL costed calls  →  req2 200 · req3 200 · req4 200   (exactly 3 admitted)
                            req1 429 · req5 429 · req6 429   ("Сейчас много запросов…")
ledger real spend        =  1.51652 ₽
durable deltas on disk   =  0.50323 + 0.52370 + 0.48959 = 1.5165 ₽   ← reconcile exactly
in flight after          =  0 · reserved 0.0                          ← all released
cap restored             =  3000 ₽
```

So the cap is now a **strict ceiling on spend + in-flight**, with the overshoot bounded by
the reservation accuracy rather than by concurrency. (An in-flight reservation dies with
the process, which is correct: the call is gone too.)

## 4 · STILL OPEN (do not call the relay "secured" until these land)

- **Real authentication**: the hi5.bike session bridge (the shop's cookie is already
  domain-wide, so our relay receives it — validating it against the shop's session table
  and binding a `customer_id` to the diagnosis session is the Phase-1 work).
- **The single-use state machine**: session ids must be **minted server-side**
  (`POST /api/session/init`) and the expensive routes gated by funnel stage, so a script
  cannot spam an LLM route without first pushing a real 10–20 MB video through the
  pipeline. Our own v5.0.0 states (`STATE_0_CAMERA_GATE`, `STATE_P_ROUTING`,
  `STATE_P_NO_MATCH`, `STATE_P_WORKSHOP_ONLY`) are the blueprint — they were designed and
  never enforced.
- A **forged `Sec-Fetch-Site`** still passes. The header check raises the floor; it is not
  a boundary. Only identity + budget are.

## 5 · THE FITMENT EVIDENCE CONTRACT (the reviewer's next recommendation)

Fitment is **not** a catalog-search score. It is optical evidence intersecting physical
tolerances — three states, and the middle one is where honesty lives:

```
[ UNRESOLVED ]                    + mechanical-interface evidence (stamp, tooth count, profile)
      ↓
[ COMPATIBLE-BUT-UNVERIFIED ]     + the missing physical parameter (link count, pad backing,
      ↓                             caliper model, freehub standard)
[ CONFIRMED ]                     = the exact interface AND the operational constraint
```

| state | our `fit_status` | confidence | what the user sees |
|---|---|---|---|
| **CONFIRMED** | `exact` | **≥ 80 %** | SKU **and** price unlocked (price still from the server) |
| **COMPATIBLE-BUT-UNVERIFIED** | `compatible` | 40–74 % (and 75–79 %, see below) | the family and the standard are named; **zero SKU, zero price**; ask for the missing photo |
| **UNRESOLVED** | — | < 40 % | refusal: no SKU, no guess. Multiple non-interchangeable variants (6-bolt vs Centerlock, HG vs Micro Spline, flat vs post mount) land here by default |

**The threshold ruling (this conflict was real):** our routing threshold is 75 % but our
money law is 80 %. **The money bar wins — CONFIRMED sits strictly at ≥ 80 %; never lower
the price threshold to the routing threshold.** In the 75–79 % window the route proceeds
(directly, with no generic clarification fork), the standard is named — and **the copy must
never claim confirmation**:

> «Похоже, это кассета на 10 скоростей, стандарт Shimano HG, диапазон 11–46T.»
> «Чтобы подтвердить точную совместимость, нужна фотография маркировки — на общем плане не видно индекс модели и износ зубьев.»
> **[ Сфотографировать маркировку ]**

*(An earlier draft of this doc said «Совместимость подтверждена» here. Caught in review: at
75–79 % the state is COMPATIBLE-BUT-UNVERIFIED, and the user must never have to infer the
difference between a likely match and a verified one. «Похоже» + what is missing is the
honest register.)*

### The three states, explicit in the API contract (target)

```json
// GET/POST /api/parts/fitment  ->  this is the only shape the UI may render
{ "fit": {
    "state": "confirmed" | "compatible_unverified" | "unresolved",
    "standard_named": "кассета 10 скор., Shimano HG, 11–46T",
    "missing_evidence": ["маркировка кассеты", "число звеньев цепи"],
    "confidence": 82,
    "sku": "ACSM410010142",      // null unless state == "confirmed"
    "price_rub": 5749            // null unless state == "confirmed"
} }
```

**Invariants the server must enforce (not the UI):**
1. `sku` and `price_rub` are `null` unless `state == "confirmed"`.
2. `state == "confirmed"` requires `confidence >= 80` — the same bar as every other price.
3. `missing_evidence` is non-empty for every state except `confirmed`.
4. `unresolved` carries no `standard_named` claim the model cannot support.

**The state → copy map** (one line + one control, always):

| state | the line | the control |
|---|---|---|
| `confirmed` | the exact part + price from the server | [ Заказать деталь ] / [ Инструкция по замене ] |
| `compatible_unverified` | «Похоже, это {standard}. Чтобы подтвердить точную совместимость, нужна фотография {missing}.» | [ Сфотографировать маркировку ] |
| `unresolved` | «По одному видео стандарт не определить — {почему}.» | [ Сфотографировать узел ] |

**The evidence ladders for our highest-volume categories:**

| category | video pass | photo 1 | photo 2 |
|---|---|---|---|
| **Chains / cassettes** | drive-side video → speed count → *UNRESOLVED* | cassette face / lockring stamp (e.g. `CS-M4100`, `11-42T`) → standard + tooth range → *COMPATIBLE* | chain side-plates (`KMC X10`) or the derailleur cage → *CONFIRMED* |
| **Brake pads** | hydraulic post-mount identified → *UNRESOLVED* | caliper body stamp (e.g. `BR-MT200`) → pad shape via the caliper→pad map → *COMPATIBLE* | rotor stamp «Resin Pad Only» or the friction profile → compound → *CONFIRMED* |

**An honest limit we must keep:** **link count cannot be read from a photo** unless the user
lays the chain against a tape measure. We therefore derive it from the OEM spec for that
frame/chainring model and say so — never guess it.

**The refusal copy** (three cases — no SKU, no price in any of them):

| case | line | counter |
|---|---|---|
| photo unreadable | «Не вижу маркировку: нужен кадр крупнее и при лучшем свете.» + one re-shoot control | `s4_refusal_photo_unreadable` |
| attribute missing from our catalog | «Этой характеристики нет в нашем каталоге — подберём вручную.» + one control | `s4_refusal_attribute_missing` |
| catalog says `needs_adapter` | «Деталь не встанет без переходника ({adapter_type}). Подобрать с адаптером?» + one pill | `s4_refusal_adapter_required` |

## 6 · PROVENANCE

Rounds 1–4 with an external model, 2026-10-09/10 — R1 (my brief: the open proxy, the ladder
I proposed), R2 (it demolished my signed-cookie ladder as theatre and proposed the
single-use state machine; it also caught that my new 12 req/300 s limit would throttle real
users), R3 (I corrected its route table against our real `openapi.json` and flagged
`/api/ledger` + the booking/order routes; it ruled basket = budgeted-anonymous,
booking/orders = identity-required, and delivered the fitment contract), R4 (it ruled 80 %
over 75 %, demanded durable spend accounting, and produced the rule block). Everything in
§2, §3 and §3b was then implemented and verified live.

## 7 · THE SPA DEPLOY (2026-10-10, live)

The review-fix bundle is deployed to `/Andrey/` and verified in a real browser:
`/Andrey/assets/index-BqH-3e6q.js` + `/Andrey/assets/index-ihNSyzSH.css` (local md5 =
server md5), the served bundle carries the ask line and the two cards and contains **0**
occurrences of the old «Продолжить: » leak, and the guarded screen shows one control.

**A deploy bug was found and fixed on the way in:** the live `index.html` had **no
`window.__ANDREY_BASE__` injection**, so `PROXY_BASE` fell back to `"/andrey"` — and nginx
has no lowercase `/andrey` location (locations are case-sensitive), so the app's own API
calls were going to the shop and failing silently (the shop's catch-all answers 200 with
HTML). The injection is now in the served HTML: `window.__ANDREY_BASE__ = "/Andrey/relay";`,
and an in-page `fetch(__ANDREY_BASE__ + '/api/health')` returns the live brain payload.
**Any future SPA deploy must re-apply that injection** — it is not part of the Vite output.
Rollback: `/root/aim/backup_ui_ask_20261010_214512.tar.gz`.

