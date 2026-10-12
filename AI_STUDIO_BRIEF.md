# AI_STUDIO_BRIEF — AI Repair cabinet (Round 9)

**This is the single dispatch document for the Google AI Studio App Builder.**
It combines the build constraints, the design laws, the customer-facing language rules, the
cabinet structure, the mock-data contract and the acceptance tests into one place.

**Authoritative companion (curl it first):**
`https://raw.githubusercontent.com/Gershon1978/hi5-andrey-ui/master/CABINET_SPEC_V1.md`
— the full v1.0 specification. Where this brief is silent, that file decides.

Also in this repo, for the existing journey (do not modify): `BUILD_SPEC_AI_REPAIR.md`,
`openapi.json`, `SPEC.md`.

---

## 1 · Mission

Extend the existing AI Repair app with the **customer cabinet**. Round 9 delivers:

1. the **navigation shell** — five sections, as state-driven tabs;
2. the **dashboard** — three summary cards;
3. **History** — the unified table, four filters, row drill-down — built fully;
4. the **Repair Ticket** — blocks A–F — built fully;
5. **Bike Passports**, **Запчасти и заказы**, **Платежи и документы** — reachable and renderable
   from the mock repository with honest loading/empty states (their depth lands in Round 10);
6. the **chat panel** with mock grounded answers.

**Mock-first. This round ships no backend integration of any kind.**

---

## 2 · The app you are extending

**Stack — do not change it.** React 18 + Vite 5 + TypeScript 5.6. `package.json` currently
contains exactly two runtime dependencies:

```json
"dependencies": { "react": "^18.3.1", "react-dom": "^18.3.1" }
```

**Files that exist and matter:**

| file | role |
|---|---|
| `src/App.tsx` | the app shell; owns the current screen state |
| `src/screens/CabinetScreen.tsx` | **the starting point — extend it, do not rewrite the app** |
| `src/screens/ArGuideScreen.tsx`, `src/screens/OfferScreen.tsx` | the AR journey — **do not touch** |
| `src/api.ts` | the only place that talks to the server; carries the `isMock` switch |
| `src/types/ar.ts` | the locked AR types |
| `src/mock/arGuide.ts`, `src/mock/offline.ts` | existing mock fixtures |
| `src/styles.css` | the design tokens (`:root`) and every class |

**The mock switch already exists.** `src/api.ts` contains an `isMock` constant and early-returns
fixtures. Follow that exact pattern for the cabinet: `VITE_AR_MOCK=true` ⇒ zero network calls.

---

## 3 · Hard rules

* **No router. No state library. No new dependency.** The five sections are `useState` tabs.
* **No new colour, no hardcoded colour.** Use the `:root` custom properties only (§4).
* **No server logic in the UI.** No auth, no payment, no database, no order integration, no state
  machine. The UI renders what it is given.
* **No invented production integrations.** If data is missing, render an empty state.
* **Render server-supplied strings verbatim**; never paraphrase them.
* Every string is Russian (§5).
* TypeScript strict; the build is `tsc --noEmit && vite build` and must stay clean.
* Mobile and desktop are both required, not a scaled-down desktop.

---

## 4 · Design laws and tokens

The design standard is **v1.0.0** and it is locked. The cabinet obeys all ten laws; these four bind
hard:

* **P4 Colour discipline** — white canvas `#FFFFFF`; blue `#007AFF` for **every** interaction;
  navy `#0B2545` for **all** text; red `#E02020` **only** for record / stop / danger.
  *There is no black, no green, no amber, and no second grey.*
* **P3 Everything round** — circles, pills and rings only. No squares, no sharp corners.
* **P10 Hi-tech** — modern, premium, restrained; never flashy.
* **P6 Calm & clean** — pristine and uncluttered.

**The tokens already exist in `src/styles.css`. Use these names; invent nothing:**

```css
:root {
  --white:#ffffff; --brand:#007aff;  --brand-light:#ebf3ff; --hair:#dce8fa;
  --ink:#0b2545;   --muted:#7c8ca6;  --line:#dce8fa;      --danger:#e02020;
  --card-bg:#ffffff; --app-bg:#ffffff;
  /* legacy names, remapped so no rule silently keeps a forbidden colour */
  --ok:#007aff;    /* success is BLUE, never green */
  --ok-bg:#ebf3ff; --warn:#0b2545;   --warn-bg:#ebf3ff;
}
```

