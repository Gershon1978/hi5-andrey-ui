# ANDREY — THE INTENT GATE (the fork during processing)

**Status:** converged with Gemini over 4 rounds, 2026-10-09 (thread:
`gemini.google.com/app/7577c09a47c57d5a`). **One item is the owner's to rule — see §1.**
This doc is the contract for the UI; `ANDREY_PRICING.md` still owns the money.

**Why:** the fork is asked **while the first video is being processed**, deliberately —
(a) it buys time, (b) it captures INTENT so the answer can be shaped by it.
Today the fork has three states — REPAIR / PARTS / **not selected yet** — and that third
state silently leaks into the result (our code defaults the intent to `"REPAIR"`).

## 0 · THE RULE (the law — paste-grade)

```
THE INTENT GATE — the rule
1. Render the fork «Помочь:» with dual_pill [ Помощь в ремонте ] / [ Поиск запчастей ]
   during the first video's processing, once the coarse identity lands.
2. The Anchor is strictly a RECEIPT: render ONLY make, model and year before a tap.
3. Prohibit ALL reasoned output, specs, topology, fault lists and prices before a tap.
4. Eliminate "not selected yet": never default, never guess, never auto-switch on timeout.
5. If the user idles, park indefinitely on the receipt and keep the fork alive WITHOUT
   executing downstream pipelines.
6. The tapped intent decides the job: run Repair Diagnosis OR Parts Fitment only after
   the receipt of an intent.
7. Both branches demand the native camera as their immediate next step
   (Repair -> 10 s video with sound; Parts -> macro photo of the marking).
8. Handle an intent mismatch as a full-screen transition STATE with a single redirect
   pill, never as a persistent link.
9. Telemetry enums are strict: `s3_mode_chosen` accepts ONLY "repair" | "parts" —
   zero `timeout_default` values, ever.
```

## 1 · THE ONE OPEN DECISION (owner)

The owner's literal words: *"we need the user to press on either Ремонт OR Buy before we
output the initial video analysis."* The first video always yields *something* — at minimum
the name of the bike. Two readings:

| | Reading | What the user sees while parked | Cost |
|---|---|---|---|
| **A** *(recommended)* | **The receipt is allowed.** Identity only (make + model + year) + the fork; the full analysis is gated. | «Вижу Trek Marlin 7 (2021).» + «Помочь:» + the two pills | Bends the literal rule; a rare misidentification becomes visible before the commit. |
| **B** | **Absolutely nothing.** The fork sits over a spinner. | «Изучаю видео…» + «Помочь:» + the two pills | The user must choose **blind**, with zero proof we parsed their bike → more drop-off. |

**Gemini's ruling: A.** The identity string is a *receipt of transmission*, not an analysis —
it is what un-blinds the choice and proves the machine is alive, and it leaks no spec, no
fault, no price. **I concur.** The gate the owner asked for is a gate on the **answer**, not
on the heartbeat.

## 2 · THE MOMENT TABLE (honest latency: the receipt lands at ~15 s, not 5 s)

| t | the line (one short line) | the ONE control | backend |
|---|---|---|---|
| 0 | «Покажите велосипед: 10 секунд, без звука.» | `orbit_shutter` (native camera) | records one 10 s silent drive-side clip |
| 1–14 | «Изучаю геометрию и трансмиссию…» | **none** | upload (8–12 s) → frame sample (2–3 s) → coarse pass (3–4 s): identity + the Tier-4 quality/safety check. Keyframes kept against `session_id`, 15 min TTL |
| **branch** | «{причина}: {действие} и снимите ещё раз.» | **[ Снять ещё раз (10 с) ]** | Tier-4 REJECT: `low_lux` · `no_drive_side` · `triangle_missing` · `lens_greased`. The fork is **never** shown over a dead video |
| **branch** | «Внимание: обнаружено повреждение рамы ({узел}). Эксплуатация опасна.» | **[ Показать повреждение ]** | safety intercept — terminal, regardless of any intent |
| **15** | «Вижу {марка} {модель} ({год}).» + «Помочь:» | `dual_pill` (vertical, two full-width pills) | **parked.** Receipt only. No breakdown job runs, no tokens burned |
| tap REPAIR | «{марка} {модель} • Ремонт» + «Снимите 10 секунд со звуком: покрутите педали и покажите узел с проблемой.» | [ Снять видео со звуком (10 с) ] | `mode=repair` → the diagnostic pipeline starts |
| tap PARTS | «{марка} {модель} • Запчасти» + «Сфотографируйте маркировку на детали крупным планом.» | [ Снять фото маркировки ] | `mode=parts` → the fitment pipeline starts |
| mismatch | «Похоже, вы показываете {поломку/маркировку}. {Перейти}?» | ONE redirect pill | a state, not a link |
| verdict REPAIR | the diagnosis (FREE) + «Пошаговая настройка и голосовое сопровождение ремонта с Андреем — {price}» | [ Начать ремонт с Андреем — {price} ] | `{price}` comes from the server (150 ₽ today) |
| verdict PARTS ≥ 80 % | part name + price **from the server** + «Инструкция по замене узла с Андреем — {price}» | [ Заказать деталь и инструкцию ] | below 80 %: **zero prices**, ask for the marking photo |

