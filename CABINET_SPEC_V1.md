# CABINET_SPEC_V1 — AI Repair customer cabinet

**Version 1.0 · merged spec · 2026-10-12**
**Target:** Google AI Studio App Builder (UI, mock-first) + the AI Repair backend (`/root/aim/app`)
+ the existing ocStore shop at hi5.bike.

**Provenance (three inputs, merged):**
1. The owner's rulings in conversation (this session).
2. The GPT-authored spec v1.0 (product/UX/integration).
3. The live-evidence audit — verified against the running store and the deployed code.

**Authority order (highest first).** When two rules disagree, the higher one wins:
1. The owner's **latest** ruling in conversation.
2. Answered items in `Money/TODO.md` (`A1`–`A11`) and the owner rulings at the head of
   `BUILD_SPEC_AI_REPAIR.md`.
3. **This file.**
4. The GPT spec v1.0 (its §3 palette and its 70 % fitment reference are superseded — see §A/§O).
5. Older plans (`PLAN_CRM_FITMENT_20261011.md`, `Money/RULE-*.md`).

**Nothing in this file is deployed.** It is a build contract, not a report of work done.

---

## ✅ RULED — 2026-10-15: the entitlement is a FREE REPAIR. No tokens.

The owner ruled in conversation: **"free repair. no tokens."** That settles the contradiction below in
favour of the free-repair reading, so:

* **A12 is struck** (no "tokens as a product inside ocStore", no token ledger).
* **A6's `balance_due_rub = balance_rub − 150` is struck** (the 150 ₽ does not come off a parts balance).
* §2, §7 (history rows), §9 (payments) and the "what the customer must not see" list all stand as
  written: the entitlement is a **repair job**, never money, and it is never presented as money —
  no «кредит», «баланс» or «токен» reaches the customer.

The contradiction as it was recorded before the ruling is kept below for the audit trail.

<details>
<summary>Original ⚠ OPEN box (superseded)</summary>

`Money/TODO.md` **A12** (opened 2026-10-11) wanted **tokens as a product inside ocStore**:

> *"150 ₽ AI diagnostic fee is applied towards service visit 1-to-1, and with 100 % credit in
> repair tokens where 150 repair tokens = 150 rub. … Let's introduce tokens as a product inside
> ocStore. User buys tokens which we use inside the AI mechanic as AI tokens."*

**A6** (answered the same day) added that the 150 ₽ comes **off the parts balance**
(`balance_due_rub = balance_rub − 150`).

Both describe the entitlement as **money**; the reward rule locked in that session said the opposite:
*"the entitlement is a repair job, not money; no monetary wallet, no token balances."* The open action
was: *"strike A12 + A6, or reinstate them and delete §2.2/§2.3."*

</details>


---

## 0 · Locked decisions

| # | Decision |
|---|---|
| D1 | **Two surfaces.** A = a compact block on the store account page (OCMOD). B = the full cabinet, extending `CabinetScreen.tsx`. |
| D2 | **One entitlement = one repair job.** Never presented as money. |
| D3 | **Grant** on a qualifying event only: paid order, total ≥ 1 000 ₽, containing ≥ 1 line that is **not** the «AI-ремонт» product. |
| D4 | **Idempotent granting** enforced in the schema: `UNIQUE(customer_id, source_type, source_id)`. |
| D5 | **Atomic consumption** (CAS) + the existing per-session lease; a double tap spends one. |
| D6 | **Refund rule:** revoke an entitlement **only while `open`**; never claw back a `spent` one. Refunds themselves are the store's (100 %, see A2). |
| D7 | **Physical-visit and workshop-work rewards are deferred** in v1 until a verifiable record exists. |
| D8 | **Navigation:** state-driven tabs inside `CabinetScreen.tsx`. **No router, no new state library, no new dependencies.** |
| D9 | **Round 9 scope:** dashboard + navigation shell + History + Ticket scaffold. Split; not all five sections. |
| D10 | **Design:** the app's existing `:root` tokens (blue/navy/white, round, system sans). **Palette left open** — add no new colour. |
| D11 | **Chat:** text chat exists in the cabinet. Keyboard-less (P2) governs the **active repair loop**, not account management. |
| D12 | **Payments:** display the store's actual records. No invoices, no VAT, no computed tax — the Yandex module in ocStore owns all of it. |
| D13 | **Verification:** two separate gates. Reuse `part_order`; invent no second deposit/balance workflow. |
| D14 | **Fitment bar = 80 %, everywhere** (owner A1: *"keep 80 % certainty everywhere, for simplicity"*). `RULE-PART-MATCH-70.md` is **superseded**; do not add `MATCH_CONF_FITMENT`. |
| D15 | **Media is never deleted** (A7 + B15). `purge_media` must not be called; the deletion policy is removed, widening rule R1 from *guide only* to *all*. |
| D16 | **Registration happens after a purchase** (A8) — so the cabinet must handle a customer whose earlier orders are guest orders (`customer_id = 0`). |
| D17 | **There is a second database.** `/var/www/hi5.bike/crm/` owns the workshop job cards; `oc_customer`/`oc_order` own the people and the money. **(A9: two truths, one join key.)** |

---

## 1 · Product architecture

**Surface A — the store account page.** A compact AI Repair block, embedded in the existing
OpenCart account page, rendered only when the customer is logged in. It shows: available free
repairs · latest repair (date, problem, status) · latest order (date, item, actual price,
status) · one button **«Открыть кабинет AI-ремонт →»**.

