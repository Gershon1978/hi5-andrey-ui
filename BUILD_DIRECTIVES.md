# Build directives (for the AI Studio Build agent)

Owner-approved. **Read `SPEC.md`, `openapi.json`, and `examples/` first — they are the
authoritative contract.** This file is the task list; keep it in sync when you act.

## ROUND 8 — THE INTENT GATE (current)

**Goal: kill "not selected yet".** The fork is asked *while the first video is being analysed*, and
**no result of that video may be rendered until the user presses one of the two pills.**

**Read `INTENT_GATE.md` — it is the contract for this round** (the law, the moment table, the state
machine, the counters, the six test cases, converged with an external review over 4 rounds).
Two code changes make the invariant true today; the rest of that doc is the round after.

1. **No default intent.** `userIntent` is `"REPAIR" | "PARTS" | null`, initial `null`. A
   pre-selected pill is a third state wearing a costume — it must not exist.
2. **Delete the dock button.** In `CHOICE` the two pills are the **only** control: no
   «Продолжить», no always-tappable escape. The dock shows the progress gauge while the receipt is
   being computed, and **nothing else**.
3. **The bubble is a receipt, not an answer.** While processing: «Принял видео, изучаю байк…».
   Once the identity lands: «Вижу {make} {model} ({year}).» + «Помочь:». **No specs, no topology,
   no fault, no price** before a tap — that is the entire point of the round.
4. `PASSPORT` and `PARTS` remain reachable **only** through `handleSelectIntent`, which is called
   only by a pill tap.
5. **Do not build the rest yet** — the coarse `anchor` call with a `session_id` keyframe cache, the
   Tier-4 copy table, the safety intercept, the mismatch bounce state and the new counters need
   brain work and belong to the next round.

**Verify:** `npm run build` green; and a manual pass proving `CHOICE` cannot be passed without a
tap (the pill is the only exit) and the receipt shows identity and nothing else.

## ROUND 6 — the design-token round (kept for reference)
**Goal: put the app on the Andrey design standard.** Read **`DESIGN_STANDARD.md`** (new this round)
first — it is the visual law. `DESIGN_v2.md` still owns the flow and the exact Russian copy.
**Do not change a single string, state, transition or API call this round** — this is a visual-layer round.

1. **Tokens.** Replace the `:root` block in `src/styles.css` with exactly the tokens in
   `DESIGN_STANDARD.md`. The current palette is a red-brand palette that **violates P4** — the standard
   carries a token-by-token mapping table of everything that must change.
2. **P4 — colour discipline.** Blue `#007AFF` for **every** interaction; navy `#0B2545` for all text;
   red `#E02020` **only** for record / stop / danger (the error banner, and the shutter while media is
   actually being captured). **No green, no amber, no second grey** — success badges and cause
   percentages become blue on wash.
3. **Shapes.** Radius exactly: pills / tags / badges `999`, `.speech-bubble` `28`, cards `32`, inputs
   `16`. Nothing sharp anywhere. Snap padding and gaps to `4 / 8 / 12 / 16 / 24 / 32`.
4. **Type.** Only `13 / 14 / 16 / 22` px at weights `400 / 600 / 700` (map 12→13, 15→16, 17→16, 18→22).
5. **Icons.** Replace every emoji with inline monoline SVG (24 px, stroke 2.5, round caps,
   `currentColor`). If an icon can't be drawn in that style, drop it — do not keep the emoji.
6. **`orbit_shutter`.** The camera-opening control becomes the single **round** record control (~72 px,
   wheel motif). It must keep opening the **same** `input type=file capture=environment` — no new
   capability, no new permission, no in-page recording.
7. **`ring`.** Turn the flat `ANALYZING` gauge into the round progress ring (subtle, `10s linear`).
8. Do **NOT** touch `SPEC.md`, `openapi.json`, `examples/*`, `DESIGN_v2.md` or `DESIGN_STANDARD.md`.
   Do **NOT** create a new repo. Do **NOT** commit secrets — the repo is public.
9. Do **NOT** start the ROUND 7 items: the voice-guided loop, the `wheel_guide` asset, a parts backend.

**Verify before you reply:** `npm run build` passes (`tsc --noEmit && vite build`), and run the three
grep checks under "Definition of done" in `DESIGN_STANDARD.md`. Then overwrite `AGENT_REPLY.md` with the
commit SHA, the final `:root` block pasted in, the files changed, and those grep results.

