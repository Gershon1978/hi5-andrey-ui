# TEST B — the real video → verdict path, run against PRODUCTION
**Date:** 2026-10-12 · **Path:** `https://hi5.bike/Andrey/relay/api/*` (the SPA relay) ·
**Mode:** act, live, no payment · **Result: the pipeline is PROVEN; 2 defects found.**

## 1. What was run
| step | call | expectation |
|---|---|---|
| 1 | `POST /relay/api/passport` (real .mov 1 473 617 B, h264 480×360, 8.62 s + audio, + `model`) | 200, mint session → **S1** |
| 2 | `POST /relay/api/flow` (same clip + symptom) | 200 and **S1 → S2** |
| 3 | read `funnel_state.db` (read-only SSH) | `stage=2` for that sid |
| 4 | `POST /relay/api/verdict` (`use_model=true`) twice | 1st ok, **2nd refused** |
| 5 | `POST /relay/api/flow` with a 100-byte broken `.mp4` on a FRESH session | error, no advance |
| 6 | `/api/ledger` (the service's own spend) | cost recorded, inside estimate |

The clip is a genuine 8.6 s capture already accepted by this pipeline (the owner's own upload,
`_uploads/s_rIW1as_1791806270832.mov`); it was re-uploaded over HTTP. What proves the media really
travelled: the vision stage ran for real in this process (`bp_visual` n=5, **37 703 input tokens**,
≈4.1 ₽ each) and the passport returned frame-derived signals (labels `G`/`G-BOOSTER`, deck, dust,
`whole_bike_visible: false`). **Not verified:** media retention — no file named after my session is
present in `_uploads/` afterwards, so the passport path evidently does not keep the upload (or
keeps it elsewhere). The unambiguous record of the run is the DB row created 18:42:59 UTC.

## 2. Verdict against the five required assertions

**(1) Upload succeeds and S1 → S2 advances — PASS**
`POST /passport` → **200**, `Set-Cookie: andrey_s` received, session `s_VkHJUonEsFNlwrh7ttq9y2W9`,
passport `gate: pass`, **confidence 93**, real specs from the KB (BB92, headset ZS44/28.6 /
ZS55/40, seatpost 31.6, mechanical cable, 10×135 QR).
`POST /flow` → **200**, and the live DB then reads
`{'sid': 's_VkHJUonE…', 'stage': 2, 'n_verdict': 0, …}` — **the transition is proven over HTTP.**
(AUTH_MATRIX §5.6 — "a real video producing S1→S2 is unproven" — is now closed. The DB also
already held two earlier S2 sessions from real media, 2026-10-10 and 2026-10-11.)

**(2) ≤3 causes with confidences, no invented services or parts — PASS**
`confidence 85`, `gate: verdict`, `round 0`, exactly **3** causes:
`s10_pads` 85 (keyword: скрип) · `s16_bb` 75 (model, "strictly under load") · `s07_tune` 70 (keyword: педал).
Every `job_code` resolves to the live shop menu, with the menu's own price band and duration
(`Замена колодок` 600–1 000 ₽, 15–20 мин). `parts` are the passport's spec-derived consumables
(B-Type pads, 10-speed chain, ≤2.25″ tyre) — nothing invented.
Fork: DIY 150 ₽ flat at tier 3 (highest group) with the `single-highest-tier` warning;
workshop 1 900–3 500 ₽ (the summed basket).

**(3) 80 % gate and one-verdict-per-session — 80 % gate PASS; cap MASKED (defect D2, §4)**
`gate: verdict` fired at 85 ≥ 80. The cap **is** enforced in the handler (verified live: `bump()`
0→1, a 3.43 s real model call, spend recorded) — but an **identical repeat never reaches the
handler**, so the documented **409 refusal is unobservable** (calls 2–3 returned 200 in 0.20 s,
no counter change, no spend). The app cannot learn "already used" from the server and must keep
that state itself.

**(4) A failed upload does not advance the funnel or consume entitlement — PASS (via the gate)**
Fresh session + broken `.mp4` → **401** `{"detail":"Сессия не найдена или истекла.","code":"session_expired"}`,
**no new row**, no counter moved, no spend. Fail-closed ✅.
*Caveat:* the refusal came from the stage gate (S0 < S1), not from the media validator, so the
ffprobe-rejection branch with a valid S1 session is still untested — a small follow-up.

**(5) Actual inference cost, inside ~25–37 ₽ — PASS, ~5× better than the estimate**
Read from the service's own `/api/ledger` (the ledger is in-memory per process, so a fresh
interpreter reads 0 — that is not a bug):
```
calls 11   total_rub 25.50457   USD_RUB 80.0   peak_now False
bp_visual    n=5  rub=20.51  sec=24.6   ← vision over frames ≈ 4.1 ₽/call
bp_web       n=4  rub= 3.39  sec=27.6   ≈ 0.85 ₽/call
verdict_diag n=2  rub= 1.61  sec= 6.6   ≈ 0.80 ₽/call
funnel: s2_first_answer 7 · diagnosis_delivered 7 · s4_cta_tap 4 · basket_attach 4 ·
        booking_attempt 1 · booking_failed 1 · media_processing_failed 0
```
A full video diagnosis ≈ **4–6 ₽** against a 25–37 ₽ estimate, so the 150 ₽ guide fee carries a
~25–35× gross margin on inference. (The 25.50 ₽ covers every run in this process — 7 diagnoses —
so 4–6 ₽ per video run is an inference, not a per-run meter; one instrumented run would pin it.)