Implementation: an upgrade-safe ocStore **module/OCMOD**, with a small JS client that requests
`GET /api/cabinet/summary` asynchronously.
* It must **never** be rendered through a PHP→FastAPI call on every account-page view.
* **401 ⇒ the block is hidden, silently.** It is never an error toast, and the store page must
  keep working when the AI Repair app is down.

**Surface B — the cabinet.** The main workspace, inside the Andrey app. Five sections
(§5.3), a dashboard, and the chat. It consumes the API in §12.

---

## 2 · The reward rule

### 2.1 What the customer sees

* «Доступен 1 бесплатный ремонт» · «Доступно 3 бесплатных ремонта» · «Бесплатных ремонтов нет»
* Primary action: **«Начать новый ремонт»**, with an indication that a free repair will be used.

Russian pluralisation is required: `ремонт` (1, 21, 31…) · `ремонта` (2–4) · `ремонтов` (0, 5–20).
Rendering `«Доступен {N}»` for every N is a **bug** in the current screen.

### 2.2 What the customer must never see

No 150 ₽ credit · no monetary wallet · no token balance · no ruble value on a free repair · no
language implying the entitlement is cash, a discount or a refundable balance.
Store prices, order totals, amounts paid and refunds stay visible **in the order and payment
records** — that is a different thing, and it is allowed.

**The boundary, stated once:** *150 ₽ as the price of the «AI-ремонт» product at checkout is
fine; 150 ₽ as a discount on a parts order is banned.*

### 2.3 Grant

Grant **exactly one** entitlement when all of these hold:
1. the order is **paid** (see the status map in §7.3);
2. its total is **≥ 1 000 ₽**;
3. it contains **≥ 1 line whose `product_id` is not the «AI-ремонт» product**;
4. no entitlement already exists for `(customer_id, source_type, source_id)`.

Rule 3 exists to kill a self-granting loop: without it, buying AI-ремонт for 150 ₽ earns a free
AI-ремонт, which is itself an order, forever.

### 2.4 Consume

Consume via compare-and-set (`UPDATE … WHERE state='open'`), one row, once — the same pattern
already drafted and tested for the credit. The existing `ar/commit` lease continues to guard
against a double tap. A failed, cancelled or abandoned request **must not** consume anything.

### 2.5 Refunds (owner A2)

* A refund is the **store's** operation, 100 %, to the original payment method. We never compute
  or execute it.
* Enforcement of the 50/50 paths is the store's; the cabinet only **displays** the outcome.
* Our only duty is entitlement hygiene: **revoke while `open`; never claw back `spent`.**

---

## 3 · Design system

**Use the app's existing tokens. Add no colour.** They already live in `src/styles.css`:

```css
:root { /* Design standard v1.0.0 (P4) — no black, no green, no amber, no second grey */
  --brand: #007aff;  --brand-light: #ebf3ff;  --hair: #dce8fa;
  --ink:   #0b2545;  --muted: #7c8ca6;  --line: #dce8fa;
  --danger:#e02020;  --wash:  #ebf3ff;  --ok:   #007aff;  /* success is BLUE, never green */
  --card-bg:#ffffff; --app-bg:#ffffff; }
```

The locked laws this file must obey:
* **P4 Colour discipline** — white canvas; blue `#007AFF` for **every** interaction; navy
  `#0B2545` for **all** text; red `#E02020` **only** for record / stop / danger.
* **P3 Everything round** — circles, pills and rings only. No squares, no sharp corners.
  Radii: `card 32` · `bubble 28` · `pill 999`.
* **Type** — system sans (SF / Segoe / Roboto), sizes `13 / 14 / 16 / 22`, weights `400 / 600 / 700`.
* **Space** — `4 / 8 / 12 / 16 / 24 / 32`.
* **Targets** — minimum 44 × 44 px. Contrast AA. Status is **never** signalled by colour alone.

**Purchase emphasis** in the history table = the `--wash` tint + semibold text. **Not green.**

**Palette status: OPEN.** The GPT spec's forest-green / charcoal / amber palette is **not
adopted** (it conflicts with P4 on five axes). If the owner later wants it, it is a change to the
`:root` block only — which is exactly why nothing may hardcode a colour now.

**Surface A** inherits the **store's** own theme. A second palette there is correct and expected.

