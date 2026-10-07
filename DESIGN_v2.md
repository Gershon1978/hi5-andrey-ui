# DESIGN v2 — conversational single-focus flow

Owner's principle: a clean screen, minimal foreign elements, all actions blended in. Andrey
speaks in first person. One primary action at a time — no dashboards, no numbered stages.

## 1. State machine (each state → its API call)

```
[S0 INTRO]           mount: GET /api/health + GET /api/capture
   │  tap «Показать велосипед»
[S1 RECORD_BIKE]     input type=file accept=video/* capture=environment
   │  video chosen   → POST /api/passport(files=[video1], use_web=true)  (runs in background)
[S2 CHOICE]          (analysis runs) ask goal
   ├─ «Поиск запчастей»  → [S2 PARTS]   (no backend yet — see §7)
   └─ «Помощь в ремонте» → wait for passport
[S3 PASSPORT]        passport resolved → show bike card
   │  tap «Снять видео поломки»
[S4 RECORD_PROBLEM]  input type=file accept=video/* capture=environment (audio on)
   │  video chosen   → POST /api/flow(files=[video2], symptom=passed-in-hint, model)
[S5 VERDICT]
   ├─ gate == "verdict"  → [VERDICT_FORK] → tap → POST /api/handoff → [TICKET]
   └─ gate == "deeper" & round<2 → [DEEPER] → POST /api/deeper → back to [S5]
        round>=2 → show "лимит уточнений", force best cause → [VERDICT_FORK]
```

## 2. Layout per state (single card canvas, ~480 px, no borders/clutter)

- **INTRO** — centre: small Andrey avatar + online ring; speech bubble. bottom: one large
  pill button + a discreet caption.
- **CHOICE** — top: pulsing progress + current video frame preview. centre: speech block.
  bottom: two stacked option cards.
- **PASSPORT** — centre: badge «Велосипед опознан» + «Я узнал твой байк: {make} {model} ({year})»
  + 2–3 tags. bottom: primary button + a micro-link «Модель определена неверно».
- **RECORD_PROBLEM** — centre: camera/audio icon + hint. bottom: recording pill.
- **VERDICT_FORK** — top: causes with %. middle: two equal cards (DIY / Workshop).
  bottom: «Передать заявку в hi5.bike».
- **DEEPER** — centre: speech + bullet asks from `verdict.deeper[]` + «Уточнение 1 из 2».
  bottom: one upload button. **NO prices.**
- **TICKET** — centre: confirmation. (No JSON dump.)

## 3. Exact Russian copy

| State | Element | Copy |
|---|---|---|
| Intro | Header | `Андрей · AI-механик` |
| Intro | Speech | «Привет, я AI-копия веломастера Андрея из мастерской hi5.bike. Чтобы я был полезен, сначала покажи, на чём катаешься.» |
| Intro | Button | `Показать велосипед` |
| Intro | Hint | `Короткое видео 10 сек. без звука со стороны цепи` |
| Choice | Speech | «Принял видео, изучаю байк. Что делаем дальше?» |
| Choice | 1 | `Помощь в ремонте` / `Разберёмся со звуками, люфтами и переключением` |
| Choice | 2 | `Поиск запчастей` / `Определим стандарты цепи, колодок и расходников` |
| Passport | Speech | «Я узнал твой байк: **{make} {model}** ({year}). Теперь покажи, что случилось.» |
| Passport | Button | `Снять видео поломки` |
| Record 2 | Hint | «Снимите 10 сек. со звуком: покрутите педали, пощелкайте переключателем или покажите место люфта.» |
| Analyzing | Title | `Андрей слушает и анализирует…` |
| Analyzing | Note | `Это занимает около 30–45 секунд. Не закрывайте экран.` |
| Verdict | Speech | «Вот что удалось определить по звуку и механике:» |
| Verdict | Cause | `{label} — {confidence}% вероятность` |
| Verdict | DIY | `Сделать самому` / `Пошаговый AI-гид по ремонту` |
| Verdict | Shop | `В мастерской hi5.bike` / `Сделаем всё за вас с гарантией` |
| Verdict | CTA | `Передать заявку в hi5.bike` |
| Deeper | Speech | «Звук неоднозначный (уверенность меньше 80%). Чтобы не гадать, снимите эти узлы крупнее:» |
| Deeper | Limit | «Достигнут лимит уточнений. Показываем наиболее вероятный диагноз.» |
| Ticket | Speech | «Заявка передана механикам в hi5.bike. Мы уже ждём вас в мастерской.» |
| Error | Banner | «Что-то пошло не так при анализе. Попробуем ещё раз?» / `Повторить` |

## 4. Blended actions — the "morphing action unit"
One persistent control at the bottom that changes role per state:
- INTRO → `[ 🎥 Показать велосипед ]` → opens the native camera directly (no form screen).
- file chosen → morphs into the pulsing dual-choice (Ремонт / Запчасти).
- loading → becomes a progress gauge with elapsed seconds («Андрей смотрит… 14 с»).
- Optional metadata is folded behind ambient prompts: `+ Назвать модель текстом`,
  `+ Написать симптом словами` — never mandatory upfront.

## 5. Edge cases
- **No camera / desktop:** fall back to file picker + «Не удалось открыть камеру напрямую.
  Выберите готовый видеофайл из галереи».
- **Slow analysis:** rotating messages 0–15 s «изучает трансмиссию и геометрию…», 15–30 s
  «слушаем аудиодорожку…», 30–60 s «сверяем параметры со справочником…». Never freeze.
- **deeper:** NO prices; up to 2 rounds then force the best cause.
- **Re-take:** small «Переснять» under each clip preview.
- **Network failure:** keep files in memory; banner «Связь с сервером прервалась. Файлы
  сохранены. [Повторить отправку]».

## 6. Remove from the current UI
1. The debug header / `status-chip` («Андрей на связи»).
2. Raw `gate: pass` / `gate: deeper` badges (gates must drive layout, not be rendered).
3. The raw ticket JSON `<pre>{JSON.stringify(ticket)}</pre>`.
4. The numbered stage headers (1. Как снять … 5. Заявка).
5. The static big capture-instruction list from `GET /api/capture` (replace with just-in-time hints).
6. All-at-once form fields (model + symptom + two drop zones on first load).

## 7. Parts branch (no backend yet)
Until a `POST /api/parts/search {model, query, blueprint}` exists (returns
`[{id, name, in_stock, price_rub, link}]`), the «Поиск запчастей» choice should render the
detected bike's `blueprint` / `required_parts` / `consumable_specs` / `fit_constraints` with a
placeholder CTA «Заказать через hi5.bike» — no dead ends, no fake data.