## 3. Production state (unchanged by this test)
43 funnel rows; the new `s_VkHJUonE…` sits at stage 2 with `n_verdict=1`. Nothing else was
touched: no checkout, no payment, no product, no price, no fee change. `_AR_FEE_RUB` is still 0.

## 4. Defects found (both at the relay boundary, added 2026-10-11 — i.e. after AUTH_MATRIX)

**D1 — a cookie-less request can receive another visitor's cached response (real, medium).**
`web/passport_api.py`:
```python
_REPLAY_TTL = 300.0
def _replay_key(path, request, body):
    ck = request.headers.get("cookie") or ""     # EMPTY on a session's first call
```
The replay cache is keyed on (path, cookie, body-hash). That is correct for a session that already
holds a cookie — it is what makes a retry with a lost response harmless and prevents double
charges. But a session's **first** call has no cookie, so every cookie-less request with the same
body inside the 5-minute TTL collides: a second visitor posting the same passport body receives
the **first visitor's cached body — including their `session_id` — and no `Set-Cookie`**, then
401s on the next step. Observed live: session "B" was handed session "A"'s `session_id`, and every
subsequent call 401'd.
Not exploitable — a bare sid is not a capability (`verify()` also needs the cookie's 32-byte
secret) — but it breaks the first step for any visitor who types an already-used model name
inside a 5-minute window, and it leaks another session's id into a stranger's response.
*Suggested patch:* skip the replay cache when the cookie is empty (the double-charge case only
exists once a session exists), and never replay a response that mints state.

**D2 — the costed-verdict 409 is unreachable (real; low cost impact, high contract impact).**
Because the replay guard answers before the handler, repeating the same verdict body returns the
cached 200 instead of the documented 409. Money is safe (no second model call, no spend), but the
app's "you already received the model verdict" state can never be driven by the server response.
Consequently `AUTH_MATRIX.md`'s recorded PASS — "verdict #1 ✓ #2 refused" — is **stale**: it
predates the replay guard (2026-10-11).

**D3 — the identity is a pure function of the typed name, and the visual contradiction is only a
soft note (quality risk; wording corrected by Test B4).**
Re-run four ways on two different real clips (Test B4), the identity tracked the *text* field
exactly, never the video:

| clip | name field | result |
|---|---|---|
| bicycle (SAVA road bike) | *(none)* | `SAVA`, conf 65, **gate unknown**, "no authoritative source" |
| bicycle | `Trek Fuel EX 8` | `Trek Fuel EX 8 2022`, conf **93**, **gate pass, verified true** |
| e-scooter | `Scott Scale 970` | `Scott Scale 970 2018`, conf **93**, **gate pass, verified true** |
| e-scooter | *(none)* | no identity at all, **gate unknown** |

