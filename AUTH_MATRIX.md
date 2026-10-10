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
## 3 · THE TESTS (the negative cases, and their status)

Against `http://127.0.0.1:8140` with the token / a cookie jar, and through the public relay.
**Status column = what has actually been run**, not what is planned.

| # | the negative case | the expected answer | status |
|---|---|---|---|
| 1 | **direct-to-expensive route**, no cookie: `POST /api/flow` | 401 (fail closed, never "continue anyway") | ⏳ needs the wiring |
| 2 | **skipped stage**: a fresh session (S0) → `POST /api/deeper` | 409 «Пропущен шаг» | ⏳ needs the wiring |
| 3 | **replay**: repeat the S1→S2 transition after it succeeded | 409 / the cached verdict (`sessions.set_analysis` already stores it) — never a second paid run | ⏳ needs the wiring |
| 4 | **parallel**: two simultaneous `POST /api/flow` on one session | exactly one 200; the other 409 (the lease CAS) | ⏳ needs the wiring |
| 5 | **expiry**: a session row with `expires` in the past | 401 | ⏳ needs the wiring |
| 6 | **another session**: a valid cookie + a *different* `session_id` in the body | the cookie's session is used; the body value is ignored | ⏳ needs the wiring |
| 7 | **no token, from the internet**: `POST /api/book` | **401** | ✅ **done — was 200** |
| 8 | **no token**: `POST /api/chat`, `/api/identify`, `/api/media`, `/api/basket/add` | **401** | ✅ **done — were 200/422** |
| 9 | **no token**: `GET /api/ledger` (our spend + funnel) | **401** | ✅ **done — was open** |
| 10 | the three cheap read-only ones stay reachable | 200 | ✅ done (`health`, `services`) |
| 11 | a token holder is unaffected | 200 | ✅ done (`ledger`, `health`) |
| 12 | the relay still works (it injects the token itself) | 200 / 404 / 401 per its own rules | ✅ done |

**What tests 7–9 proved, exactly:**

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

## 4 · WHAT IS ENFORCED TODAY vs WHAT THE MODULE ADDS

**Enforced today (verified live):**
1. The relay: same-site caller, an 11-route allowlist, method/verb/body guards, the
   per-IP limits, the video-ingest brake, the rolling-24 h spend brake with reservations.
2. **The token gate is now global** for `/api/*` (tests 7–11).
3. Per-route cost classification — including the **`blueprint` fix**: the brake audit found
   `/api/blueprint` (+ `/validate`) classified `cheap` although it can refresh from the
   model/web, so a costed route was exempt from the reservation. Now `expensive`.

**The module adds (built, not yet wired):** the stage machine, the CAS transitions, the
lease, the per-session caps, the cookie, and the identity gate. Wiring it means editing six
handler bodies in `passport_api.py` (place the `gate(...)` dependency, take the lease on the
costed routes, `advance()` on success) — a mechanical but invasive change that must land
with its own test run, not at the end of a long session.

## 5 · THE HONEST GAPS

1. **No real identity resolution yet** (the shop-session bridge) — identity-required routes
   fail closed.
2. **The state machine is not wired**, so the funnel is still ordered only by the SPA.
3. **Single worker only.** The spend brake's ledger *and* its in-process reservation state
   are per-process, and the app runs one worker today (`run.py --host … --port 8140`, one
   PID). Running `--workers N` would multiply the cap by N and split the ledger. The state
   machine is already multi-worker-safe (SQLite + CAS); the brake is not, and that constraint
   is now written down rather than assumed.
4. **The cap is only as tight as the reservation estimates.** It bounds spend + in-flight, so
   the overshoot is bounded by how well `_RESERVE_RUB` (`media` 25 ₽, `expensive` 12 ₽)
   covers the real per-call cost — evidence, not proof. Re-measure when traffic is real.
5. The **fitment contract** (`RELAY_BOUNDARY.md` §5) is a contract, not code: the brain does
   not yet emit `state`/`missing_evidence`, so nothing enforces those invariants today.