* **Radii** — `card 32` · `bubble 28` · `pill 999`. Never a sharp corner.
* **Type** — system sans (SF / Segoe / Roboto) · sizes `13 / 14 / 16 / 22` · weights `400 / 600 / 700`.
* **Space** — `4 / 8 / 12 / 16 / 24 / 32` only.
* **Targets** — minimum `44 × 44 px`; contrast AA.
* **Status is never signalled by colour alone** — always a readable text label too.
* **Purchase emphasis** in the history table = a `--wash` tint + semibold text. **Not green.**

**Palette status: OPEN.** The green/charcoal/amber direction is **not** adopted. If it is ever
adopted it becomes a change to the `:root` block — which is exactly why nothing may hardcode a
colour.

**New components to add** (round, monoline icons with rounded caps, stroke 2.5, navy text):
`history_row` · `status_chip` · `bike_card` · `passport_section` · `ticket_stepper` ·
`media_gallery` · `verify_badge` · `entitlement_pill`.

---

## 5 · Customer-facing language

**The entitlement is a repair job, never money.** One free repair per qualifying purchase, shown as
a count.

| context | the strings to use |
|---|---|
| entitlement | «Доступен 1 бесплатный ремонт» · «Доступно 3 бесплатных ремонта» · «Бесплатных ремонтов нет» |
| primary actions | «Начать новый ремонт» · «Открыть кабинет AI-ремонт →» · «Добавить фото/видео» · «Сделать это» |
| sections | Мои велосипеды · Мои ремонты · Запчасти и заказы · Платежи и документы · Сообщения |
| history types | Ремонт · Рекомендация · Покупка · Возврат |
| statuses | Просмотрено · Рекомендовано · Ожидает оплаты · Оплачен · В обработке · В пути · Доставлено · Возврат · Отменено |
| verification | Подошла · Не подошла · Нужны дополнительные доказательства |

**Pluralisation is required** — `ремонт` (1, 21, 31…) · `ремонта` (2–4) · `ремонтов` (0, 5–20).
Do not render `«Доступен {N}»` for every N.

**Banned in customer-facing strings:** `150 ₽` as the value of an entitlement · `кредит` ·
`баланс` · `токен` · `скидка` for the entitlement · any ruble value attached to a free repair.

**Allowed and expected:** real store prices, order totals, amounts paid and refunds — inside the
order and payment records. *150 ₽ as the price of the «AI-ремонт» product at checkout is correct;
150 ₽ as a discount on a parts order is banned.*

---

## 6 · The cabinet structure

**Header** — Hi5.bike / AI Repair identity · «Вы вошли как [customer]» · a compact active-bike
selector when relevant · account menu · logout.
**Never** expose internal database identifiers or authentication tokens.

**Dashboard** (the entry point after login) — three cards, no more:

| card | shows | action |
|---|---|---|
| Available free repairs | the entitlement count | **«Начать новый ремонт»** |
| My bikes | number of bicycles | «Мои велосипеды» |
| Active repairs | repairs in progress | «Открыть ремонты» |

Below the cards: the latest activity from the unified history.
**There is no monetary credit card.** Do not add one.

**The five sections — tabs, not routes.**

1. **Мои велосипеды** — the bike list (photo/placeholder · make+model · year · nickname · confirmed
   components · repairs count · last service). Tap → the passport: *Identification · Configuration
   (confirmed only, unknowns marked) · Repair history · Evidence*.
2. **Мои ремонты** — the history table + the Repair Ticket.
3. **Запчасти и заказы** — recommended parts · viewed · carted · purchased · shipping · returns ·
   **human verification records**.
4. **Платежи и документы** — real store records: order totals · amount paid · outstanding ·
   deposits and subsequent payments · refunds. **Read-only. Never fabricate a payment state.**
5. **Сообщения** — the AI chat (a sticky, text-only panel, reachable from every section and from
   inside a ticket; scoped to that job when opened from one).

