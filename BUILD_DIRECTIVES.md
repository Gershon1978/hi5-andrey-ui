# Build directives (for the AI Studio Build agent)

Owner-approved. **Read `SPEC.md`, `openapi.json`, and `examples/` first — they are the
authoritative contract.** This file is the task list; keep it in sync when you act.

## Repo discipline
- Stay in **this** repo (`Gershon1978/hi5-andrey-ui`). **Do NOT create a new repo.**
- **Do NOT delete or restructure**: `SPEC.md`, `openapi.json`, `examples/*`, `README.md`.
  They are the contract and the re-import source.
- This repo is **PUBLIC** — never commit secrets. Use env vars only.

## Do these three things
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