**New components** (named in the standard's convention): `history_row`, `status_chip`,
`bike_card`, `passport_section`, `ticket_stepper`, `media_gallery`, `verify_badge`,
`entitlement_pill`. All round, monoline icons (rounded caps, stroke 2.5), navy text.

---

## 4 · The customer's journey

* **Entry A** — the store account block → «Открыть кабинет AI-ремонт →» (deep link).
* **Entry B** — the cabinet tab inside the Andrey app.
* **Not logged in** — the cabinet renders a single calm prompt and one button to the store login.
  It does not leak anything, and it is not an error screen.
* **Logged in, but an old guest order** — see §13.2: the customer may have bought before
  registering, so history must still resolve.
* **Service unavailable** — a retry action; never a blank screen.
* **Voice** — the cabinet is **button-driven**. Voice belongs to the active repair loop only.

---

## 5 · Screen structure

### 5.1 Header

Hi5.bike / AI Repair identity · «Вы вошли как [customer]» · a compact **active-bike selector**
when relevant · account menu · logout.
**Never** expose internal database identifiers or authentication tokens.

### 5.2 Dashboard (the entry point after login)

Three compact summary cards, no more:

| card | shows | action |
|---|---|---|
| Available free repairs | the count of available entitlements | **«Начать новый ремонт»** |
| My bikes | the number of registered bicycles | «Мои велосипеды» |
| Active repairs | repairs currently in progress | «Открыть ремонты» |

Below the cards: the **latest activity** from the unified history.
**There is no monetary credit card.** Do not add one.

### 5.3 The five sections

1. **Мои велосипеды** — Bike Passports (§6)
2. **Мои ремонты** — the unified history + Repair Tickets (§7, §8)
3. **Запчасти и заказы** — parts, recommendations, orders, verification (§9)
4. **Платежи и документы** — store-supplied payment and refund records (§10)
5. **Сообщения** — the AI chat (§11). "Сообщения" means **the chat**, not internal mechanic
   notes; §9 keeps staff-private information hidden, so there is no second message surface.

Implemented as **state-driven tabs** in `CabinetScreen.tsx` — `useState` for the active section.
**No router. No new dependency.**

---

## 6 · Bike Passports

The Passport is the permanent record of **one customer's one bicycle**. A customer may have
several, each with its own passport and history.

**Blueprint vs instance — the distinction that matters.**
A **shared blueprint** describes a *model* and its general specifications ("Trek Marlin 5, 2021").
It is **not** anyone's bicycle. The system already caches blueprints by a normalised key
(`blueprint.normalize_key(make, model, year_window)` + `pool_blueprint` / `cache_mark_validated`).
The missing piece — and the only new table here — is the **customer's instance**, which
**references** that shared blueprint instead of re-deriving its specs.

```sql
ai_repair_bike (
  bike_id, customer_id, nickname, make, model, year_window,
  blueprint_key,      -- links to the shared model blueprint
  specs_json,         -- this instance's CONFIRMED fitments only
  source, created, updated )
```

`ai_repair_job.bike_id` references it. **Never** use `sessions.bike` as the passport: it is free
text truncated to 190 characters, a display hint at best.

**Bike list** — each card: photo or placeholder · manufacturer + model · year / year range ·
customer nickname · key confirmed components · number of linked repair tickets · most recent
service date. Tap → the passport.

**Passport detail**, in four blocks:
1. *Identification* — make, model, year range, confirmed serial if known, nickname.
2. *Configuration* — drivetrain, brakes, wheels, suspension; **confirmed fitments and specs only**,
   with unknown information marked as unknown (never guessed).
3. *Repair history* — completed service, historical diagnostic cases, confirmed component
   replacements, links to Repair Tickets.
4. *Evidence* — photographs and videos, when retained (§14).

**Ownership rules.** The customer can **view** the passport but cannot edit its authoritative
technical record; our service controls official changes. **An AI finding never becomes a
confirmed specification automatically.** Customer-supplied data may be recorded as evidence, but
official changes require validation.

---

## 7 · Repair history — the central feature

### 7.1 The table

Five columns, newest first:

| Дата | Что | Тип | Сумма | Статус |
|---|---|---|---|---|
| date | AI Repair | Ремонт | — | Завершён |
| date | Тормозные колодки | Рекомендация | — | Рекомендовано |
| date | Тормозные колодки | Покупка | actual price | В обработке |
| date | Тормозные колодки | Возврат | actual refund, if applicable | Возврат |

Rules: **every row carries a real date**; a missing value is an **em dash**, never an invented
one. Purchase rows get the `--wash` tint + semibold. Recommendations stay neutral. Returns are
**separate rows** — a return never silently edits or deletes the original purchase. The history is
a **unified presentation, not a second source of financial truth** (§9, §13).

### 7.2 Filters

Required four: **Все · Покупки · Рекомендации · Ремонты** (additional search is optional).
UI-only in Round 9.

### 7.3 Status vocabulary and the verified id map

Nine customer-facing labels, derived **in the backend** from real records. Never invent a
transition from a date or a model guess.

| chip | source | condition |
|---|---|---|
| Просмотрено | internal | the part appeared in a verdict the customer opened |
| Рекомендовано | internal | recommended inside a **paid** job |
| Ожидает оплаты | ocStore | `order_status_id = 1` |
| Оплачен | ocStore | `17` |
| В обработке | ocStore | `2`, `15` |
| В пути | ocStore | `18`, `19`, `22`, `23` |
| Доставлено | ocStore | `3`, `24`, `5` |
| Возврат | ocStore | `8`, `11`, `13` |
| Отменено | ocStore | `7`, `9`, `16`, `20`, `10`, `14` |

(The ids are verified against the live `oc_order_status` table, `language_id = 1`.)

### 7.4 Row interactions

Ремонт → Repair Ticket (§8) · Покупка → order details · Рекомендация → the recommendation and its
repair · Возврат → the return and refund record.

---

## 8 · Repair Ticket — the job drill-down

One ticket = one diagnostic or repair case for one bicycle. It must be clear enough that the
customer can return months later and understand exactly what happened.

**A. Header** — repair date + current status · bicycle identity · the selected problem · the
associated order, if any · entitlement consumption state where relevant.

**B. Diagnosis** — the AI findings · the **selected** problem · **all other detected problems** ·
confidence/uncertainty where supported · evidence and limitations.
Never present a speculative diagnosis as a confirmed mechanical fact.
If several problems were found, the customer can switch to another one: **«Сделать это»**. The
re-selection is **recorded in the job's event history** (it is what justifies later
recommendations), and it is what the payment scope follows (we fix only what was paid for).

