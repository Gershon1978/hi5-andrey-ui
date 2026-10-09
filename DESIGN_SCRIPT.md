# ANDREY — DESIGN SCRIPT (the owner's view)

_Consolidated 2026-10-09 from the owner's own comments during the live review, plus the
standards they already approved. Where this file and the code disagree, **this file wins**._

Authority:
- **this file** → the owner's rules: what the product looks like and what must never appear.
- `DESIGN_STANDARD.md` → the visual layer (tokens, components, geometry, type, motion).
- `DESIGN_v2.md` → the flow internals (states, transitions, the exact Russian copy).
- `SPEC.md` / `openapi.json` / `examples/` → data, gate, pricing. Prices come **only** from the server.

---

## 0. The owner said (verbatim — these are the requirements, not commentary)

| # | The words |
|---|---|
| 1 | «the new one Andrey/Ui … although it does not look like a clean chat window. looks bizzare — passport?!» |
| 2 | «we do collect and store bike info. but not on frontpage and only for registered clients» |
| 3 | «anyways lets avoid the mess» |
| 4 | «I do not need any button or text at chat. just the bear minimum.» |
| 5 | «there is not text line!!!!! we ask the user to make the video» |
| 6 | «keep clean for now and consolidate into /Andrey. remove the /UI and all mentions.» |

## 1. Digest — the six laws this produces

**L1 — The main page is not a form and not a messenger.**
It does not ask for the bike, the model, the year, the symptom, or anything typed. It asks for a
**video**. That is the entire purpose of the screen.

**L2 — No text line. No send button. No labelled button.**
Typing is never required and never invited on the main page. (This is `P2 Keyboard-less` in
`DESIGN_STANDARD.md` — the composer must not exist at all, not merely be hidden.)

**L3 — Bare minimum = one control.**
At any instant exactly **one** control is on screen. Options appear when relevant and vanish when
not (this is `P1 One thing at a time`). Never two competing choices, never a control that is not
needed right now.

**L4 — Bike data is never collected on the front page.**
The bike is **seen** in the video, not typed in. Anything we *store* about the bike is stored only
for **registered clients** — never asked for on the landing screen, never as a condition of use.

**L5 — Clean means empty.**
No header, no status chip («Андрей на связи»), no stage numbers, no instruction wall, no debug
values, no gate badges, no JSON. A white canvas and the one thing that matters right now.

**L6 — One interface.**
One live URL (`hi5.bike/Andrey`). No twin paths, no `/ui`, no beta copy on the same domain. If two
things show the same product, one of them is a bug.

## 2. Screen 0 — the main page, exactly this and nothing else

```
┌──────────────────────────────────────┐
│                                      │
│   ◉  Андрей   ──── online            │   avatar mark + ring (the wheel motif)
│   ╭──────────────────────────╮       │
│   │ one short line, max       │      │   Spoke Bubble (radius 28)
│   ╰──────────────────────────╯       │
│                                      │
│                                      │
│                ╭───╮                 │
│                │ ◎ │                 │   ORBIT SHUTTER — the only control
│                ╰───╯                 │   round, ~72 px, aperture icon, blue
└──────────────────────────────────────┘
```

- **Interactive elements: exactly one** — the `orbit_shutter`.
- **Text on screen: one short line maximum.** (Variant **"bare"** = no line at all, empty canvas.)
- The shutter opens the **native camera** directly: `input type=file accept="video/*" capture="environment"`.
  No in-page recorder, no new permission, no form.
- Nothing else is rendered — see §4 for the delete list.

## 3. After the tap — still one control at a time

| Step | Screen | The single control |
|---|---|---|
| 1 | tap the shutter → **10 s, silent**, drive-side | *(camera; shutter collapses)* |
| 2 | Andrey narrates what he sees; the fork appears | «Помочь:» → `[ найти поломку ]` · `[ подобрать запчасти ]` (`dual_pill`) |
| 3 | **найти поломку** → **10 s, with sound** | the shutter returns, with a mic badge |
| 4 | analysing | the same unit becomes the `ring` gauge («Андрей слушает и анализирует…») |
| 5 | verdict | causes + **one** hero option (`verdict_card`); `deeper` ⇒ **no prices**, ≤ 2 rounds |
| 6 | chosen path | the 150 ₽ voice-guided session, or the workshop booking, or the parts verdict |

