# Andrey — design standard v1.0.0 (the app)

Owner-approved. This is the **visual layer**: colour, geometry, type, motion, icons, components.

Division of authority:
- **this file** → the visual layer (colour, shape, type, motion, icons, components).
- **`DESIGN_v2.md`** → the flow: states, transitions, layout per state, and the **exact Russian copy**.
- **`SPEC.md` / `openapi.json` / `examples/`** → data, gate, and pricing. Prices come **only** from the server.

If this file and the code disagree, **this file wins**. Do not change flow or copy in this round.

## Scope
- **In scope — the app:** tokens, components, motion, icons, colour rules, accessibility.
- **Out of scope — NOT the app:** the *Imagery* section at the bottom governs the **marketing asset
  set** (photobank / stylebook / ad shots), **not** the running UI. **Do not generate images for the app.**

## The ten laws
- **P1 One thing at a time** — only the single relevant control is on screen. Options appear when
  relevant and disappear when not. Never two competing choices.
- **P2 Keyboard-less** — no text composer, no send button. The loop is: point → choose one of two →
  record → follow. Typing is never *required*. (The two optional «+» ambient text prompts already in
  the app stay optional and hidden by default.)
- **P3 Everything round** — circles, pills and rings only. No squares, no sharp corners.
- **P4 Colour discipline** — white canvas `#FFFFFF`; blue `#007AFF` for **every interaction**;
  navy `#0B2545` for **all** text; red `#E02020` **ONLY** for record / stop / danger.
- **P5 Show the intelligence** — the AI narrates what it sees as it works: a typing indicator, then
  one short line («Вижу раму…», «Продолжаю диагностировать…»). The visible intelligence IS the product.
- **P6 Calm & clean** — pristine and uncluttered. Never draw on top of the bike frame or over a part.
- **P7 Positive & easy** — friendly, calm, radiating ease of use and reassurance.
- **P8 Diagnostics by video** — two ~10 s clips: a silent intro (whole bike) → a fork → a ~10 s
  issue clip **with** sound.
- **P9 Teach by showing** — instruction is a cartoon image (the 4-section wheel guide), not a wall of text.
- **P10 Hi-tech** — modern, intelligent, premium — restrained, never flashy.

## Tokens (the only colours/sizes allowed)
```
colour:   white #FFFFFF   blue #007AFF   navy #0B2545   red #E02020
          wash  #EBF3FF   hair #DCE8FA   muted #7C8CA6
radius:   pill 999   bubble 28   card 32   screen 40   phone 48
space:    4, 8, 12, 16, 24, 32
type:     family system sans (SF / Segoe / Roboto); sizes 13, 14, 16, 22; weights 400, 600, 700
motion:   pop 300ms cubic-bezier(.2,.8,.25,1) | ring 10s linear | typing 1.2s loop
icon:     monoline, rounded caps, stroke 2.5
motif:    the WHEEL — concentric round rings are the brand device
elevation: soft, large-radius, low-opacity NAVY shadow
```
`wash` = subtle fills (badges, tags, table stripes). `hair` = 1 px hairlines. **There is no green,
no amber, and no second grey.** Success is expressed in **blue / navy**, never green.
`red` is a signal, not a decoration: if a control is not record/stop/danger it is **blue**.


## Components (named — use these names in code comments)
| id | name | what it is | in this app |
|---|---|---|---|
| `orbit_shutter` | **Orbit Shutter** | the single **round** record control; turns RED only while recording/arming | replaces the rectangular pill that opens the camera, in `INTRO`, `PASSPORT` and `DEEPER` |
| `dual_pill` | **Hub Choice (DualPill)** | the two-way fork (Запчасти / Ремонт) | `CHOICE` — the two `.choice-card`s |
| `bubble` | **Spoke Bubble** | message bubble, **radius 28** | `.speech-bubble` |
| `typing` | **Thinking Bubble** | the AI narration while it works | `.progress-gauge` in `ANALYZING` and `CHOICE` |
| `ring` | **Rim Ring** | progress / countdown ring | turns the flat `ANALYZING` gauge into a ring |
| `verdict_card` | **Spoke Action Card** | the verdict + one round button | `.card-unit` in `VERDICT`, `.fork-card` |
| `part_card` | **Part Card** | round thumbnail + name + price | `.spec-table` rows in `PARTS` |
| `wheel_guide` | **Wheel Guide** | the 4-section cartoon how-to | **DEFERRED — asset not in the repo. Do NOT fake it, do NOT draw it.** |
| `phone` | **Phone Screen** | the iPhone frame | **OUT OF SCOPE — marketing imagery only** |

## Where the app violates P4 today (must be fixed)
`src/styles.css` currently runs a **red-brand** palette that contradicts P4:

