# ANDREY — ROUTE / STATE / AUTHORIZATION MATRIX

**Status:** the matrix and the state module (`web/funnel_state.py`) are built. The **wiring
into the routes is deliberately NOT deployed yet** — see §4 for exactly what is enforced
today versus what the module adds. Nothing here is claimed as secured.

## 1 · THE STATE MODEL

```
S0_NEW ──(a video the brain accepted)──► S1_BIKE_SEEN ──(a verdict)──► S2_VERDICT
   │                                          │                          │
   minted server-side                 the bike is known           a diagnosis exists
```

- **Mint:** `secrets.token_urlsafe(18)`, server-side only. The client never chooses an id;
  a `session_id` in a request BODY is ignored (the cookie wins).
- **Cookie:** `andrey_s` — HttpOnly, SameSite=Strict, Secure, `Path=/Andrey` (the *public*
  path, because nginx strips `/Andrey` before the app), 30 min sliding TTL.
- **Storage:** SQLite `funnel_state` (survives restarts, and correct across worker
  processes because transitions are compare-and-set, not an in-process lock).
- **Transitions are CAS:** `UPDATE … SET stage=? WHERE sid=? AND stage=?` — `rowcount == 1`
  means *this* caller made the transition. A replay or a parallel request gets 0 and is
  refused.
- **One paid call per session at a time:** a `busy_until` lease (CAS) so a double-tap, a
  retry or a parallel request cannot start two paid pipelines.
- **Per-session caps:** `n_verdict < 1` (a costed `/api/verdict`), `n_deeper < 2`.
- **Progress only on success:** `advance()` runs after a 2xx upstream response, so a
  rejected or unreadable upload never consumes a stage.
- **Fail closed:** no/expired/unknown session at a stage above S0 → 401; a legal session at
  too low a stage → **409 «Пропущен шаг: сначала S1_BIKE_SEEN.»**; identity required and
  absent → 401.

## 2 · THE MATRIX (every route/method that exists today)

`auth` = the level: **public** (no token, cheap, read-only) · **token** (the app's own
clients) · **session** (a valid cookie + the stage) · **identity** (a validated hi5.bike
customer) · **internal** (token only, never browser-reachable).

| route | method | source | state required | auth | in the relay allowlist | enforced today |
|---|---|---|---|---|---|---|
| `/` | GET | server.py | — | public | yes (the page) | n/a |
| `/passport` | GET | passport_api | — | public | no | n/a |
| `/api/health` | GET | server.py | — | public | yes (`cheap`) | ✅ public |
| `/api/services` | GET | server.py | — | public | yes (`cheap`) | ✅ public |
| `/api/capture` | GET | passport_api | — | token | yes (`cheap`) | ✅ token (router) |
| `/api/blueprint` | GET, POST | passport_api | **S1** | token | yes (`expensive`) | token ✅ · state ⏳ |
| `/api/blueprint/validate` | POST | passport_api | **S1** | token | yes (`expensive`) | token ✅ · state ⏳ |
| `/api/capture/check` | POST | passport_api | S0 | token | yes (`media`) | token ✅ |
| `/api/passport` | POST | passport_api | **S0 → mint → S1** | token | yes (`media`) | token ✅ · state ⏳ |
| `/api/flow` | POST | passport_api | **S1 → S2** + lease | token | yes (`media`) | token ✅ · state ⏳ |
| `/api/deeper` | POST | passport_api | **S2** + lease + `n_deeper < 2` | token | yes (`media`) | token ✅ · state ⏳ |
| `/api/verdict` | POST | passport_api | **S1** + lease + `n_verdict < 1` | token | yes (`expensive`) | token ✅ · state ⏳ |
| `/api/handoff` | POST | passport_api | **S2** | token (**identity** when the shop bridge lands) | yes (`expensive`) | token ✅ · state ⏳ |
| `/api/audio` | POST | passport_api | **S2** + identity (paid voice) | token + identity | **no** (excluded) | token ✅ |
| `/api/book` | POST | server.py | — | **identity** | **no** | ✅ token (new) · identity ⏳ |
| `/api/basket` | GET | server.py | — | **identity** | **no** | ✅ token (new) · identity ⏳ |
| `/api/basket/add` | POST | server.py | — | **identity** | **no** | ✅ token (new) · identity ⏳ |
| `/api/ledger` | GET | server.py | — | **internal** | **no** | ✅ 401 (was wide open) |
| `/api/chat`, `/api/cta`, `/api/identify`, `/api/media` | POST | server.py | — | **internal / legacy** | **no** | ✅ 401 (were wide open) |
| `/relay/api/{path}` | GET, POST, OPTIONS | passport_api | per the upstream route | same-site + the allowlist | — | ✅ |