So the Scott name in the earlier run came from the text field alone — conf 93 is *by construction*
the code's exact-normalized-match score (`_identity_from_kb`), not a visual finding.
The passport **does** warn on a vision/KB disagreement ("Visual components may not match the
factory build (possible aftermarket upgrade) - verify before ordering.") — an earlier draft of
this note said it did not, and that was wrong. What actually stands is that the warning is only a
*note*: the gate, `verified` and the published confidence are untouched, and `sources` lists
`["kb","visual"]` even when the two disagree, which reads as agreement.
Two further findings from the same run: with `use_web=false` a **gate-pass/verified** passport can
carry **empty standards** (no bb/headset/seatpost), and the vision layer is non-deterministic on
one and the same clip (brand read as `Kugoo G-Booster` in one call, no brand at all in another).

## 5. Consequences for the paid flow (A)
* **Safe by construction:** every paid call carries the session cookie **and** the session id in
  its body, so its replay key is session-scoped. The D1 collision needs a cookie-less first call.
* **The replay guard is good news for payments:** a retried `ar/pay` whose response was lost
  returns the original response instead of charging twice. Keep it on those routes.
* The app must own the "model verdict already used" state (D2), and must never treat a cached or
  replayed response as proof of a fresh unlock — `ar/commit` (the CAS S2→S3) stays the single
  source of truth for an unlocked guide.

## 7. TEST B4 — leak hunt on the identity path (with a live debug trace)

Question raised by the owner: a **bicycle** had been tested earlier, so could that bike's identity
have "leaked" into the scooter run — i.e. was the Scott name anything other than the text field?
Answer: **no leak. The identity is a pure function of the typed name.**

A temporary `[DBG-ID]` trace was installed in the live `mechanic/bikepassport.py` (backed up to
`bikepassport.py.bak_20261012_195821` and `…_200038`), gated on `py_compile` **and** an import
test, and the service was restarted. Four passport calls, two real clips, unique bodies so the
relay's replay cache could not serve a stale response:

| # | clip | name field | result |
|---|---|---|---|
| 1 | bicycle (`_uploads/s_8h2U7K_…mov`) | *(none)* | `SAVA`, conf 65, **gate unknown**, "no authoritative source" |
| 2 | bicycle | `Trek Fuel EX 8` | `Trek Fuel EX 8 2022`, conf **93**, **gate pass, verified true** |
| 3 | e-scooter (`_uploads/s_rIW1as_…mov`) | `Scott Scale 970` | `Scott Scale 970 2018`, conf **93**, **gate pass, verified true** |
| 4 | e-scooter | *(none)* | no identity at all, **gate unknown** |

Live trace (journald, `[ID]` lines):
```
DECIDE q='SAVA'           | kb=- - - conf=-                     | vis=SAVA  conf=65           | agree=False | CHOSE=SAVA  conf=65 gate=unknown | sources=['visual']
DECIDE q='Trek Fuel EX 8' | kb=Trek Fuel EX 8 2022 conf=93 score=120 | vis=SAVA  conf=65           | agree=False | CHOSE=Trek Fuel EX 8 conf=93 gate=pass | sources=['kb','visual']
DECIDE q='Scott Scale 970'| kb=Scott Scale 970 2018 conf=93 score=120| vis=Kugoo G-Booster conf=65 | agree=False | CHOSE=Scott Scale 970 conf=93 gate=pass | sources=['kb','visual']
NO-CANDIDATES q=''        | vis=None                            | warnings=["No identity source matched 'the photos'."]
```
Same bicycle clip: `unknown` when unnamed, `Trek` when named Trek. Same scooter clip: `unknown`
when unnamed, `Scott` when named Scott. Identity moved with the **text**, never with the video.

Mechanism, from the source: `_identity_from_kb()` scores `conf = 93` when the normalized query
**exactly equals** the KB row — so 93 *is* "typed name matched a KB row", not a visual finding.
`resolve_identity()` then sets `sources = sorted({kb} ∪ {visual})`, so `"visual"` appears in
`sources` even when `_agree()` is **False** — which reads as agreement but is not.

New findings from this run:
1. The disagreement **is** warned ("Visual components may not match the factory build … verify
   before ordering."), but only as a note: `gate`, `verified` and the confidence are unaffected.
2. `passport.verified` means "the identity gate passed", **not** "the specs are verified" — the KB
   row's own `verified` flag was **False** in both named cases.
3. With `use_web=false`, a **gate-pass/verified** passport can carry **empty standards** (no
   `bb_shell`, `headset`, `seatpost`), so "verified" can accompany "no data".
4. The vision layer is non-deterministic on one and the same clip: brand read as `Kugoo G-Booster`
   in case 3 and as *no brand at all* in case 4.

The Oct-11 clip is, per the vision layer, a **SAVA aero road bike** (700c, integrated cockpit, aero
seatpost, dropped seatstays) — not the Scott remembered. The Scott references on the box come from
*typed* tests: the KB holds Scott Scale 970/940/20 and the Oct-8 blueprint cache holds
`scott big jon`.

**Revert the trace with:**
`cp -a /root/aim/app/mechanic/bikepassport.py.bak_20261012_195821 /root/aim/app/mechanic/bikepassport.py && systemctl restart ai-mechanic`

## 8. Reproduction
`_test_b.py` (main run), `_test_b2.py` (cap isolation), `_test_b3.py` (cache identity),
`_test_b4.py` (leak hunt), `_dbg_patch_srv.py`/`_dbg_fix.py` (the gated live-trace install),
`_probe_*.sh` (read-only live probes). Outputs: `_test_b_out.txt`, `_test_b2_out.txt`,
`_test_b3_out.txt`, `_test_b4_out.txt`.