| token in code | now | must become |
|---|---|---|
| `--brand` | `#e63946` (red, used on **every** CTA) | `#007AFF` blue |
| `--brand-light` | `#fef0f1` | `#EBF3FF` wash |
| `--ink` | `#14171a` | `#0B2545` navy |
| `--muted` | `#5b6470` | `#7C8CA6` |
| `--line` | `#e3e7ec` | `#DCE8FA` hair |
| `--app-bg` | `#f6f8fa` | `#FFFFFF` white |
| `--ok` / `--ok-bg` | `#1a7f37` / `#e6f4ea` (**green**) | blue `#007AFF` on `#EBF3FF` |
| `--warn` / `--warn-bg` | `#b26a00` / `#fff4e5` (**amber**) | navy `#0B2545` on `#EBF3FF` |
| `.online-ring` | `#22c55e` (green) | `#007AFF` |
| `.error-banner` | `#ffebe9` / `#cf222e` | `#FFFFFF` bg, `#E02020` text + border |

Control by control, after the fix:
- **blue** (`#007AFF` filled, white label): «Показать велосипед», «Снять видео поломки»,
  «Продолжить: …», «Загрузить фото узла», «Передать заявку в hi5.bike», «Заказать через hi5.bike»,
  `Повторить` in the error banner, the selected `dual_pill`, «Переснять».
- **white + hairline, navy label** (`.btn-pill.secondary`): «Начать заново».
- **red** (`#E02020`) **only**: the `.error-banner` text/border, and the `orbit_shutter` while media is
  actually being captured/uploaded. Nowhere else. Ever.
- **navy** (`#0B2545`): 100 % of text — prices, causes, specs, labels.
- Percentages (`.cause-conf`) and the success badges («Велосипед опознан», «Заявка зарегистрирована»)
  → **blue on wash**.

## Geometry, type, motion, icons
- **Radius:** pills / buttons / badges / tags `999`; `bubble` (`.speech-bubble`) `28`; `card`
  (`.card-unit`, `.fork-card`, `.choice-card`) `32`; inputs `16` (the standard defines no input radius —
  keep 16 and stay consistent). **No other radius values.**
- **Type:** only `13 / 14 / 16 / 22` px at weights `400 / 600 / 700`. Map: 12→13, 15→16, 17→16,
  18→22. The 22 px moments are the bike name and the DIY / workshop price. Body line-height 1.5.
- **Space:** stay on `4 / 8 / 12 / 16 / 24 / 32`; snap off-scale padding/gaps.
- **Motion:** state changes use `pop` (`300ms cubic-bezier(.2,.8,.25,1)`); AI typing dots loop `1.2s`;
  a capture ring runs `10s linear`. Subtle — no bouncing, no jitter.
- **Icons:** replace **every emoji** with **inline monoline SVG** — 24 px, `stroke-width: 2.5`,
  `stroke-linecap: round`, `currentColor`, no fill. If you cannot draw an icon in that style, **drop the
  icon** rather than keep the emoji or invent a different style.
- **Motif:** the **WHEEL / concentric rings**. Allowed placements: the avatar mark, the `online-ring`,
  the `orbit_shutter`, the `ring` gauge. Never drawn over a bike photo.

## Accessibility
- Minimum tap target **44 × 44 px**; the `orbit_shutter` is ~72 px.
- Contrast **AA** minimum: navy on white ≈ 13:1; white on blue ≈ 4.6:1, so any label on blue is ≥16 px/700.
- Never signal state by colour alone — pair it with a label or a shape.

## Anti-patterns (instant fail)
1. Red on a normal navigation/CTA. 2. Green or amber anywhere. 3. An emoji in the UI. 4. A sharp corner.
5. Two competing choices on screen at once. 6. Text in any colour other than navy/muted.
7. A hardcoded price or a fake part. 8. Placeholder / wheel-guide art that was not supplied.
9. A mark drawn on top of the bike. 10. Any change to flow or copy.

## Imagery — OUT OF SCOPE for the app (marketing asset set only)
Everything is seen **through** an iPhone 16e screen (white rounded frame + notch); the bike exists only
inside the screen; outside is plain white with a soft blue glow. A hand holds the **red** record button —
the hand is ON the button, outside the screen. **One message per image.** Never draw a reticle, ring or
any mark on top of the bike or a part. Show the AI working with a typing bubble and one short line.
Look: realistic-cartoonish, instructional, hi-tech, positive. Negative: photorealism without style,
moody/dark lighting, messy garage, sharp corners, extra UI, watermarks, any mark over the bike.
**This section must not be used to generate images for the running UI.**

## Definition of done (ROUND 6)
- `:root` contains exactly the tokens above and nothing off-standard.
- `grep -nE '#(e63946|fef0f1|14171a|5b6470|e3e7ec|f6f8fa|1a7f37|e6f4ea|b26a00|fff4e5|22c55e|cf222e|ffebe9)' src/styles.css`
  → **no matches**.
- No emoji left anywhere in `src/`.
- Every button ≥ 44 px and blue, unless it is `secondary` (white) or genuinely record/danger (red).
- `npm run build` passes (`tsc --noEmit && vite build`).
- Copy, flow, states, API calls and price logic are **unchanged** from before this round.
- `AGENT_REPLY.md` overwritten with: the commit SHA, the final `:root` block pasted in, the files
  changed, and the grep results proving the three checks above.
