# REVIEW 2026-10-13 — the free e-scooter lane (class gate → typed code → free advice)

Shipped and verified live. This is the handoff artifact: what exists, what was measured, what
is still open.

## 1 · What the owner asked for, and what is now true

* **Scooters are served, but only with FREE advice** — never the paid AI-repair lane.
* **v1 intake is a typed code**, not a microphone, a display photo or beep analysis (beep data
  exists for 16 of 138 machines, one brand — measured, so it stays deferred).
* **A scooter (or any non-vehicle frame) must never reach the money rail.** The class gate
  refuses it, and the refusal is a stable code the UI can branch on.

Verified live on 2026-10-13 (all read-only or free):

| what | result |
|---|---|
| screw-thread diagram photo (no vehicle) | `vehicle_class='other'`, `gate='not_a_bicycle'`, `lane='scooter_free'`, **no** verdict, `/api/verdict` → **409 `not_a_bicycle`**, funnel `stage=1`, `n_verdict=0` |
| scooter clip (B5 scenario) | refused, `paid_diy=false`, no bicycle identity, no cap consumed |
| bicycle photo (control) | `vehicle_class='bicycle'`, identity `Trek Fuel EX 8` 93 %, **no refusal**, paid lane still opens (`s13_cassette, s02_gear_adj, s12_chain`, `price_base=150`) |
| typed code `"ошибка Е2"` + Dualtron | `matched`, `E2`→norm `E002`, controller fault + advice, `paid_diy=false`, **0.67 s**, cost **0** |
| `E1` with no brand | `ambiguous_brand` + `dualtron/kugoo/xiaomi` (honest, not a guess) |
| `12` + brand `bosch` | `unknown` — the free lane cannot answer a bicycle drive-system code |
| empty code / GET | `400 empty_code` / `405` |

## 2 · The pieces

* `mechanic/code_normalize.py` — scheme-aware normalisation (numeric, prefixed, bitmask hex,
  bitmask padded, alnum) with Cyrillic homoglyph folding, so `"ошибка Е2"` (Cyrillic Е),
  `"E-2"`, `"e 002"` and `"0x 1020"` all reach the same row.
* `mechanic/scooter_codes.py` — the lane. Reads ONLY the canonical scooter list, so a bicycle
  or e-bike component code can never be answered by it (no-mixing by construction; a unit test
  asserts no bicycle parts language appears in any scooter code text — 0 hits over 138 rows).
* `POST /api/scooter/code` (`web/passport_api.py`) + `_RELAY_ROUTES["scooter/code"]` as
  **`cheap`** — correctly: it is a pure lookup, so no reservation and no spend-brake.
* UI `SCOOTER` state: entered from `lane === "scooter_free"` / `gate === "not_a_bicycle"`
  (passport, flow, or a 409) and from `?mock=1&lane=scooter` for review with zero spend.
  No price, no paid CTA, no booking — brand + display code, then advice.

## 3 · Two deploy traps, both now closed

1. The `window.__ANDREY_BASE__ = "/Andrey/relay"` injection is **not** part of the Vite output
   (already documented in `RELAY_BOUNDARY.md` §7) — re-applied, and now asserted by the deploy
   script itself.
2. **NEW:** the bundle must reference `/Andrey/assets/…`, never root-absolute `/assets/…`.
   `vite.config.ts` had **no `base`**, so the first deploy of this lane served a page whose
   module script was fetched from the SHOP root — the shop's catch-all answered `200 text/html`
   and the browser refused it (*"Expected a JavaScript-or-Wasm module script …"*). **`curl` was
   green the whole time** (`/assets/…` returned 200 either way); only a real browser exposed it.
   Fixed at the source: `base: "/Andrey/"`. Verify after every UI deploy:
   `curl -s -o /dev/null -w '%{content_type}\n' https://hi5.bike/Andrey/assets/<hash>.js`
   → must be `text/javascript`.

## 4 · Findings for the catalog/data track

* **Duplicate code in the canonical scooter list:** Dualtron `E2` and `E02` both normalise to
  `E002` but carry two different meanings (controller overheat/failure vs brake-lever sensor),
  and one of the two rows has **English** `probable_cause` text. The lane shows both readings and
  now says so in the UI («у этого кода несколько значений — сверьтесь с моделью»), but the row
  needs a human/verified source to resolve.
* `vehicle_knowledge.json` is **already consistent**: 1599 rows = 1285 bicycle + 176 e_bike +
  **138 e_scooter**, matching the canonical scooter list exactly. No regeneration pending.
* The anonymous SPA calls `GET /relay/api/cabinet` on mount; that route is deliberately not in
  the relay allowlist (auth-gated, Phase 1), so every anonymous visit logs a 404. Pre-existing
  and harmless, but it is noise in the console of a public page.

## 5 · Rollback

* UI: `tar xzf /root/aim/backup_ui_scooterlane_20261013_153510.tar.gz -C /root/aim/app/web/static`
* Server: `web/passport_api.py.bak_*` + remove the two `mechanic/` modules added at 15:08
  (`code_normalize.py`, `scooter_codes.py`).

## 6 · Follow-up, same day — the base is now HOST-NEUTRAL

`base: "/Andrey/"` from §3.2 fixed production and **broke the other host**: AI Studio Build serves
this same source tree from the Cloud Run **root**, so a rebuild from the repo would have asked for
`/Andrey/assets/…` there and killed the preview. The mount point is not a property of the source,
so it left the config:

| host | served at | build command |
|---|---|---|
| AI Studio Build (Cloud Run) | `/` | `npm run build` |
| hi5.bike/Andrey/ (the brain) | `/Andrey/` | `npm run build:selfhosted` (= `vite build --base=/Andrey/`) |

`_deploy_spa.py` now runs `build:selfhosted` itself and refuses to upload unless the artifact
carries `/Andrey/assets/…` and **no** root-absolute `/assets/…` — the flag cannot be forgotten, and
`_deploy_spa.py --check` exercises the whole guard without touching the server.

Verified (`_step1_verify.py`, 0 failures): no hardcoded `/Andrey/` path left in `src/`; root build →
`/assets/…`, served at the mount root as `text/javascript`, lane markers present; self-hosted build
→ `/Andrey/assets/…`; and **both** produce `index-BwmBENfS.js` — the same hash hi5.bike is already
serving, so the change is provably deployment-neutral and **no production redeploy was needed**.