**Notation:** `{…}` = server-provided. A price or a part number is **never** invented in the UI.

## 3 · THE STATE MACHINE

```
[S0_IDLE]
   │  user records the 10 s silent clip
   ▼
[S1_INGESTION] ──(fail: lux/angle/lens)──► [S1_TIER4_REJECT] ──(re-film)──► [S0_IDLE]
   │
   ├──(hazard detected)───────────────────► [S_SAFETY_INTERCEPT]   (terminal)
   │
   ▼ (quality + safety pass)
[S2_PARKED_RECEIPT] ◄───────────────────────────────────────────────────┐
   │                                                                    │
   │  [ Помощь в ремонте ]        [ Поиск запчастей ]                    │
   ▼                              ▼                                     │
[S3_AWAITING_REPAIR_INPUT]   [S3_AWAITING_PARTS_INPUT]                  │
   │  (video with sound)          │  (macro photo of the marking)       │
   ▼                              ▼                                     │
[S4_PROCESSING_REPAIR]       [S4_PROCESSING_PARTS]                      │
   │                              │                                     │
   ├─(payload is a marking)──────►[S4_MISMATCH_TO_PARTS]──[pill]────────┤
   │                              ├─(payload is a broken part)─►[S4_MISMATCH_TO_REPAIR]──[pill]──┤
   ▼ (valid diagnosis)            ▼ (valid fitment)
[S5_VERDICT_REPAIR]          [S5_FITMENT_PARTS]
   │                              ├──(confidence < 80 %)──► [S3_AWAITING_PARTS_INPUT]  (no prices)
   ▼                              ▼ (confidence >= 80 %)
[S6_PAYWALL_REPAIR]          [S6_PAYWALL_PARTS]
```

### Proof of the invariant — no result without intent

1. `S1_INGESTION` has exactly two exits: an error state, or `S2_PARKED_RECEIPT`.
2. `S2_PARKED_RECEIPT` may render **only** `{make}`, `{model}`, `{year}`, the string «Помочь:»
   and the `dual_pill`.
3. Every downstream worker (`Worker_Repair_Diagnosis`, `Worker_Parts_Fitment`) **requires an
   intent argument**.
4. Therefore no route, RPC or queue handler can reach `S5_*` from `S2_PARKED_RECEIPT`.
5. ⇒ **"not selected yet" cannot produce an output, because there is no output to produce.**

## 4 · THE COUNTERS (exact names + exact enums)

| counter | payload / enum |
|---|---|
| `s1_video_uploaded` | `{session_id, duration_ms, file_size_bytes}` |
| `s1_rejected` | `{reason: "low_lux" \| "no_drive_side" \| "triangle_missing" \| "lens_greased"}` |
| `s1_identified` | `{brand, model, year\|null, elapsed_ms}` |
| `s2_receipt_displayed` | `{session_id}` |
| `s2_park_dwell` | `{"0_5s" \| "6_15s" \| "16_45s" \| "46_120s" \| "abandoned_gt_120s"}` — **measures** the park, never endorses it |
| `s3_mode_chosen` | `{mode: "repair" \| "parts"}` — **no `timeout_default`, ever** |
| `s3_mode_switched` | `{from_mode, to_mode, reason: "input_mismatch"}` |
| `s4_cta_tap` | `{mode, target_action: "record_audio_video" \| "capture_macro_photo"}` |
| `s4_input_received` | `{mode, media_type: "video_with_audio" \| "macro_photo"}` |
| `s5_first_answer` | `{mode, confidence_score, prices_shown: boolean}` |
| `s6_paywall_tap` | `{mode, amount_rub_from_server}` ← **the amount is server-provided**, never a client constant |