**Note (dev only):** the brain now gates every `/api/*` route behind `X-Andrey-Token` and answers `401`
without it, so local dev needs `ANDREY_TOKEN` in `.env` (see `README.md`; fixed in `80f63ff`).
Keep every call on the relative `/andrey/*` path with the FormData field name `files`, and never read the
token in the browser.

## ROUND 5 — done (reference)
**Read `DESIGN_v2.md` fully — it is the approved design (owner + external review). Rebuild the
UI as a clean, conversational, single-focus flow.** It supersedes the current layout.

Build:
1. A **state machine**: INTRO → RECORD_BIKE → CHOICE → PASSPORT → RECORD_PROBLEM → VERDICT
   (→ DEEPER ≤2 → FORK → TICKET). See `DESIGN_v2.md` §1 for transitions + which API fires.
2. A **single morphing action unit** at the bottom: one primary control that changes role per
   state (camera button → dual-choice → progress gauge). See §4.
3. Two sequential videos: (1) 10 s silent passport video → `POST /api/passport`;
   (2) problem video with sound → `POST /api/flow`. Show the preliminary bike card from the
   passport while the user records video 2.
4. CHOICE = «Помощь в ремонте» (primary) and «Поиск запчастей» → render the passport's
   blueprint / required_parts / consumable_specs / fit_constraints + placeholder CTA
   «Заказать через hi5.bike». **No parts backend exists yet — no dead ends, no fake data.**
5. Use the **exact Russian copy** in `DESIGN_v2.md` §3.
6. **Remove** everything in §6: status chip, raw `gate:` badges, raw ticket JSON, numbered
   stage headers, the big static instruction list, all-at-once form fields.
7. Keep: prices only from the server; `deeper` ⇒ **no prices**, ≤ 2 rounds; all calls via the
   relative `/andrey/*` path; FormData field name `files`.
8. Handle the edge cases in §5 (camera fallback, 0–15/15–30/30–60 s analysis messages,
   «Переснять», network-failure banner that keeps the files).
9. Update `AGENT_REPLY.md`.

Keep `SPEC.md` / `openapi.json` / `examples/*` untouched; keep `DESIGN_v2.md`.

## Round 4 — done (reference)

An external review (Gemini) found real bugs. Fix all of these.

1. **Guard `Object.entries`** for `passport.blueprint` / `passport.standards` /
   `passport.consumable_specs`. Only iterate when the value is a **plain object** (not an
   array, string or null) and filter out empty values. Right now a non-object value can crash
   the render.
2. **Thumbnail memory leak.** Do **not** call `URL.createObjectURL(file)` inside the render
   loop — it re-runs on every tick of the `elapsedSeconds` timer and allocates thousands of
   blob URLs (crashes mobile browsers). Create the object URL **once** in `handleAddFiles`,
   store it in state, and `URL.revokeObjectURL(...)` on remove and on unmount.
3. **Never invent prices.** Remove every hardcoded price fallback. Prices come **only** from
   the server (`diy.price_text` / `diy.price_rub`). When `gate === "deeper"` or `diy` is
   `null`, show **no prices at all**.
4. **`round_no` indexing.** The brain's `/api/deeper` `round_no` defaults to **1**. Send
   `nextRound = (verdict.round_no ?? 0) + 1` and cap the clarifier loop at **2** rounds.
5. **FormData field name** must be exactly `"files"` (not `"files[]"`) in `api.flow`,
   `api.deeper`, `api.passport`.
6. **Proxy timeouts.** In `vite.config.ts` set the `/andrey` proxy `timeout` to **≥ 120000 ms**
   (video flows take 60 s+). Keep every call on the **relative** `"/andrey/*"` path — do not
   use absolute URLs and never read secrets in the browser.
7. Update `AGENT_REPLY.md`.

> Note: we may serve this built SPA from our **own** server (same origin as the brain) behind a
> server-side relay that injects `X-Andrey-Token`, because Google's applet auth-bridge breaks
> POSTs on the bare Cloud Run URL. Keep the app fully relative so that swap is trivial.

## Round 3 — done (reference)


Owner goal: make the app genuinely usable **on a phone** and show the **full** diagnosis.

1. **Phone capture UX.** Replace the single file input with two buttons:
   - "Снять/выбрать видео" → `<input type="file" accept="video/*" capture="environment">`
   - "Добавить фото" → `<input type="file" accept="image/*" capture="environment" multiple>`
   List chosen files with name + size and a "×" remove control; thumbnail for images.

