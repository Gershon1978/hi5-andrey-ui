"""Acceptance suite for the AI Repair customer cabinet, run against the LIVE
AI Studio deployment.

The project deliberately carries no test framework (`package.json` = react +
react-dom only, no `test` script), so these tests are black-box: they drive the
real deployment over CDP and assert user-visible behaviour and the locked
design/money laws.  Re-runnable after every round.

Usage: python tests/accept_deploy.py [deployment-url]
"""
import asyncio
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "accept_report.txt")
DEV = (sys.argv[1] if len(sys.argv) > 1
       else "https://ais-dev-rq5sym4d5dzttigwkycfru-999413900076."
            "europe-west2.run.app/?mock=1")

RESULTS = []
PAGE_ERRORS = []
CONSOLE_ERRORS = []
ANDREY_CALLS = []

# ---------------------------------------------------------------- assertions
TAB_LABELS = {"Мои велосипеды", "Мои ремонты", "Запчасти и заказы",
              "Платежи и документы", "Сообщения"}
FILTERS = ["Все", "Покупки", "Рекомендации", "Ремонты"]
HEADERS = ["Дата", "Что", "Тип", "Сумма", "Статус"]
# money law: the cabinet must never author store money documents
BANNED = ["НДС", "счёт-фактура", "счет-фактура", "54-ФЗ", "кассовый чек"]
# "Ремонт" rows must never carry a store-fulfilment status
STORE_STATUSES = {"В пути", "Доставлено", "Обработка", "В обработке",
                  "Возврат", "Отправлено"}
REPAIR_STATUSES_OK = {"В работе", "Завершён", "Ожидает оплаты", "Оплачен",
                      "Просмотрено", "Рекомендовано", "Отменено"}


def w(s=""):
    with open(OUT, "a", encoding="utf-8") as f:
        f.write(str(s) + "\n")


def chk(name, ok, detail=""):
    RESULTS.append((name, bool(ok)))
    w("%-4s %s%s" % ("PASS" if ok else "FAIL", name,
                     ("   | " + str(detail)) if detail else ""))


def plural(n):
    """Mirror of CabinetScreen.formatFreeRepairsPlural (Section 5 of the brief)."""
    if n <= 0:
        return "Нет доступных бесплатных ремонтов"
    m10, m100 = n % 10, n % 100
    if m10 == 1 and m100 != 11:
        return "Доступен %d бесплатный ремонт" % n
    if 2 <= m10 <= 4 and not 12 <= m100 <= 14:
        return "Доступно %d бесплатных ремонта" % n
    return "Доступно %d бесплатных ремонтов" % n


# ------------------------------------------------------------- js probes
JS_ENTER_CABINET = r"""() => {
  const els = Array.from(document.querySelectorAll('button,a'));
  const hit = els.find(e => /кабинет/i.test(e.innerText || ''));
  if (hit) { hit.click(); return (hit.innerText || '').trim(); }
  return '';
}"""

JS_TABS = r"""() => Array.from(document.querySelectorAll('.cabinet-tab-btn'))
  .map(b => ({
    label: ((b.innerText || '').split('\n')[0] || '').trim(),
    badge: ((b.querySelector('.tab-badge') || {}).textContent || '').trim(),
    sel: b.getAttribute('aria-selected') === 'true',
    active: /is-active/.test(b.className),
  }))"""

JS_TITLES = r"""() => Array.from(document.querySelectorAll('.card-title'))
  .map(e => (e.innerText || '').trim())"""

JS_HEADERS = r"""() => Array.from(document.querySelectorAll('.history-table thead th'))
  .map(th => (th.innerText || '').trim())"""

JS_ROWS = r"""() => Array.from(document.querySelectorAll('.history-table tbody tr'))
  .map(tr => {
    const tds = Array.from(tr.querySelectorAll('td')).map(t => (t.innerText||'').trim());
    return { date: tds[0]||'', what: tds[1]||'', kind: tds[2]||'',
             amount: tds[3]||'', status: tds[4]||'',
             interactive: /row-interactive/.test(tr.className) };
  })"""

JS_DASH = r"""() => ({
  num: ((document.querySelector('.dash-card-num') || {}).innerText || '').trim(),
  text: ((document.querySelector('.dash-card-text') || {}).innerText || '').trim(),
})"""

JS_CLICK_FILTER = r"""(label) => {
  const b = Array.from(document.querySelectorAll('.filter-chip'))
    .find(x => (x.innerText || '').trim() === label);
  if (b) { b.click(); return true; }
  return false;
}"""

JS_CLICK_TAB = r"""(label) => {
  const b = Array.from(document.querySelectorAll('.cabinet-tab-btn'))
    .find(x => ((x.innerText || '').trim().startsWith(label)));
  if (b) { b.click(); return true; }
  return false;
}"""

JS_VOCAB = r"""() => {
  const b = document.body.innerText || '';
  return %s.filter(v => b.includes(v));
}""" % (BANNED,)