**C. Repair plan** — a short readable text plan plus a simple **graphical sequence of steps**.
Each step: number · short title · clear instruction · supporting image/video when available ·
completion state if the workflow tracks it. Detailed explanations expand on request; never a wall
of technical text.

**D. Media gallery** — every photo and video submitted for this job, plus **«Добавить фото/видео»**.
New media attaches to the **existing** job: uploading more evidence **must not** create or charge
for another repair. Store the reference, timestamp, type and summary. Reuse the existing `media`
records (keyed by `sid`) via the job's `session_id` link.
**Do not promise historical media unless it is actually retained** — see §14.

**E. Parts recommendations** — name + image · compatibility status · price **only when it is
legitimately available** · the rationale · and the state of the chain:

> Рекомендовано → Просмотрено → В корзине → Куплено → Проверено механиком → Отправлено → Установлено

Not every part passes through every state. **Never** mark a part purchased because it appeared in
a cart; never mark a purchased part installed without evidence. Link to the real order.

**F. Job event history** — a compact chronological timeline: job created · media added · diagnosis
produced · problem selected or changed · recommendation created · order placed · deposit received ·
human verification · payment or refund · shipping · confirmed completion.
**Append-only for important business events**: a correction is a **new event**, never a silent
deletion of the original.

---

## 9 · Parts, orders and human verification

**Commerce belongs to ocStore.** The AI Repair app owns repair context, recommendations and the
verification workflow; the store is authoritative for purchases, order lines, payments and store
order statuses. The section shows: recommended parts · previously viewed parts · carted items ·
purchased items · shipping status · returns and refunds · **human verification records** ·
confirmed installations.

**Linking a recommendation to a purchase.**

* `basket.product_id` (existing table, keyed by `sid`) records **intent**.
* `oc_order_product.product_id` records the **purchase**.
* Match on **stable product ids, never on names**. A cart line is not a purchase.

### 9.1 Fitment gate — before an offer is made

Deterministic catalogue matching plus the evidence ladder. **The bar is 80 %, everywhere**
(owner A1: *"keep 80 % certainty everywhere, for simplicity"*) — the existing `GATE_CONF`.
`RULE-PART-MATCH-70.md` is **superseded**: do **not** add `MATCH_CONF_FITMENT = 70`.

| result | meaning | price shown |
|---|---|---|
| `confirmed` | exact catalogue match **and** every required attribute present, confidence ≥ 80 | **yes** — SKU + price |
| `compatible_unverified` | plausible, but required evidence is missing | **no** |
| `unresolved` | no standard can be named | **no** |

Invariant: **`sku` and `price_rub` are null unless `confirmed`.** A model score may only ever
*lower* a state, never raise it. For uncertain cases ask for the missing evidence in the
established order: **video → photo 1 → photo 2**. Never invent a price, never imply compatibility.

### 9.2 Physical verification — after the deposit, when the part arrives

A **separate human decision**. A model cannot verify physical fitment.

> order placed → deposit paid → **awaiting_verification** → verified fit **or** verified mismatch

At the workshop the mechanic physically examines the actual part and records the decision.
Outcome vocabulary (customer-facing labels are natural Russian):

* `fit` — releases the remaining payment step.
* `mismatch` — follows the documented refund / alternative path (owner A2: **100 % refund** to the
  original payment method; path (a) fails the check → refund **or** keep hunting the right part).
* `insufficient_evidence` — **stays in `awaiting_verification`**; the mechanic may ask for another
  photo or angle. This is **not** the pre-sale uncertainty: the order exists and the part is
  already awaiting inspection.

**Only an authorised human action can move an order out of `awaiting_verification`.** A timeout or
a model must never declare a part verified. The escalation and hard-limit rules are preserved:
money must not stay held because nobody reviewed the part.

### 9.3 The verification record (append-only)

`order_id` · part / SKU · **mechanic identity from the store's authenticated staff record** ·
decision timestamp · result · findings and notes · **media reviewed, incl. who viewed what and
when** · reference to any superseded decision.

The customer sees the verification status and the meaningful findings; internal credentials and
staff-private information stay hidden.

**Reuse the existing `part_order` state machine** (D2: `id, sid, sku, price_rub, deposit_rub,
balance_rub, ai_credit_rub, balance_due_rub, status, created, verified_at, verified_by, note`).
Do **not** invent a second deposit/balance workflow.

---

## 10 · Payments and documents

The page shows **real financial records from the authoritative store**:

* orders and actual order totals · amount paid · outstanding amount, when applicable;
* deposits and subsequent payments (the 50/50 split), with the actual amount paid and the
  remaining amount due **when that information is available and relevant**;
* refunds and returns;
* the payment provider's receipts and confirmations, **as links** to the store's own artifacts.

**Payment, tax and refunds are handled by the Yandex payment module inside ocStore.** Therefore:

* The cabinet is **read-only on money.** It never computes a tax line, never issues an invoice,
  never authors a receipt. Fiscal receipts (54-ФЗ) are the provider's output.
* **Never fabricate a payment state.** If a payment is pending, or the authoritative record is
  unavailable, show the actual known status and nothing more.
* **VAT does not exist in our code** — no VAT field, no VAT arithmetic, anywhere.

**Refunds are a human decision inside ocStore (owner ruling, 2026-10-12).** A customer may *request*
a refund from the cabinet; the cabinet records that request and then shows the store's resulting
state. The cabinet **never approves, never executes and never predicts** a refund — approval happens
in the ocStore admin by a person, and the money moves through the Yandex payment module's own refund
path. Until that approval exists, the only truthful thing to display is the request's own status
(which is not a payment state and must never be shown as one).