2. **Full Passport.** Render every part of `passport`, hiding empty ones:
   `identity` (make, model, year_window, confidence), `standards`, `consumable_specs`,
   `blueprint` (non-empty only, as label/value rows), `required_parts`, `fit_constraints`.
   Use human labels rather than raw snake_case keys where practical.

3. **Deeper loop caps at 2 rounds.** When `verdict.round_no >= 2` (or after the 2nd clarifier),
   stop asking for photos: show "Достигнут лимит уточнений — показываем наиболее вероятную
   причину" and render the fork for the best cause.

4. **Ticket polish.** Labelled rows for `bike_summary`, `fault_codes`, `detected_specs`,
   `paid_ar_credit_rub` (₽), `customer_note`. Add **"Скопировать"** (copy as text) and
   **"Распечатать"** (`window.print`) buttons.

5. **Resume.** Persist the last result in `localStorage`; on load, if present, offer
   **"Восстановить последний диагноз"**.

6. Do **not** touch `SPEC.md` / `openapi.json` / `examples/*`. Keep all calls via `/andrey`.

7. Update `AGENT_REPLY.md` with what you changed.

## Round 2 — done (reference)

Owner goal: make the app reliably usable **on a phone** against the live Andrey brain.

1. **Backend connectivity indicator.** On load call `GET /andrey/api/health`. Show a small status
   chip: ok → "Андрей на связи"; failure → "Нет связи с Андреем" + a "Повторить" button.
   This proves the `/andrey` proxy is working in the preview.
2. **Robust long-running calls.** `/api/flow` can take ~60 s on a video. Show a progress state with
   elapsed seconds; on failure show the error text and a "Повторить" button. Never leave the UI stuck.
3. **Result actions.** After the ticket appears, add a **"Начать заново"** button that resets all
   state (files, result, errors) back to step 2.
4. **Mobile-first polish.** Primary use is a phone: full-width tap targets, a sticky
   "Диагностировать" button, legible Russian text. Keep the current visual language.
5. Do **not** touch `SPEC.md` / `openapi.json` / `examples/*`. Keep all API access via `/andrey`.
6. Update `AGENT_REPLY.md` with what you changed.

## Round 1 — done (reference)


## Repo discipline
- Stay in **this** repo (`Gershon1978/hi5-andrey-ui`). **Do NOT create a new repo.**
- **Do NOT delete or restructure**: `SPEC.md`, `openapi.json`, `examples/*`, `README.md`.
  They are the contract and the re-import source.
- This repo is **PUBLIC** — never commit secrets. Use env vars only.

## Do these three things (Round 1)
1. **Restore `package-lock.json`.** It was deleted in commit `7b22cfe`. A committed lockfile
   is required for reproducible installs. Run the install, commit the generated
   `package-lock.json`, and keep it in the repo from now on.
2. **`metadata.json` says `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`.** This app does **not**
   call Gemini itself — a remote server (`https://hi5.bike/Andrey`) does all the AI work.
   If that marker is purely informational, keep it. If it makes the runtime expect a Gemini
   key or a server-side Gemini call, **remove it** and say why in your reply.
3. **All API access goes server-side** through the `/andrey` proxy using `ANDREY_BASE` /
   `ANDREY_TOKEN` env vars. Never call `hi5.bike` from the browser.

## Render rules (from `SPEC.md` + `examples/`)
- Confidence is **0–100** (e.g. `75`), not 0–1.
- `verdict.gate === "deeper"` (confidence < 80): show `verdict.deeper` photo asks and
  **HIDE prices** (`diy` and `workshop` are `null`).
- `verdict.gate === "verdict"` (≥ 80): show `diy` (`label`, `tier`, `price_text`, `price_rub`)
  and `workshop` (`detail`, `price_text`), plus `verdict.guarantee`.
- Render **only non-empty** fields (e.g. the fat-bike blueprint is mostly empty).

## Output convention (the file channel — replaces the chat)
- **Write your status to `AGENT_REPLY.md`.** That file is **yours**: overwrite its whole
  contents each round. I will **not** edit it, so there are no merge conflicts.
- Keep it short: a timestamp, the git SHA you acted on, what you did, changed files, questions.
- The task list still lives here, in `BUILD_DIRECTIVES.md` (mine) — read it each round.

## When done
Reply in the chat with a short list of the files you changed, **and** update `AGENT_REPLY.md`.