JS_MOBILE = r"""() => {
  const de = document.documentElement;
  const lineCount = el => {
    const r = document.createRange();
    r.selectNodeContents(el);
    return r.getClientRects().length;
  };
  const tds = Array.from(document.querySelectorAll('.history-table tbody tr td:first-child'));
  return {
    overflow: de.scrollWidth - de.clientWidth,
    wrapped: tds.filter(td => lineCount(td) > 1).length,
    cells: tds.length,
  };
}"""

JS_CLICK_ROW = r"""(date) => {
  const trs = Array.from(document.querySelectorAll('.history-table tbody tr'));
  const tr = trs.find(x => (((x.querySelector('td') || {}).innerText) || '').trim() === date);
  if (tr) { tr.click(); return true; }
  return false;
}"""

JS_TICKET_STATUS = r"""() => {
  const d = document.querySelector('.ticket-detail-view');
  if (!d) return '';
  return (((d.innerText || '').trim().split('\n'))[0] || '').trim();
}"""

JS_PAYMENTS = r"""() => {
  const cards = Array.from(document.querySelectorAll('.card-unit'));
  const pay = cards.find(c => /Платежи и документы/.test(
    ((c.querySelector('.card-title') || {}).innerText || '')));
  return pay ? (pay.innerText || '') : '';
}"""


def norm(s):
    return (s or "").replace("\u00a0", " ").replace("\u202f", " ").strip()