**The monetary display is for real commerce only.** Do **not** show the value of a free AI Repair
entitlement in rubles; do not display a 150 ₽ credit, a token balance or a monetary wallet. The
store's actual product prices and order totals are unaffected by this rule — they are legitimate
and must remain visible.

---

## 11 · Cabinet chat

A sticky, **text-only** AI panel, reachable from every section and from inside a Repair Ticket.
It is compact and unobtrusive.

Suggested opening prompts: «Что мне рекомендовали?» · «Когда пришла последняя посылка?» ·
«Что делать с задним тормозом?» · «Покажи мои последние ремонты» · «Какие детали проверил
механик?»

**Context rules**
* Opened from a Repair Ticket → scoped to that `job_id`.
* The customer can explicitly ask for a broader, account-level search.
* The assistant **retrieves** the customer's records; it never invents order details.
* It **distinguishes** an AI finding from a human verification and from completed work.
* It can link to the relevant ticket, order or Bike Passport.
* It **must not** expose another customer's records.
* It **must not** claim a payment, refund, shipment or physical verification happened without a
  corresponding record.

**Cost and entitlement rules**
* Chat is **included** in the purchased repair experience for v1, subject to reasonable
  operational usage limits. **No entitlement is charged per message.**
* Attaching more photos to an existing job does not consume an entitlement either.
* Starting a **genuinely new** repair consumes one entitlement, per the atomic rules in §2.4.

**States** — a clear loading state, a useful error message, and a retry action when the service is
unavailable.

**Standing scope note (P2).** The design standard's *"keyboard-less / no text composer"* law
governs the **active repair loop** — the point → choose one of two → record → follow flow. An
account surface is explicitly outside it: the owner asked for text chat in the cabinet, so the
composer is correct here. The anti-pattern line in the standard should name the repair loop.

---

## 12 · API and data model

### 12.1 The API surface

Every route is **identity-required** and **scoped to the authenticated customer**. All of them must
be listed in **both** allowlists: the app's `_ROUTES` **and** the nginx relay's route set. Both, or
the route is either unreachable or over-exposed.

| route | purpose |
|---|---|
| `GET /api/cabinet` | first paint: summary + bikes + history (one round trip) |
| `GET /api/cabinet/job/{job_id}` | one Repair Ticket (§8) |
| `GET /api/cabinet/part/{product_id}` | one part + its recommendation state chain |
| `POST /api/cabinet/ask` | chat; body `{question, job_id?}` (§11) |
| `GET /api/cabinet/summary` | the compact payload for Surface A |
| `POST /api/ar/commit` | existing; takes `{use_credit}` and **consumes one entitlement** |
| `POST /api/ar/select-cause` | the «Сделать это» re-pick; appends an event |
| `POST /api/ar/pay` | creates or reuses the «AI-ремонт» order, returns the checkout URL |

Keep **one** call for the first paint and fetch the ticket lazily on drill-down. The mock switch
stays the existing one-liner (`isMock` early-return inside `src/api.ts`).

### 12.2 The data model

| table | role |
|---|---|
| `ai_repair_bike` | the customer's bicycle **instance**, linked to a shared model blueprint (§6) |
| `ai_repair_job` | one repair case: `bike_id`, customer, session, verdict, selected problem, plan, status, associated order |
| `ai_repair_part` | recommended / viewed parts, linked to a job and to stable product ids |
| `ai_repair_event` | append-only per-job history |
| `ai_repair_verification` | append-only human fitment decisions (§9.3) |
| `ai_repair_credit` | the entitlement: source event, customer, state, created, consumption details. **The internal name may stay; it must never reach the customer as money.** |
| `part_order` | **existing** deposit + verification state machine — reuse, do not duplicate |

Reused as-is: `media` (keyed by `sid`), `basket` (keyed by `sid`), `sessions`, `funnel_state`.

The backend must enforce: one entitlement per qualifying event · idempotent granting · atomic
consumption · correct ownership · no duplicate repair starts under concurrency · clear handling of
failed, cancelled or abandoned sessions.

---

## 13 · Identity, security, integration

### 13.1 Identity

* **The store login is the source of customer identity.** Never trust a browser-supplied customer id.
* Use the verified same-origin session where that is safely supported, and a **short-lived,
  single-use signed handoff token** where it is needed.
* **Delete the `x-customer-id` path entirely.** As currently drafted it is worse than a read
  bypass: `/api/cabinet` calls `fs.set_identity(sid, …)`, so a forged header **permanently binds**
  an identity to the session.
* Handoff tokens: validated server-side, expire within **120 s**, protected against replay.

### 13.2 Guest orders — the case that will break a naive cabinet

**Registration happens only after a purchase** (owner A8), and the live store is **89 % guest**:
**187 of 209 orders have `customer_id = 0`**, with only 1 281 customers in existence.

Consequence: a customer who just registered may own orders that are **not yet attached to their
`customer_id`**. The cabinet must therefore resolve history through the **merge path**
(phone / email → `customer_id`, owner A8 + task B10), or a paying customer will open the cabinet
and see an empty history. **This is an acceptance test, not an edge case.**

### 13.3 There is a second database (A9)

`/var/www/hi5.bike/crm/` is a **separate PHP application with its own DB config**; its `job.php`
(54 KB) owns the **workshop job cards**. The people and the money live in `oc_customer` /
`oc_order`. **Two truths, one join key** — identify that key before integrating anything workshop
side, and note that this is also where a *workshop-work* entitlement event would have to come from
(§2.3, deferred).