**The history table** — five columns, newest first: `Дата | Что | Тип | Сумма | Статус`.
Filters: **Все · Покупки · Рекомендации · Ремонты**.
Every row carries a real date; a missing value is an **em dash**, never an invented one. Purchase
rows are emphasised (`--wash` + semibold). Returns are **separate rows** — never an edit of the
original purchase. Row click → the relevant detail.

**The Repair Ticket** — six blocks:
**A** header (date, status, bike, selected problem, order if any) ·
**B** diagnosis — the selected problem **plus the complete list of other detected problems**, with
confidence, and **«Сделать это»** to switch (which appends an event) ·
**C** the plan — short text + a **graphical step sequence** (number, title, instruction, image) ·
**D** media gallery — every photo/video + **«Добавить фото/видео»** (extra evidence never creates
or charges another repair; do not promise media that is not retained) ·
**E** recommended parts — with the chain
`Рекомендовано → Просмотрено → В корзине → Куплено → Проверено механиком → Отправлено → Установлено`
(never mark a cart line as purchased; never mark a part installed without evidence) ·
**F** the job's own **append-only** event timeline.

**Verification display** — the customer sees the status and the meaningful finding only. Outcome
labels: `Подошла` · `Не подошла` · `Нужны дополнительные доказательства`. **Only an authorised
human action can clear a verification** — never a timeout, never a model.

---

## 7 · The mock-data contract

Create **`src/types/cabinet.ts`** with these shapes. They are drawn from the real
`GET /api/cabinet` payload, so the mock repository and the live backend stay interchangeable.

```ts
export type CabinetSection = "bikes" | "repairs" | "parts" | "payments" | "messages";

export type CabinetStatus =
  | "viewed" | "recommended" | "awaiting_payment" | "paid" | "processing"
  | "shipped" | "delivered" | "returned" | "cancelled";

export const STATUS_LABEL: Record<CabinetStatus, string> = {
  viewed: "Просмотрено",      recommended: "Рекомендовано",
  awaiting_payment: "Ожидает оплаты", paid: "Оплачен",
  processing: "В обработке",  shipped: "В пути",
  delivered: "Доставлено",    returned: "Возврат",  cancelled: "Отменено",
};

export type HistoryKind = "repair" | "recommendation" | "purchase" | "return";
export const KIND_LABEL: Record<HistoryKind, string> = {
  repair: "Ремонт", recommendation: "Рекомендация",
  purchase: "Покупка", return: "Возврат",
};

export interface HistoryRow {
  id: string;
  date: string;                 // ISO date
  what: string;
  kind: HistoryKind;
  amount_rub: number | null;    // null  ->  render an em dash
  status: CabinetStatus;
  ref: { job_id?: number; order_id?: number; product_id?: number };
}

export interface BikePassport {
  bike_id: number;
  nickname?: string;
  make: string;
  model: string;
  year_window?: string;
  photo_url?: string;
  confirmed: { label: string; value: string }[];   // confirmed specs only
  unknown: string[];                               // explicitly unknown, never guessed
  repairs_count: number;
  last_service?: string;
}

export type PartState =
  | "recommended" | "viewed" | "carted" | "purchased"
  | "verified" | "shipped" | "installed";

export interface TicketPart {
  product_id: number;
  name: string;
  image_url?: string;
  state: PartState;
  fit_state: "confirmed" | "compatible_unverified" | "unresolved";
  price_rub: number | null;     // null unless fit_state === "confirmed"
  order_id?: number;
}

export interface TicketMedia { id: number; kind: "photo" | "video"; url: string; ts: string; }
export interface TicketCause { code: string; label: string; confidence: number; }
export interface TicketStep  { index: number; title: string; instruction: string; image_url?: string; }
export interface TicketEvent { ts: string; label: string; }

export interface RepairTicket {
  job_id: number;
  created_at: string;
  status: CabinetStatus;
  bike_id: number;
  symptom: string;
  causes: TicketCause[];            // ALL detected problems
  selected_cause_code: string;      // the one the plan is written for
  plan_text: string;
  steps: TicketStep[];
  media: TicketMedia[];
  parts: TicketPart[];
  verification?: {
    result: "fit" | "mismatch" | "insufficient_evidence";
    decided_at: string;
    findings: string;
  };
  events: TicketEvent[];
}

export interface CabinetPayload {
  ok: boolean;
  customer: { name: string; logged_in: boolean };
  summary: { free_repairs: number; bikes_count: number; active_repairs: number };
  bikes: BikePassport[];
  history: HistoryRow[];
  tickets: RepairTicket[];
}

export interface ChatAnswer { ok: boolean; answer: string; refs: { kind: string; id: number }[]; }
```

