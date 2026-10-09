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
1. On capture, IMMEDIATELY render the ask + the two large cards «Помощь в ремонте» /
   «Поиск запчастей» (a wrench glyph and a cassette glyph) while the video is processed.
2. Render NOTHING derived from the video before the tap: no identity line, no spec, no
   topology, no fault, no reasoned output, no prices. NOT EVEN «Вижу Trek Marlin 7».
3. The identity lands AFTER the tap, as the header of the resolved screen.
4. Eliminate "not selected yet": never default, never guess, never auto-switch on timeout.
5. If the user never taps, hold the ask screen indefinitely and run NO downstream job.
6. The tapped intent decides the job: Repair Diagnosis OR Parts Fitment, only after a tap.
7. Both branches demand the native camera as their immediate next step (Repair -> 10 s
   video with sound; Parts -> macro photo of the marking).
8. A Tier-4 re-film keeps the chosen intent VISIBLE and CHANGEABLE, so the tap is not lost.
9. A mismatch is a full-screen transition STATE with a single pill, never a persistent link.
10. Telemetry is strict: `s3_mode_chosen` accepts ONLY "repair" | "parts" — zero
    `timeout_default` values, ever.
```

## 1 · THE RULING (owner, 2026-10-09) — this SUPERSEDES the A/B reading below

**The user MUST choose Ремонт or Запчасти before we output ANY result of the first video.** Not
merely before the reasoning — before all of it: no identity line, no «Вижу Trek Marlin 7», no spec,
no blueprint, no price. Until the tap the ONLY things on screen are the ask and the two cards. The
ask is made **while the video is being analysed**, so the decision overlaps our processing — no idle
wait, and the two cards ARE the thing to do at that moment. The identity lands **after** the tap, as
the header of the resolved screen.

**The receipt is dead.** We had proposed it (identity only) as the parked state and Gemini endorsed
it; the owner overruled it. The block below is kept as history — do not rebuild it.

### (history) the retired A/B reading

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

## 2 · THE MOMENT TABLE

| t | the line (one short line) | the ONE control | backend |
|---|---|---|---|
| 0 | «Покажите велосипед: 10 секунд, без звука.» | `orbit_shutter` (native camera) | records one 10 s silent drive-side clip |
| **0–1** | **«Пока изучаю видео, чем помочь?»** | **`dual_pill`** — two 96 px cards (a wrench / a cassette) **immediately on capture** | upload (8–12 s) → frame sample (2–3 s) → coarse pass (3–4 s) → the Tier-4 quality/safety check, all in parallel with the tap. Keyframes kept against `session_id`, 15 min TTL |
| 1 → tap | the same ask, unchanged | the same two cards | **nothing about the video is rendered.** No identity, no spec, no fault, no price |
| **branch** | «{причина}: {действие} и снимите ещё раз.» | **[ Снять ещё раз (10 с) ]** + the two cards below it, the chosen one still **active and switchable** | Tier-4 REJECT: `low_lux` · `no_drive_side` · `triangle_missing` · `lens_greased`. The ask is never shown over a dead video, and the tap is **not** lost |
| **branch** | «Внимание: обнаружено повреждение рамы ({узел}). Эксплуатация опасна.» | **[ Показать повреждение ]** | safety intercept — terminal, regardless of any intent |
| **tap REPAIR** | «{марка} {модель} • 1×10» + «Снимите 10 секунд со звуком: покрутите педали и покажите узел с проблемой.» | [ Снять видео со звуком (10 с) ] | `mode=repair` → the diagnostic pipeline runs on the cached frames; the identity is rendered **here**, after the tap |
| **tap PARTS** | «{марка} {модель} • 1×10» + «Базовый стандарт определён. Сфотографируйте маркировку на детали крупным планом.» | [ Снять фото маркировки ] | `mode=parts` → the fitment pipeline runs; **no prices** below 80 % confidence |
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
| 3 | the CHOICE bubble: «Принял видео, изучаю байк. Что делаем дальше?» | the **ask**: «Пока изучаю видео, чем помочь?» — and it never becomes a result |
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

Rounds 5–6 (after the owner's ruling and his visual spec): the ask is asked **immediately** on
capture; the two large cards carry a **wrench** and a **cassette**; the colours and the card anatomy
were corrected onto our tokens; the "cassette in a box" was resolved by dropping the box; and the
Tier-4 re-film was made to preserve the tap.

## 8 · THE CARD SPEC (converged in R5–R6)

**The ask line:** «Пока изучаю видео, чем помочь?» — one line, a genuine question (warm workshop
register; «что вам нужно?» reads transactional). Short variant for a 360 px screen:
«Пока смотрю видео: чем помочь?». A question mark IS allowed here — our old "no question mark" law
was about the colon lead-in «Помочь:», not about a real question.

**Two cards, stacked, full width** (side-by-side fails: a 160 px target is too narrow for a gloved
thumb holding the phone one-handed).

| | spec |
|---|---|
| size | `calc(100vw - 32px)` wide (16 px margins) · **96 px** tall · 12 px gap · radius **24 px** |
| badge | 56 × 56 round, 16 px inset, holding a **32 px monoline glyph** |
| text | at x = 84 px: label 17 px / 700 · sub-label 13 px / 400, line-height 18 px |
| unselected | white fill · 1.5 px `hair` `#DCE8FA` border · badge `wash` `#EBF3FF` · glyph blue `#007AFF` · label navy `#0B2545` · sub-label `muted` `#7C8CA6` |
| **tapped** | fill `#007AFF` · border `#007AFF` · badge white 20 % · glyph white · label white 700 · sub-label white 85 % |

**The two glyphs** (inline SVG in the bundle — zero requests, zero layout shift, visible at t = 0 on
3G; the glyph is `aria-hidden`, the card carries the meaning):

- **Ремонт — гаечный ключ:** a classic **combination spanner** — an open-end jaw at one end, a box
  ring at the other — **along a 45° diagonal**, one continuous monoline path, stroke 2.5, round caps.
- **Запчасти — кассета:** a front-facing **3-sprocket stepped cluster** (outer / middle / spline
  rings) with **teeth as radial ticks** on the outer ring; stroke 2.0 — three concentric rings fuse
  at 2.5 at this size.

**The box is dropped.** The owner asked for "a shinny new casette **in a box** (realistic)"; at a
32 px glyph a box plus a cassette collapses to ≈0.5 px cardboard folds that read as a broken printer
cartridge, and growing the asset to 96 px pushes the cards past 140 px, so the tap zone falls below
the thumb fold on an iPhone SE. The "shiny new" quality comes from clean teeth and our blue, not
from cardboard.

**No product photo on the card.** Our catalogue really does hold studio shots (Deore 10 s 11–42T is
SKU `ACSM410010142`) — but a photo of one real cassette *names an object before the user has stated
a need*, so someone with a snapped cable or worn pads reads the button as "gears only". An abstract
monoline cluster says "spare parts" without narrowing the catalogue. (If photography is ever
mandated: **both** cards photoreal, isolated cut-outs on transparent backgrounds, never mixing
raster with monoline.)

**The park.** At 60 s and at 3 minutes the screen is **identical**: the ask + the two cards — no
decay, no dimming, no auto-route. The client holds the video `File` for the whole session and the
brain holds the sampled keyframes under `session_id` (15 min TTL), so a tap three minutes later
still costs no second upload and no second vision pass. Log `s2_park_dwell{dwell_ms, dwell_bucket}`
on the tap, and `s2_park_abandoned{dwell_ms}` if the tab closes.



