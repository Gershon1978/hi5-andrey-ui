# tests/ — acceptance harness (NOT app source)

This folder is **not part of the app**. It exists so every round can be checked
against the live deployment instead of being eyeballed.

The app itself deliberately carries **no test framework**: `package.json` is
`react` + `react-dom` only (dependency law), so nothing here is bundled, and no
dependency is added to the app.

## Run

```bash
python tests/accept_deploy.py [deployment-url]
```

Default target is the current AI Studio deployment with `?mock=1`. The script
drives a real browser over CDP (`http://127.0.0.1:9222`), so a Chrome with
remote debugging must be running. It writes `tests/accept_report.txt` and also
prints the report.

Result on 2026-10-12: **19/21 passed**, 2 failures — both the same defect class
(see below). T20 was added after that run, so the suite now carries 22 checks.

## What it asserts

| id | check |
|----|-------|
| T01 | shell boots, correct title |
| T02 | cabinet reachable from the app shell |
| T03 | cabinet payload loads (no error / 401 state) |
| T04 | five sections with the exact expected labels |
| T05 | exactly one tab `aria-selected` and active |
| T06 | tab badges numeric |
| T07 | free-repair counter uses the brief's pluralisation |
| T08 | history table has the 5 columns |
| T09 | history has data rows |
| T20 | repairs section renders its card title |
| T10 | **money law** — «Ремонт» rows show `—` in Сумма, never a ruble value |
| T11 | repair rows carry lifecycle statuses, never store fulfilment |
| T12 | repair ticket detail (blocks A–F) renders |
| T12b | **one repair must not carry two statuses** (row vs ticket header) |
| T12c | no store-fulfilment status on a repair ticket |
| T13 | filters narrow correctly and «Все» restores the full table |
| T14 | «Платежи и документы» still shows the paid 150 ₽ record |
| T15 | no authored money-document vocabulary (НДС / счёт-фактура / 54-ФЗ / кассовый чек) |
| T16 | mobile 390 px: no page overflow, no mid-value date wrap (text-range rects) |
| T17 | no uncaught page errors |
| T18 | no console errors |
| T19 | `?mock=1` short-circuits the cabinet + AR data calls |

## Known failures (as of 2026-10-12)

**T12b/T12c — `src/mock/cabinet.ts` `tickets[].status` was not updated in
Round 9.5.** History rows now say `in_progress` → «В работе» / `done` →
«Завершён», but the ticket objects still carry the store statuses `processing` /
`delivered`, which the ticket-detail header renders (CabinetScreen: block A
badge). So one bicycle repair shows two different statuses:

| job | history row | ticket header |
|-----|-------------|---------------|
| 501 (2026-10-10) | В работе | **В обработке** |
| 480 (2026-08-30) | Завершён | **Доставлено** |

`delivered` on a repair is store-fulfilment vocabulary on a repair — the same
class of bug Round 9.5 fixed for the table rows.

## Notes / non-failures

* T08 compares headers case-insensitively: the rendered `innerText` is uppercase
  because CSS applies `text-transform: uppercase`.
* A `/favicon.ico` 404 appears in the browser console log on first load. It is a
  missing favicon, not an app error, and is not asserted.
* `?mock=1` short-circuits the mock-guarded calls, but `api.health()` and
  `api.capture()` are still unguarded and hit the backend on mount (reported as
  INFO). On a relay-less deployment they would fail loudly; guarding them would
  make mock mode fully offline.