## 4. The delete list — what must NOT be on the main page (audited from the live build)

These were all present on `hi5.bike/Andrey` on 2026-10-09 and every one of them is a violation:

| # | Element | Why it goes |
|---|---|---|
| 1 | Header «Андрей · веломеханик hi5.bike» | L5 — a title is not information |
| 2 | Status chip «Андрей на связи» | L5 — debug state leaking into the product |
| 3 | «Найдена сохранённая сессия диагностики (Scott Big Jon)» banner + × | L5 — a surprise modal on arrival |
| 4 | Numbered stages «1. Как снять», «2. Ваш велосипед» | L5 — the flow is not a form to fill |
| 5 | The capture-instruction wall (the 3 bullets from `/api/capture`) | P9 — instruction is shown, not written; hints come just-in-time |
| 6 | «Модель (необязательно)» input | L4 — the bike is seen, not typed; never asked on the front page |
| 7 | «Что случилось?» input | L2 — typing is never invited |
| 8 | «🎥 Снять / выбрать видео» and «📷 Добавить фото» as labelled buttons | L3/P3 — replaced by the single round `orbit_shutter`; emoji are banned |
| 9 | Duplicated «Диагностировать» | L3 — one action at a time |
| 10 | The text composer | P2/L2 — must not exist at all |
| 11 | Any `gate:` badge, raw ticket JSON, debug output | L5 |

## 5. Non-negotiables (from `DESIGN_STANDARD.md`, unchanged)

- **Colour:** white `#FFFFFF` canvas; blue `#007AFF` for every interaction; navy `#0B2545` for all
  text; red `#E02020` **only** for record / stop / danger. No green, no amber, no second grey —
  success is blue/navy. Wash `#EBF3FF`, hairline `#DCE8FA`, muted `#7C8CA6`.
- **Shape:** everything round — pills `999`, bubble `28`, card `32`; screen radius `40`.
- **Type:** 13 / 14 / 16 / 22 px, weights 400 / 600 / 700 only.
- **Icons:** monoline inline SVG, 24 px, stroke 2.5, round caps, `currentColor`. **No emoji anywhere.**
- **Motif:** the **wheel** — concentric rings (avatar mark, `online-ring`, `orbit_shutter`, `ring`).
- **Tap targets:** ≥ 44 px; the `orbit_shutter` ≈ 72 px.
- **Motion:** `pop` 300 ms; the `ring` fills over the 10 s capture.

## 6. What must never change (the data rail)

- Prices come **only** from the server (`diy.price_text`, `workshop.price_text`). Nothing is invented.
- Confidence < 80 % ⇒ gate `deeper` ⇒ **no prices**, ≤ 2 rounds, then the best cause is forced.
- The 150 ₽ is a **deposit**, credited 1:1 to the part or the repair (never called a payment for info).
- Bike data: **seen** in the video; **stored** only for registered clients (L4).
- `/api/*` stays token-gated for external callers; the page talks only to the same-origin relay.

## 7. Deployment is part of the design script

- **One live URL:** `hi5.bike/Andrey`. No `/ui`, no twin paths, no beta copy on the same domain (L6).
- `hi5.bike/Andrey` → the SPA · `/Andrey/assets/*` → the bundle · `/Andrey/relay/api/*` → the token relay.

## 8. Open decisions (owner to rule)

1. **Andrey's one line on Screen 0** — keep one short sentence (e.g. «Покажите велосипед: 10 секунд,
   без звука.»), shorten, or make Screen 0 **completely bare** (shutter on an empty canvas).
2. **Avatar + online ring** — keep (identity, wheel motif) or drop (pure shutter).

