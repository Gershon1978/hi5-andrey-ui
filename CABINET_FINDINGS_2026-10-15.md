# CABINET FINDINGS — what exists, what is trustworthy, what is undecided · 2026-10-15

Written after AI Studio and Gemini were made reachable. **Every claim below is labelled by source and
by how it was verified** — because the two AI sources disagreed, and one of them invented things.

## 1 · What actually exists (verified by reading the pages)

**Google AI Studio → BUILD → *My apps*** (`aistudio.google.com/apps?source=user&tag=created-by-you`),
read over CDP on 2026-10-15:

| app | description (verbatim) | updated |
|---|---|---|
| **hi5-andrey-ui** | "Imported from GitHub: Gershon1978/hi5-andrey-ui" | 2 days ago |
| **Hi5.bike Query Engine** | "Autonomous mechanical research agent for the Andrey AI mechanic with parallel federated retrieval, OEM technical verification, and exact replacement SKU synthesis." | 1 day ago |
| **Hi5 Bike Query Engine** | "Lightweight MCP web search tool and 10-bike testbench for on-demand parts, bottom bracket standards, and model-year variant extraction." | 20 hours ago |
| hi5-andrey-harness | "Imported from GitHub: Gershon1978/hi5-andrey-harness" | 6 days ago |
| iCloud Bike & E-Scooter Photo Scanner | photo scanner | Oct 1, 2026 |
| BikeSnap Organizer | photo organizer | Oct 1, 2026 |
| Andrey \| AI Веломеханик hi5.bike | the original photo-mechanic app | — |

So **host A is `hi5-andrey-ui` in AI Studio**, a *copy* of the repo (AI Studio imports; it never
pushes — DEPLOY_MATRIX). There is **no recorded Cloud Run preview URL anywhere in the repo**
(`DEPLOY_MATRIX.md` says `ais-dev-…run.app`, elided), so the preview is only reachable from inside
AI Studio.

**Gemini** sidebar — Notebooks: `Hi5 search and edit`, **`hi5.bike session notes`**,
**`hi5.bike handover notes`**, `Bicycle Model Database Aggreg…`; and a thread **"Round 9 Customer
Cabinet Production Plan for AI Bike Mechanic Feature Milestone Review and AR Readiness"**.

**Authoritative cabinet document (already in this repo):** `CABINET_SPEC_V1.md` (811 lines) — the
merged contract: locked decisions D1–D12, the data model, the API surface, and the verified live-store
facts. When anything below disagrees with it, **it wins**.

## 2 · What the AI sources said — and how much to trust it

**AI Studio's data-model report** (`cabinet-2026-10-15/AISTUDIO_cabinet_datamodel_report.md`) —
**trustworthy, with one caveat.** It correctly states it *cannot* introspect our AI Studio workspace,
then gives a sound analysis: no viable source for `BikePassport[]`; `oc_crm_job` only *partially*
viable; history rows viable from `oc_order`/`oc_order_product`/`oc_return`/`oc_order_status`;
**`Просмотрено` and `Рекомендовано` CANNOT be derived from order status** (they are diagnostic
states) — matching spec §7.3. *Caveat:* its numeric status ids are **OpenCart defaults**
(Оплачен = 2, Доставлено = 5) and contradict the live-verified ids in spec §7.3 (17 = Оплачен,
3/24/5 = Доставлено). **Use the spec's map, not this one.**

**Gemini's notebook report** (`cabinet-2026-10-15/GEMINI_notebooks_cabinet_report.md`) —
**NOT trustworthy; treated as unverified.** It paraphrases the project well but fabricates specifics:

* lists five API routes as "Exists / In Progress" — `/api/cabinet/profile|bikes|tickets|orders|chat`.
  **None of those exist.** The designed surface (spec §12.1) is `/api/cabinet`, `/api/cabinet/job/{id}`,
  `/api/cabinet/part/{id}`, `/api/cabinet/ask`, `/api/cabinet/summary`, `/api/ar/select-cause`,
  `/api/ar/pay` — and today only `/api/cabinet` is live (deployed 2026-10-15).
