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

## 3 · Gemini: what the sources actually are (and what cannot be read)

The Gemini workspace holds **33 Gems** (saved chats / topic spaces) plus 3 Notebooks. Full URL census:
`cabinet-2026-10-15/ai_sources/_GEM_LINKS.json`. Cabinet-relevant Gems, read page-by-page over CDP:

| Gem | what it is |
|---|---|
| **Dispatching Round 9 Customer Cabinet** (`/app/20a9b6b0c744a7cb`) | a transcript of the **previous work session**: the Round 9 dispatch, verified git state, and the standing blocker |
| **Milestone Review and AR Readiness Analysis** (`/app/3966f775907e5821`) | the pre-AR state snapshot: what was DONE / PENDING, and the `ANDREY_TOKEN` fact |
| Production Plan for AI Bike Mechanic Feature (`/app/eab74c6f57353506`) | 1.3 kB — the page rendered almost nothing |
| Securing Multi-Cycle Bike App Design (`/app/a86d996ed28af734`) | **rendered empty (392 B)** — see the limitation below |
| Bike-Repair App Pricing Questions (`/app/83e1987ac7fc867c`) | **rendered empty (142 B)** |
| Hi5.bike User Cabinet Report (`/app/8030bdbaaf23f1a0`) | *our own* prompt+answer from 2026-10-15 (the fabricated notebook report) — not a project source |

**What the Round 9 dispatch Gem proves** (verbatim facts it records):

* the UI repo was pushed at **`b903e6e` — "docs(cabinet): merged CabinetSpec v1 + AI Studio Round 9 brief"**, `git ls-remote` verified; **`b903e6e` is confirmed an ancestor of today's HEAD**
* the App Builder fetched its instructions by `curl` from two public files:
  **`AI_STUDIO_BRIEF.md` (17.6 KB)** and **`CABINET_SPEC_V1.md`** — the brief is **in the repo now: 18,014 bytes**, the spec **47,980 bytes**
* the Round 9 scope: extend `CabinetScreen.tsx` with a five-section tab shell, the three-card dashboard,
  the unified History table (four filters + drill-down), the Repair Ticket blocks A–F, plus
  `Мои велосипеды` / `Запчасти и заказы` / `Платежи и документы` from mock data, and the sticky chat;
  create `src/types/cabinet.ts` + `src/mock/cabinet.ts`; extend `src/api.ts` behind `isMock`
* the non-negotiables: no router, no new dependency, no invented colour, **no money vocabulary on a
  free repair** («кредит», «баланс», «токен»), do not touch the AR screens or `src/types/ar.ts`
* the follow-on: *"Then Round 10 (the three deep sections) and the server track from the spec's §18"*
* the blocker, in its own words: **"Still waiting on you: ⚠ A12 (tokens vs the free-repair rule) — it
  blocks the backend, not this round; and the palette, which blocks nothing because the existing
  tokens are the working position."**

**What the Milestone Review Gem proves:** the brain requires **`X-Andrey-Token` on every `/api/*`**
route (`401` without it — the same gate that answered `401 unauthorized` in my cabinet tests), so any
AI Studio build must call the API through its **own server-side proxy** and never from the browser;
and the then-open product decisions were *AR stage alignment (S2 sub-state vs new S3)* and *AR pricing*.

### The limitation, stated plainly

**A Notebook whose sources you cannot read is not a source.** Notebook pages (`/notebook/<uuid>`)
render **nothing** into the DOM (`document.body.innerText` = 1,209 chars: the sidebar only; 0 shadow
roots; no content iframe), and when asked to quote them from an ordinary chat, Gemini answers
**INACCESSIBLE for every one** — with the honest note that only "high-level conversational summaries
exist in account logs". So the three Notebooks (`Hi5 search and edit`, `hi5.bike session notes`,
`hi5.bike handover notes`) have **no machine-readable path** today. To use them: open the notebook in
the browser and ask **inside** it (its own chat has the sources), or copy the text out by hand.
Two Gems (`Securing Multi-Cycle Bike App Design`, `Bike-Repair App Pricing Questions`) also rendered
empty, so **Q1 and Q4 remain unanswered by this pass.**


## 4 · Undecided — the questions that block the next build

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

## 5 · Two defects in the live `/api/cabinet` that need no decision

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

## 6 · How these AI sources were reached (so the next session does not re-derive it)

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