async def main():
    from playwright.async_api import async_playwright
    pw = await async_playwright().start()
    b = await pw.chromium.connect_over_cdp("http://127.0.0.1:9222")
    ctx = b.contexts[0]

    page = await ctx.new_page()          # never disturb the user's tabs
    page.on("pageerror", lambda e: PAGE_ERRORS.append(str(e)))
    page.on("console", lambda m: CONSOLE_ERRORS.append(m.text)
            if m.type == "error" else None)
    page.on("request", lambda r: ANDREY_CALLS.append(r.url)
            if "/andrey/" in r.url else None)

    try:
        w("URL  %s" % DEV)
        await page.goto(DEV, wait_until="domcontentloaded", timeout=70000)
        await page.wait_for_timeout(3500)

        # T01 — the shell boots
        title = await page.title()
        chk("T01 shell boots (title / no crash)", "Андрей" in title, title)

        # T02 — reach the cabinet
        clicked = await page.evaluate(JS_ENTER_CABINET)
        ok = False
        if clicked:
            try:
                await page.wait_for_selector(".cabinet-nav-tabs", timeout=15000)
                ok = True
            except Exception:
                ok = False
        chk("T02 cabinet reachable from the app", ok, "via %r" % clicked)

        body = await page.evaluate("() => document.body.innerText || ''")
        chk("T03 cabinet data loaded (no error/401 state)",
            "Ошибка загрузки кабинета" not in body
            and "Требуется авторизация" not in body)

        # T04..T06 — the five sections
        tabs = await page.evaluate(JS_TABS)
        labels = {t["label"] for t in tabs}
        chk("T04 five sections, correct labels", len(tabs) == 5
            and labels == TAB_LABELS, sorted(labels))
        chk("T05 exactly one tab selected+active",
            sum(1 for t in tabs if t["sel"]) == 1
            and sum(1 for t in tabs if t["active"]) == 1,
            [(t["label"], t["sel"], t["active"]) for t in tabs])
        chk("T06 tab badges are numeric",
            all(re.fullmatch(r"\d+", t["badge"] or "")
                for t in tabs if t["label"] in ("Мои велосипеды", "Мои ремонты")),
            [(t["label"], t["badge"]) for t in tabs])

        # T07 — dashboard free-repair pluralisation (brief Section 5)
        dash = await page.evaluate(JS_DASH)
        n = int(dash["num"]) if re.fullmatch(r"\d+", dash["num"] or "") else -1
        chk("T07 free-repair counter pluralisation",
            n >= 0 and dash["text"] == plural(n),
            "num=%s text=%r expected=%r" % (dash["num"], dash["text"],
                                            plural(n) if n >= 0 else "?"))

        # T08/T09 — repairs section: table contract
        headers = await page.evaluate(JS_HEADERS)
        chk("T08 history table has the 5 columns",
            [h.upper() for h in headers] == [h.upper() for h in HEADERS], headers)
        rows = await page.evaluate(JS_ROWS)
        all_count = len(rows)
        chk("T09 history has data rows", all_count > 0, "rows=%d" % all_count)

        titles = await page.evaluate(JS_TITLES)
        chk("T20 repairs section renders its card title",
            any("Единая история активности" in t for t in titles), titles)

        # T10/T11 — the money law and the repair lifecycle
        rep = [r for r in rows if r["kind"] == "Ремонт"]
        bad_amount = [r for r in rep
                      if "₽" in norm(r["amount"]) or norm(r["amount"]) != "—"]
        chk("T10 Ремонт rows show no ruble value in Сумма",
            len(rep) > 0 and not bad_amount,
            "repair=%d offenders=%s" % (len(rep), bad_amount[:2]))
        rstat = {norm(r["status"]) for r in rep}
        chk("T11 repair statuses are lifecycle, never store fulfilment",
            bool(rstat) and rstat <= REPAIR_STATUSES_OK
            and not (rstat & STORE_STATUSES)
            and "В работе" in rstat and "Завершён" in rstat, sorted(rstat))

        # T12 — ticket A-F drill-down
        detail = await page.evaluate(
            "() => (document.querySelector('.ticket-detail-view') || {}).innerText || ''")
        chk("T12 repair ticket detail (A-F) renders",
            "Заказ-наряд #" in detail and "Симптом" in detail,
            detail[:60].replace("\n", " "))

        # T12b/T12c — one repair must not carry two different statuses
        tstat = {}
        for r0 in [x for x in rows if x["kind"] == "Ремонт"]:
            if await page.evaluate(JS_CLICK_ROW, r0["date"]):
                await page.wait_for_timeout(400)
                tstat[r0["date"]] = (norm(r0["status"]),
                                     norm(await page.evaluate(JS_TICKET_STATUS)))
        mism = {k: v for k, v in tstat.items() if v[0] != v[1]}
        chk("T12b repair row status == ticket detail status", not mism,
            mism or tstat)
        chk("T12c no store-fulfilment status on a repair ticket",
            not [v for v in tstat.values() if v[1] in STORE_STATUSES],
            sorted({v[1] for v in tstat.values()}))

        # T13 — filters narrow the table and «Все» restores it
        await page.evaluate(JS_CLICK_FILTER, "Ремонты")
        await page.wait_for_timeout(500)
        r_only = await page.evaluate(JS_ROWS)
        await page.evaluate(JS_CLICK_FILTER, "Покупки")
        await page.wait_for_timeout(500)
        p_only = await page.evaluate(JS_ROWS)
        await page.evaluate(JS_CLICK_FILTER, "Все")
        await page.wait_for_timeout(500)
        back = await page.evaluate(JS_ROWS)
        chk("T13 filters narrow correctly and «Все» restores",
            bool(r_only) and all(r["kind"] == "Ремонт" for r in r_only)
            and bool(p_only) and all(r["kind"] == "Покупка" for r in p_only)
            and len(back) == all_count,
            "ремонт=%d покупки=%d все=%d/%d"
            % (len(r_only), len(p_only), len(back), all_count))

        # T14 — payments keep the paid record
        await page.evaluate(JS_CLICK_TAB, "Платежи")
        await page.wait_for_timeout(700)
        pay = norm(await page.evaluate(JS_PAYMENTS))
        chk("T14 Платежи и документы still shows the 150 ₽ payment",
            "150 ₽" in pay and "₽" in pay, pay[:90].replace("\n", " "))

        # T15 — money vocabulary ban (the cabinet authors no store documents)
        bad_words = await page.evaluate(JS_VOCAB)
        chk("T15 no authored money-document vocabulary", not bad_words, bad_words)

        # T16 — mobile
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.evaluate(JS_CLICK_TAB, "Мои ремонты")
        await page.wait_for_timeout(800)
        mob = await page.evaluate(JS_MOBILE)
        chk("T16 mobile 390px: no overflow, dates do not wrap",
            mob["overflow"] <= 2 and mob["wrapped"] == 0,
            "overflow=%s wrapped=%s cells=%s"
            % (mob["overflow"], mob["wrapped"], mob["cells"]))

        # T17..T19 — runtime hygiene
        chk("T17 no uncaught page errors", not PAGE_ERRORS, PAGE_ERRORS[:2])
        chk("T18 no console errors", not CONSOLE_ERRORS, CONSOLE_ERRORS[:2])
        guarded = [u for u in ANDREY_CALLS
                   if "/api/cabinet" in u or "/api/ar/" in u]
        chk("T19 ?mock=1 short-circuits the data calls (no cabinet/AR fetch)",
            not guarded, guarded[:3])
        if ANDREY_CALLS:
            w("INFO backend calls still made in mock mode: %s"
              % sorted({u.split("/andrey/")[-1] for u in ANDREY_CALLS}))
    finally:
        await page.close()

    passed = sum(1 for _, ok in RESULTS if ok)
    w("")
    w("================ RESULT  %d/%d passed ================"
      % (passed, len(RESULTS)))
    for name, ok in RESULTS:
        if not ok:
            w("FAILED: " + name)
    await pw.stop()


open(OUT, "w", encoding="utf-8").close()
try:
    asyncio.run(main())
except Exception as e:
    import traceback
    w("FATAL=" + repr(e))
    w(traceback.format_exc())
print(open(OUT, encoding="utf-8").read())
print("RESULT_FILE=" + OUT)