### 13.4 Query discipline

* Every API query is **scoped to the authenticated customer**.
* **Never expose the internal `cost` field** — it is margin data and must not leave the database.
* **Do not hand-insert incomplete orders.** A real ocStore checkout creates the order, its product
  lines, its totals and its history. The app **observes** the completed order and links it to the
  repair session.
* **Do not assume workspace copies are identical to production.** Several files exist in multiple
  stale copies in this workspace; the server's live file is the only truth.

---

## 14 · Media and retention

**The rule: media is never deleted** (owner A7 + task B15). Repair evidence is part of the service
record, and the videos are how the system learns.

* `purge_media(older_than_days=7)` **must never be called**, and the deletion policy must be
  **removed** — both the function and the docstring that states *"customer videos must not
  accumulate on the VPS"*. `record_media()` stays: that table is the index of what we hold.
* Widen the existing rule **R1** from *"guide videos are never deleted"* to **all** media. Do not
  invent a second policy.
* No 48-hour lifecycle purge anywhere. The archive is the storage strategy, not the disk.
* **Capacity is not the constraint:** measured headroom is ~2 000–3 000 orders / ~5 000 clips
  (≈6+ years at the current volume). The second copy is an **external drive, made manually when
  needed** — no cloud bucket, and the "verify the copy before clearing staging" machinery is not
  required, because nothing is ever removed from the VPS.

**What the cabinet may promise.** The gallery shows what actually exists. If a media record exists,
show it; if it does not, do not imply it does. Privacy: only the customer sees their own media,
and **every viewing by staff is logged** (§9.3).

---

## 15 · Responsive design and accessibility

**Desktop** — sidebar navigation · summary cards in a row · full-width history table · ticket
detail in readable blocks.
**Mobile** — compact header · collapsible navigation · stacked cards · the history as stacked
transaction cards or a horizontally manageable table · the plan steps in a single column · a
touch-friendly gallery · a chat input that never obscures content.

Accessibility: semantic headings, keyboard-accessible controls, visible focus states, sufficient
contrast (AA), descriptive button labels, accessible status indicators, and **never colour as the
only signal** for an order or verification status. Minimum touch target **44 × 44 px**.

---

## 16 · Mock data and acceptance criteria

### 16.1 The fixtures (deterministic, Russian, **no real customer data**)

One customer with a logged-in identity · one bicycle with a Bike Passport · one paid repair ·
one recommended part that **was** purchased · one recommendation that **was not** · one available
free repair entitlement · one return or refund · **at least one order awaiting physical
verification** · **all three verification outcomes** (`fit`, `mismatch`, `insufficient_evidence`) ·
several media items on an existing job · one repair with **multiple detected problems** · one
repair plan with graphical steps.

Mock records must be clearly separated from production records.

### 16.2 UI acceptance tests — Round 9 (these belong to the builder)

1. The five sections are all reachable, as tabs.
2. History filters work; rows open the correct detail.
3. Bike Passport links to its repairs.
4. The Ticket shows diagnosis, plan, media, parts and verification blocks.
5. The chat accepts input and returns mock **grounded** answers.
6. The entitlement count and «Начать новый ремонт» behave consistently.
7. Loading, empty, success and error states all exist.
8. Desktop **and** mobile layouts are complete.
9. **No money vocabulary in any customer-facing string** — no «кредит», «баланс», «токен»,
   «150 ₽» applied to an entitlement (grep `src/` and `dist/`).
10. **No router and no new dependency** was added (`package.json` still react + react-dom only).

### 16.3 Backend invariants — Phase 3 (**never simulated in the UI mock**)

A mock-first UI cannot test these, and asking the builder to "make them pass" would manufacture
fake correctness:

* one qualifying event grants exactly one entitlement;
* a **replayed** event grants none (idempotency);
* starting a repair consumes exactly one; a double tap consumes one; a failed or abandoned request
  consumes none;
* a customer cannot retrieve another customer's repairs, bikes, orders or media;
* `cost` never appears in any response;
* a **guest→customer** merge resolves the customer's older orders (§13.2);
* an order awaiting physical verification cannot be cleared by a timeout or a model;
* a model-generated diagnosis never becomes a human verification.

---

## 17 · Round 9 — scope and builder instructions

**Build (mock-first, no backend):**
* the **navigation shell** — all five sections reachable as tabs, state-driven;
* the **dashboard** with the three cards (§5.2);
* **History** — the table, the four filters, row drill-down (§7) — built fully;
* the **Repair Ticket** scaffold — blocks A–F (§8) — built fully;
* sections **Мои велосипеды / Запчасти и заказы / Платежи и документы** renderable from the mock
  repository, with honest loading/empty states (their deep detail arrives in Round 10);
* the **chat panel** with mock grounded answers (§11).

**Do not:** add a router, a state library or any dependency · invent production auth, payments,
database access or order integration · create a second commerce system · create a monetary credit
wallet · replace the existing authentication or checkout · mark a part physically verified without
an authorised human decision · hardcode a colour · introduce a token/credit/balance vocabulary.

**Do:** extend `CabinetScreen.tsx` (do not rewrite the app) · use the existing `:root` tokens ·
use the existing `isMock` switch in `src/api.ts` · separate UI components, data models, API client
and mock repository so the real backend can be attached later without touching the screens ·
render every server-supplied string verbatim.