**Reading the park:** if `abandoned_gt_120s` exceeds ~15 % of `s2_receipt_displayed`, the coarse
pass is too slow — tighten the pipeline, do **not** invent a default.

## 5 · THE SIX TEST CASES

| # | trigger | screen | counters |
|---|---|---|---|
| i | silent pass of a Trek Marlin 7 → tap «Помощь в ремонте» → 10 s video with sound | receipt → the ask → diagnosis (free) + «… с Андреем — {price}» + one pill | `…s2_receipt_displayed → s3_mode_chosen{repair} → s4_cta_tap{repair,record_audio_video} → s4_input_received → s5_first_answer{repair,conf,prices_shown} → s6_paywall_tap{repair}` |
| ii | same, but taps «Поиск запчастей» → macro photo of the marking | the ask for the marking; **no prices** (conf < 80 %) → after the photo, the part + the price **from the server** | `s3_mode_chosen{parts} → s4_cta_tap{parts,capture_macro_photo} → s4_input_received → s5_first_answer{parts,0.95,true}` |
| iii | receipt lands at 14 s, the user walks off for 45 s | the receipt + the fork, still alive, nothing else; no job ran | `s2_receipt_displayed → s2_park_dwell{46_120s} → s3_mode_chosen{repair}` |
| iv | the clip was filmed in an unlit shed (8 lux) | «Слишком темно: включите свет и снимите ещё раз.» + **[ Снять ещё раз (10 с) ]** — the fork is **never** shown | `s1_video_uploaded → s1_rejected{low_lux}` — and **no** `s1_identified`/`s2_*`/`s3_*` |
| v | a cracked head-tube, and the user taps PARTS | «Внимание: обнаружено повреждение рамы ({узел}). Эксплуатация опасна.» + **[ Показать повреждение ]** — terminal, the paywall and fitment are unreachable | `s1_video_uploaded → s1_identified → s1_rejected{safety_hazard_detected}` |
| vi | a snapped derailleur; the user taps PARTS and photographs the dangling part | «Похоже, узел повреждён и требует диагностики. Разобраться с поломкой?» + ONE pill [ Помощь в ремонте ] | `s3_mode_chosen{parts} → s4_input_received → s3_mode_switched{parts→repair,input_mismatch} → s4_cta_tap{repair,record_audio_video}` |

## 6 · THE IMPLEMENTATION DELTA (what changes in our code today)

`hi5-andrey-ui/src/App.tsx`

| # | today | after |
|---|---|---|
| 1 | `useState<"REPAIR" \| "PARTS">("REPAIR")` — a silent default | `useState<"REPAIR" \| "PARTS" \| null>(null)` — **no default exists** |
| 2 | the dock shows `Продолжить: {…}` and calls `handleSelectIntent(userIntent)` → the leak | the button is **deleted**; the two pills are the only control; the dock shows the progress gauge only while the receipt is being computed |
| 3 | the CHOICE bubble: «Принял видео, изучаю байк. Что делаем дальше?» | while processing: «Принял видео, изучаю байк…»; then the **receipt**: «Вижу {марка} {модель} ({год}).» + «Помочь:» |
| 4 | `handleSelectIntent` is reachable without a tap | it is called **only** from a pill tap |

Because `PASSPORT` (the state that renders the standards/tags) and `PARTS` are entered **only**
through `handleSelectIntent`, killing the default and the button makes the invariant true in the
existing state machine — no new state is needed.

**Still to build (later rounds):** the brain-side split (a cheap coarse `anchor` call that keeps the
keyframes against `session_id`, then an intent-carrying breakdown call), the Tier-4 copy table, the
safety intercept, the mismatch bounce state and the new counters.

## 7 · PROVENANCE

Four rounds with Gemini on 2026-10-09 — R1 (its design), R2 (my critique: the timeout default is the
third state; don't compute the answer without intent; the receipt/cache objections), R3 (it conceded,
gave the honest latency budget: upload 8–12 s + sample 2–3 s + coarse 3–4 s ⇒ **receipt at ~15 s**,
plus the moment table, the state machine, the counters, the 6 cases), R4 (the ruling: keep the
receipt; the paywall amount comes from the server; the Tier-4 copy normalised; the law above).
Thread: `https://gemini.google.com/app/7577c09a47c57d5a`.