**Two deliberate decisions, stated so they can be reversed in one line:**
1. **`handoff` stays token+session, not identity — for now.** It creates a workshop ticket
   (a business record) but it is *not* customer-specific and it is the flop-capture path the
   product depends on; the SPA has no login UI yet, so requiring identity here would break a
   live button with no way for the user to comply. `book`/`basket`/`audio` — the genuinely
   irreversible, customer-specific actions — are identity-required now.
## 3 · THE TESTS — ACTUAL RESULTS

**Unit (`web/funnel_state.py`, in-process, real SQLite, real threads): 31 PASS / 0 FAIL.**

```
PASS  a fresh session is S0                     PASS  the capability is >= 32 bytes
PASS  sid ALONE is not a capability             PASS  sid + a wrong cap is refused
PASS  sid + the right cap is accepted           PASS  another session's cap is refused
PASS  an expired session resolves to None       PASS  an expired cookie is refused
PASS  S0->S1 wins                               PASS  the SAME transition replayed loses
PASS  S1->S2 wins                               PASS  S1->S2 replayed loses
PASS  a stage cannot go backwards               (this one FAILED first — see §6)
PASS  exactly ONE of 8 parallel transitions won (got 1)
PASS  the first lease is granted                PASS  a second concurrent lease is REFUSED
PASS  an EXPIRED lease is reusable              PASS  the crash did NOT consume the stage
PASS  ...the retry may advance                  PASS  the stage STILL consumes only once
PASS  exactly ONE of 8 parallel leases won (got 1)
PASS  deeper #1 / #2 allowed, #3 REFUSED        PASS  costed verdict #1 allowed, #2 REFUSED
PASS  handoff #1 allowed, #2 REFUSED
```

**Live, from an external client over the public relay: 9 PASS / 0 FAIL (binding) + 16 PASS / 0 FAIL
(the rest).**

| # | what | result |
|---|---|---|
| B1 | `verdict`, no cookie | **401** «Сессия не найдена или истекла» |
| B2 | valid cookie at S0 | **409** «Пропущен шаг: сначала S1_BIKE_SEEN» |
| B3 | `sid` + **forged cap** | **401** |
| B4 | **bare `sid`**, no capability | **401** |
| B5 | **expired** session | **401** |
| B6 | `sid A` + **cap of session B** | **401** |
| B7 | session B's own stage | **409** (its own S0 — sessions are independent) |
| B8 | `handoff` at S0 | **409** «сначала S2_VERDICT» |
| B9 | the 0 ₽ `verdict` path is gated too | **409** |
| A3 | **`Set-Cookie` returned THROUGH the relay** | ✅ `Path=/Andrey; Max-Age=1800; HttpOnly; SameSite=strict; Secure` |
| D1 | `handoff` at S2 (fresh session) | **200** + a ticket |
| D2 | the same `handoff` **replayed** | **409** «Заявка по этой сессии уже создана» |
| D3 | **two concurrent** handoffs, one session | **200 / 409** — exactly one ticket |
| C1 | malformed JSON at S2 | **422** (the gate let it through to the schema) |
| C2 | 20 KB body at S2 (16 KB cap) | **413** |
| E1–E5 | relay health/capture/services, SPA page + bundle | **200 200 200 200 200** |
| E6 | relay `/ledger` | **404** (our spend refused) |
| E7 | `X-HTTP-Method-Override` | **400** |
| E8 | no same-site proof | **401** |
| F | **spend for the whole suite** | `calls 0, total_rub 0` → **0 ₽** |

Browser: the SPA loads, the intent gate renders («Покажите велосипед…» + the button), console clean
for the page; the SPA's relay calls return 200.

**Two runs were invalid and are reported as such, not as passes:** a server-side run came back
`429` on the whole A-block because that IP had already spent both the relay's 12/300 s budget and
the 3-videos/hour ingest brake — the brakes working, but masking the gate. Re-run from a fresh
client IP without any media route, the block is the 9/9 above.


## 3b · THE ROUTER HOLE (closed 2026-10-10)