**Definition of done:** a customer can enter the cabinet, see their bicycles and repair history,
open a repair, inspect recommendations and verification records, review orders and payments, see
available free repairs, and ask the chat about their own records — through a coherent, responsive
interface, with **no money vocabulary anywhere** and no new dependency.

**Surface A is a separate job.** The ocStore account block is an **OCMOD** (PHP + a small JS
client), not part of this round.

---

## 18 · Phase 1 — the security and live-system audit

Before anything is deployed, and in parallel with Round 9:

1. **Fix F1–F4** and **delete the `x-customer-id` path** (see `REVIEW_2026-10-12.md`).
   **DONE 2026-10-12** — fixed and version-controlled in the private repo
   **`hi5-andrey-server`** (commit `e74a52d`): the `x-customer-id` path is **deleted**, not
   merely gated; ocStore reads go over `pymysql` (F3) with **no DDL at import**; F1's rebind is
   gone; the A7 scope lock is resolved **server-side** from the stored verdict (F5); F4's patch is
   staged in `ops/ai-mechanic-watch-F4.patch`. Not deployed — the cabinet route is still absent
   from the live relay allowlist, so the bypass was latent, not exploitable.
2. **`oc_session`** — its real shape, and the real cookie name (`OCSESSID` is currently only an
   assumption). **Shape confirmed 2026-10-12:** `session_id varchar(32) PK`, `data text`,
   `expire datetime` (a second `oc_api_session` table belongs to the API module). The **cookie name
   is still unverified**.
3. **Does the «AI-ремонт» product exist?** If not, create it: 150 ₽, `tax_class_id = 0`,
   **non-shippable** (`oc_product.shipping = 0`), `subtract` left at 0.
   **`AI-REMONT-150`**. **DONE LIVE 2026-10-12** — it did **not** exist (0 product names start with
   `AI`). Created as **`Ai Ремонт`** (product_id **65882**), SKU `AI-REMONT`, model `AI-REMONT-150`,
   **150 ₽**, `shipping = 0`, `subtract = 0`, `tax_class_id = 0`, quantity 1, weight 0,
   **enabled (status = 1)**, image `catalog/products/ai-remont-150.png`, in the new **top-level
   category «Услуги» (1119)**. `oc_product.shipping`/`.subtract` **default to 1** and `tax_class_id`
   to NULL, so a default insert would have created a shippable, stock-decrementing product — they were
   set explicitly. Verified: DB read-back (HEX) decodes to «Ai Ремонт» / «Услуги», product and
   category pages HTTP 200, image HTTP 200 (13 919 B), `verify_scope` **IDENTICAL**,
   `maintenance_health_check` ok. Script: `_svc_live.py` (plan-by-default, scoped inserts);
   rollback = `DELETE` on ids 1119 + 65882 across the five tables \(+ the image file).
   The product image is a **generated placeholder** — replace it with a real one.
4. **The live `sessions.py` schema** — `media`, `basket`, `sessions`. The copy in this workspace is
   stale; do not build on it. **Partial 2026-10-12:** there are **no `media` or `basket` tables in
   MySQL at all** — the app keeps them in its own SQLite
   (`ANDREY_FUNNEL_DB = /root/aim/app/funnel_state.db`), which is the F3 finding. The live
   `sessions.py` itself still needs reading.
5. **`oc_order_history` / `oc_return`** — do they exist and are they populated? They have **zero
   references** in our entire codebase, and the "returns are their own events" rule depends on them.
   **ANSWERED 2026-10-12: both exist and are populated** — `oc_order_history` **113 rows**,
   `oc_return` **28 rows**, plus `oc_return_history` / `_action` / `_reason` / `_status`. The
   "returns are their own events" rule **is buildable on real data**.
6. **The Yandex payment module** — its exact directory name and the refund path it exposes.
   **Code confirmed 2026-10-12: `yoomoney`** (alongside `yoomoney_b2b_sberbank`, `cod`,
   `free_checkout`; shipping modules are `dostavista`, `flat`, `pickup`, `yandexdelivery`,
   `yandexdeliveryexpress`). **Refund ruling (owner, 2026-10-12): a refund is *requested* by the
   customer and *approved by a human inside ocStore*** — the cabinet never approves, executes or
   predicts one (§13).
7. **The second CRM** (`/var/www/hi5.bike/crm/`) — its schema and the **join key** to
   `oc_customer` / `oc_order` (A9).
   **ANSWERED 2026-10-12: it lives in the same database** — `oc_crm_job` (`job_id`, `client_name`,
   `client_phone`, `bike`, `status`, `notes`, `price_total`, `price_manual`, `discount_pct`, `paid`,
   `created_at`, `updated_at`), plus `oc_crm_job_item`, `_log`, `_message`, `_photo`, `_service`,
   `_setting`, `_user`. There is **no `customer_id` and no `order_id`** — the only link to
   `oc_customer` / `oc_order` is **`client_phone`** (indexed), with `client_name` a weak secondary.
   ⚠ A phone join is fragile (a shared or family number cross-links customers) and it collides with
   "a customer cannot retrieve another customer's records" — it needs an explicit decision, and it is
   entangled with the guest→customer merge (item 8).
8. **Guest orders** — confirm the 187/209 figure and define the merge path (A8, B10).
   **CONFIRMED 2026-10-12: 209 orders, 187 with `customer_id = 0`** (1281 registered customers). The
   merge path itself is still undefined — and it is entangled with the phone-join warning under
   item 7.