* calls the phone join **"Decided (linked via phone number)"** for every entity. The spec says the
  opposite: *"⚠ A phone join is fragile (a shared or family number cross-links customers) … **it needs
  an explicit decision**"*. It is **open**, not decided.
* invents a mock "New User / Active Repair / Completed Service" tier switch; the real mock switch is
  the one-liner `VITE_AR_MOCK` / `?mock=1`.
* cites a "100 % free web interface, zero paid API dependencies" constraint that belongs to no ruling
  in the spec.

**Conclusion:** the notebooks may still contain genuine material, but this summary is not evidence.
If we want the notebooks' content, it must be read item by item and checked against `CABINET_SPEC_V1.md`.

## 3 · Undecided — the questions that block the next build

Owner decisions (nothing can be built around them by guessing):

| # | question | blocks |
|---|---|---|
| Q1 | **Tokens vs free-repair entitlement** (A12/A6 vs the free-repair rule; the spec flags it as *the* contradiction and says "strike A12 + A6, or reinstate them") | §2, §7, §9, §10 — the whole reward/credit surface |
| Q2 | **The CRM join key.** `oc_crm_job` has no `customer_id`/`order_id`, only `client_phone`. Decide the key, and accept or reject the phone-join risk | every workshop-side ticket, and the "a customer cannot retrieve another customer's records" guarantee |
| Q3 | **Guest → customer merge path** (A8/B10). The store is 89 % guest: 187 of 209 orders carry `customer_id = 0` | a freshly registered customer's history is empty without it |
| Q4 | **Bike ownership semantics:** may a customer own two identical bikes? may a bike transfer between customers (used sale)? | the shape of `ai_repair_bike` |
| Q5 | **Ticket ↔ order boundary:** does a repair ticket become an `oc_order` (parts/labour as line items), or keep an independent lifecycle (sub-stages, mechanic, warranty)? | `ai_repair_job` design |
| Q6 | **The identity key for an anonymous diagnosis** (telephone / Telegram chat_id / browser token) used to attach history at registration | the merge, and a ticket's ownership provenance |

Two more from spec §19: the qualifying-event floor (≥ 1 000 ₽ and a non-«AI-ремонт» line) and the
Round 9 / Round 10 split (which of the five sections are stubs).

## 4 · Two defects in the live `/api/cabinet` that need no decision

Both revealed by the spec, both in the code deployed on 2026-10-15:

1. **History status mapping.** `cabinet_payload()` currently maps any `order_status_id > 0` to
   `"paid"`. Spec §7.3 holds the **verified** map: 1 = Ожидает оплаты · 17 = Оплачен · 2/15 =
   В обработке · 18/19/22/23 = В пути · 3/24/5 = Доставлено · 8/11/13 = Возврат ·
   7/9/16/20/10/14 = Отменено. A *delivered* order must not read as "paid".
2. **Guest orders are not attached.** `cabinet_payload()` calls `get_cabinet_data(customer_id)`
   without the customer's email/telephone, so the module's guest-order branch (scoped to
   `customer_id = 0`) never fires — and 89 % of orders are guest. Spec §13.2 calls this
   "an acceptance test, not an edge case".

`Просмотрено` and `Рекомендовано` cannot be produced at all until the diagnosis store exists (Q5).

## 5 · How these AI sources were reached (so the next session does not re-derive it)

* The `gemini-server` MCP needs a Chrome with CDP on **port 9222** using the dedicated profile
  `%USERPROFILE%\gemini-mcp-profile`. `C:\Users\Gershon\Documents\Cline\MCP\gemini-server\start_chrome.bat`
  ends in `pause` and blocks an automation shell; use the no-pause variant
  `_start_chrome.bat` in the chat workspace root instead.
* **Both tools failed with "composer refused the prompt: wanted N chars, composer holds 0"** until the
  AI Studio promo dialog was dismissed. Its buttons are `"OK, got it"` and `"Unlock Gemini 4 Argon…"`.
  `_cdp_dismiss.js` (chat workspace root) clicks them over CDP; after that, `gemini_studio_ask`
  returned `STUDIO_OK` and both reports were produced.
* `_cdp_apps.js` reads the BUILD → My apps / Gallery lists and writes a UTF-8 JSON report (the
  terminal returns UTF-16 and mangles long output — always have these scripts write a file).