```
BEFORE                                  AFTER
POST /api/book        → 200             → 401
POST /api/chat        → 200             → 401
POST /api/identify    → 422 (= reached validation)  → 401
POST /api/media       → 422             → 401
POST /api/basket/add  → 422             → 401
GET  /api/ledger      → 200 (open)      → 401
```

Cause: `require_token` was a dependency of the **passport router only**. `server.py`
registered its own routes (`chat`, `cta`, `identify`, `media`, `book`, `basket`, `ledger`)
with **no gate at all**, so they were reachable from the internet without the token. Fixed
with a global `/api/*` middleware in `server.py` (three cheap read-only routes exempt), on
top of the relay's own allowlist which never exposed them anyway. This is a *different* hole
from the relay one: the relay was an open proxy; this was an ungated router.

## 4 · WHAT IS ENFORCED TODAY

1. The relay: same-site caller, an 11-route allowlist, method/verb/body guards, the per-IP
   limits, the video-ingest brake, the rolling-24 h spend brake with reservations.
2. **The token gate is global** for `/api/*` (`health`/`capture`/`services` exempt).
3. Per-route cost classification, including the `blueprint` reclassification to `expensive`.
4. **The funnel state machine, wired and live**: `passport` (S0 → mint → S1), `flow` (S1 → S2),
   `deeper` (S2 + ≤2 rounds), `verdict` (S1 + ≤1 costed call), `handoff` (S2 + ≤1 ticket),
   `capture/check` (S0, mints early), `audio` (S2 + identity → fails closed).
   The relay now **transports the session cookie** both ways — it did not before (§6, #2).

## 5 · THE HONEST GAPS

1. **No identity resolution yet** (the shop-session bridge) → `book`/`basket`/`audio` fail closed.
2. **A deliberate re-analysis is allowed by design.** `flow`/`passport` are gated "≥ S1 / ≥ S0"
   because a visitor must be able to analyse a second bike. A retry after a *failure* is
   legitimate; a manual re-shoot re-runs the paid flow. An exact-stage gate is a product decision,
   not a bug fix, and it was not taken in this pass.
3. **The residual duplicate window.** If the process dies between the upstream 2xx and the
   `advance()` write, a retry re-runs that one paid call. The media routes carry no upstream
   idempotency key, so the guarantee is *at most one duplicate across a crash* — not exactly-once.
   The write sits adjacent to the call (nothing in between), which shrinks the window to a single
   SQLite write; it does not close it.
4. **Single worker.** The brake's ledger *and* its reservations are per-process; the state machine
   is multi-worker-safe (SQLite + CAS). `--workers N` would multiply the cap by N.
5. **The cap is only as tight as `_RESERVE_RUB`** (`media` 25 ₽, `expensive` 12 ₽) — evidence, not proof.
6. **The full media happy path was not run end-to-end** (it needs a real video, a camera and money).
   Proven instead: the gate order, the cookie transport, the transitions (unit), and that an upload
   does reach the brain through the relay (its ffprobe rejection came back at 19:15). The unproven
   step is a real video producing S1→S2 over HTTP.
7. The **fitment contract** (`RELAY_BOUNDARY.md` §5) is still a contract, not code.

## 6 · WHAT THE TESTS CAUGHT (why they were worth writing)

1. **`advance()` was not monotonic.** `advance(sid, S2, S1)` *succeeded*, so a caller could walk the
   funnel backwards. The wired routes only ever pass ascending stages, so it was not exploitable —
   but the invariant now lives in the SQL (`AND stage<?`), not in the callers' discipline.
2. **The relay did not transport the cookie.** It built a fresh header dict (`content-type` + token)
   and returned only `content/status/content-type`, so the browser's session never reached the
   handler and `Set-Cookie` never reached the browser: every relayed call would have looked like a
   brand-new session, and `flow` would have 409'd on the live SPA. Fixed: forward `Cookie` in,
   `set-cookie` out.
3. **FastAPI discards headers written to an injected `Response`** when the endpoint returns its own
   Response object — and `passport` (the first route that can mint) returns a `JSONResponse`. A
   cookie set inside the dependency would have been silently dropped one step into the funnel.
   Fixed with a middleware that mutates the real outgoing response.
4. **`handoff` costs 0 ₽** (`build_verdict(..., use_model=False)` by default) — which is why it was
   the right free route for the positive/replay/parallel tests, and why the suite cost nothing.


