# hi5-andrey-ui

Front-end for **Andrey**, the hi5.bike bicycle-repair assistant. This repo is what
**Google AI Studio "Build"** imports. It contains **no AI code and no secrets** — only the
UI + the API contract. The brain stays on the server (`https://hi5.bike/Andrey`).

## What's here
- `SPEC.md` — **read this first**: the screens, the flow, the pricing rules, the gate.
- `openapi.json` — the live API contract (every endpoint + schema).
- `src/` — a minimal React (Vite + TS) scaffold to build on.

## For AI Studio Build
1. **Import from GitHub** → this repo.
2. Set **Secrets** (Settings → Secrets):
   - `ANDREY_BASE` = `https://hi5.bike/Andrey`
   - `ANDREY_TOKEN` = *(leave empty for now)*
3. Ask the agent to **implement the screens in `SPEC.md`**, then wire them to the API.
4. **Call the API from the app's OWN server route** (a small proxy) — never from the browser.
   The browser must never see `ANDREY_BASE`/`ANDREY_TOKEN`, and a server-side call avoids CORS.

## Local dev
```
npm install
npm run dev        # http://localhost:5173  (vite proxies /andrey -> https://hi5.bike/Andrey)
```

## Rules
- Do **not** invent prices or diagnoses — render what the API returns.
- Keep server strings verbatim (Russian, prices, job names).
- Below 80 % confidence the verdict gate is `deeper`: show photo asks, **no prices**.