**`src/mock/cabinet.ts` must contain** (deterministic, Russian, **no real customer data**):
one logged-in customer · one bicycle with a passport · one paid repair · one recommended part
**purchased** · one recommendation **not** purchased · **one** available free repair · one return ·
**at least one order awaiting verification** · **all three** verification outcomes
(`fit`, `mismatch`, `insufficient_evidence`) · several media items on an existing job · one repair
with **multiple detected problems** · one plan with graphical steps.

`src/api.ts` gains the cabinet calls behind the existing `isMock` early-return:

```ts
cabinet(): Promise<CabinetPayload>            // GET  /api/cabinet
cabinetTicket(jobId: number): Promise<RepairTicket>   // GET /api/cabinet/job/{id}
cabinetAsk(q: string, jobId?: number): Promise<ChatAnswer>  // POST /api/cabinet/ask
```

---

## 8 · Acceptance tests for this round (UI only)

These are the tests the builder must satisfy. They are deliberately **UI-only** — the backend
invariants (idempotent entitlement granting, atomic consumption, customer isolation, `cost` never
exposed) **cannot** be tested in a mock and must **not** be simulated here.

1. All five sections are reachable, as tabs, with no router.
2. The four history filters work; clicking a row opens the correct detail.
3. A bike links to its repairs, and a repair links back to its bike.
4. The Ticket shows all six blocks (A–F) including the full detected-problem list and the
   verification block.
5. The chat accepts typed input and returns a mock **grounded** answer.
6. The free-repair count and «Начать новый ремонт» behave consistently, with correct
   pluralisation.
7. Loading, empty, success and error states all exist and look designed.
8. Desktop **and** mobile layouts are both complete.
9. **No money vocabulary** in any customer-facing string: no `кредит`, `баланс`, `токен`,
   and no ruble value attached to an entitlement.
10. `npm run build` (`tsc --noEmit && vite build`) is clean, and `package.json` still has exactly
    two runtime dependencies.

---

## 9 · Definition of done

A customer can enter the cabinet, see their bicycles and repair history, open a repair, inspect the
recommendations and the verification record, review orders and payments, see the available free
repairs, and ask the chat about their own records — through a coherent, responsive interface, with
no money vocabulary anywhere and no new dependency.

---

## 10 · Do not

* Do not add a router, a state library, or any dependency.
* Do not invent production authentication, payment processing, database access or order
  integration. Those require the real backend.
* Do not create a new commerce system, and do not create a monetary credit wallet.
* Do not replace the existing authentication or checkout.
* Do not mark a part physically verified without an authorised human decision.
* Do not hardcode a colour, and do not introduce a green/amber/grey palette.
* Do not use the words `кредит` / `баланс` / `токен` in customer-facing copy.
* Do not touch the AR journey (`App.tsx`'s existing screens, `ArGuideScreen.tsx`,
  `OfferScreen.tsx`, `src/ar/overlay.ts`, or the locked AR types in `src/types/ar.ts`).

---

## 11 · What is deliberately NOT in this round

| deferred | where it belongs |
|---|---|
| the deep build of **Запчасти и заказы**, **Платежи и документы**, **Bike Passport detail** | Round 10 |
| the store account-page block (PHP + JS) | a separate **OCMOD** job — never the App Builder |
| every backend route, the entitlement engine, the verification workflow | the server track (`CABINET_SPEC_V1.md` §18) |
| the palette decision | open — the app's existing tokens are the working position |

*Everything above is expanded, with the evidence behind it, in `CABINET_SPEC_V1.md`.*