9. **`purge_media`** — confirm there is no call site, then remove the policy (B15).
   **DONE 2026-10-12** — no call site confirmed; `purge_media()` and the docstring that stated
   the delete-policy as a design goal are **removed** from the canonical `mechanic/sessions.py`
   (`record_media()` — the index of what we hold — survives). The live copy still carries the
   dormant method; remove it with the next deploy.
10. **B16** — the search-index leak: `_ar_kb_build.py` ingests every top-level `.md` in the chat
    root with no PII detector. Keep this spec inside the repo, never loose in the chat root.
    **DONE (scrub) 2026-10-12 — the leak was real and larger than described:** the **live MySQL
    bridge token** and the **FTP password** sat in **12 documents (35 occurrences)** that the
    knowledge RAG ingests, including both copies of `_SESSION_REFERENCE.md` — the bridge token is
    full read/write database access. All 35 were redacted and re-verified (0 remaining; backups at
    `WORKSPACE\_b16_backup_*`). ⚠ **Rotate the bridge token** — it was retrievable, so treat it as
    disclosed. Still to do: wire a secret/PII **detector into the ingest path** so this cannot
    recur, and keep customer phone numbers out of handoff notes (two docs still carry them).

---

## 19 · Open items

| # | item | blocks |
|---|---|---|
| ⚠ | **A12 — tokens as an ocStore product** vs the free-repair rule (see the box at the top) | §2, §7, §9, §10 |
| 1 | **Palette** — keep the app's tokens (working position) or re-theme `:root` | §3 only; nothing else is blocked |
| 2 | **Qualifying event** — confirm the ≥ 1 000 ₽ floor and the non-AI-ремонт exclusion; confirm the workshop/visit path stays stubbed in v1 | §2.3 |
| 3 | **A4/O6** — "do up" (ceiling) vs "closest" (nearest) for the 50 % split | store-side only |
| 4 | **Round 9 vs Round 10 split** — which three sections are stubs | §17 |
| 5 | AR overlay: live video vs reference crop (`NEXT_SESSION.md`) — not cabinet, still open | the AR journey |

---

## Appendix A — verified facts behind this spec

* **Store scale:** 1 281 customers · 209 orders · **187 of 209 orders are guest
  (`customer_id = 0`)**.
* **Status ids** (live `oc_order_status`, `language_id = 1`): 1 Ожидание · 2 В обработке ·
  3 Доставлено · 5 Сделка завершена · 7 Отменено · 8 Возврат · 9 Отмена · 10 Неудавшийся ·
  11 Возмещенный · 13 Полный возврат · 15 Обработано · 17 **Оплачен** · 18 Курьер назначен ·
  19 Курьер забрал · 20 Доставка не состоялась · 21 Подтвержден · 22 Передан в ПВЗ ·
  23 **В пути** · 24 **Получен**.
* **The DB bridge already exists:** `mechanic/config.py` + `mechanic/catalog.py` connect
  **pymysql → 127.0.0.1:3306** on the same box, exactly as the PHP store does. `cost` is *never
  selected* by design.
* **Funnel sessions** are SQLite, cookie `andrey_s`, **TTL 1800 s**, CAS stage transitions, and the
  identity gate already answers `401 «Нужен вход в аккаунт hi5.bike»` — `set_identity()` is simply
  never called (task B9 wires it).
* **A model-level blueprint cache exists** (`blueprint.normalize_key` + `pool_blueprint` +
  `cache_mark_validated`). There is **no** per-customer bicycle record today.
* **`sessions.bike`** is free text, truncated to 190 characters.
* **Existing tables to reuse:** `media(sid, …)`, `basket(sid, product_id, …)`, `part_order`
  (specified), `sessions`, `funnel_state`.
* **The app is router-free:** `package.json` = `react` + `react-dom` only. `--ok` is remapped to
  `#007aff` (*"success is BLUE, never green"*).
* **Four surfaces still render the entitlement as money** and must change with §2: the handoff
  ticket row (`App.txt:901`, «Скидка на визит за AI-гид» + `paid_ar_credit_rub` ₽), the handoff
  payload field (`App.txt:388`), the server-supplied verdict `guarantee` string (*"зачитывается
  как скидка на визит в мастерскую"*), and the Money docs (A6, A12).

## Appendix B — customer-facing vocabulary

| context | strings |
|---|---|
| entitlement | «Доступен 1 бесплатный ремонт» · «Доступно N бесплатных ремонта/ремонтов» · «Бесплатных ремонтов нет» |
| primary actions | «Начать новый ремонт» · «Открыть кабинет AI-ремонт →» · «Добавить фото/видео» · «Сделать это» |
| sections | Мои велосипеды · Мои ремонты · Запчасти и заказы · Платежи и документы · Сообщения |
| history types | Ремонт · Рекомендация · Покупка · Возврат |
| statuses | Просмотрено · Рекомендовано · Ожидает оплаты · Оплачен · В обработке · В пути · Доставлено · Возврат · Отменено |
| verification | Подошла · Не подошла · Нужны дополнительные доказательства |

**Banned in customer-facing strings:** 150 ₽ (as an entitlement value) · кредит · баланс · токен ·
скидка (for the entitlement) · any ruble value attached to a free repair.

---

*End of v1.0. Compiled 2026-10-12 from the owner's rulings, the GPT spec v1.0, and the live-evidence
audit. Superseded sections of the GPT draft: §3 palette, §8's 70 % fitment reference, and §9's
"invoices/receipts" (see §3, §9.1 and §10 here).*
