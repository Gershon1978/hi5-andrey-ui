# Build directives (for the AI Studio Build agent)

Owner-approved. **Read `SPEC.md`, `openapi.json`, and `examples/` first — they are the
authoritative contract.** This file is the task list; keep it in sync when you act.

## ROUND 2 — current tasks
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
