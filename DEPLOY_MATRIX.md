# DEPLOY MATRIX — one app, two hosts, and the rules that keep them equal

## The layers

| layer | what | where | who changes it |
|---|---|---|---|
| **source (UI)** | the app: React 18 + Vite 5 + TS | `github.com/Gershon1978/hi5-andrey-ui` (public) — @`72f32f7` | you, via commits. AI Studio **imports** it |
| **source (brain)** | the server: FastAPI `ai-mechanic` modules + routes | `github.com/Gershon1978/hi5-andrey-server` (private) — @`615516f` | you. Applied to the VPS by the chat scripts |
| **host A** (demo/staging) | AI Studio Build preview | Cloud Run `ais-dev-…run.app`, served at **`/`**, behind AI Studio's own cookie auth, **mock-first** (`?mock=1` is the acceptance harness' default) | only from inside AI Studio |
| **host B** (production) | the public app | `https://hi5.bike/Andrey/` → nginx strips the prefix → the brain serves `web/static/`; the relay injects the token | you, via `_deploy_spa.py` |
| **the brain runtime** | the live service | VPS `/root/aim/app`, `127.0.0.1:8140`, relay at `/relay`, `systemctl restart ai-mechanic` | you, via the chat `_deploy_*.py` scripts |

## The ONLY two allowed differences between A and B

1. **Asset base.** A serves at `/`; B serves at `/Andrey/`. The source is deliberately host-neutral;
   production's build passes `--base=/Andrey/` (`npm run build:selfhosted`). `_deploy_spa.py` runs
   that build itself and **refuses to upload** unless the artifact references `/Andrey/assets/…` and
   has no root-absolute `/assets/…`. With `base: "/"` at that sub-path the shop's catch-all answers
   `200 text/html` for the module script and the page never boots (measured 2026-10-13; `curl` was
   green the whole time — only a browser exposed it).
2. **API base.** A: its own server-side proxy route (token in a Secret) — the browser never sees it.
   B: `window.__ANDREY_BASE__ = "/Andrey/relay"` injected into `index.html` **at deploy time**. The
   injection is **not** part of the Vite output; `_deploy_spa.py` re-applies it and asserts it.

Everything else must be identical: **same commit, same bundle hash**. On 2026-10-13 both sides and
the deployed production bundle were `index-BwmBENfS.js`.

## Direction rules — what can overwrite what

* **No remote can overwrite your working copies.** A remote changes local files only when *you* run
  `git pull`. A push that is not a fast-forward is **rejected by git** — losing commits requires an
  explicit `--force` by a human.
* **AI Studio pulls, never pushes.** In AI Studio use *import from GitHub*; do not use *sync my app
  to GitHub*. Then the flow is strictly repo → AI Studio, and the repo stays the source of truth.
* **No hand-editing on a live host.** Change the repo, deploy, verify. The only sanctioned live
  transforms are the two differences above, and the deploy script performs them.
* The brain is edited in its repo and applied to the VPS by `_deploy_*.py`, each of which backs up
  first and prints the exact rollback command.

## Deploy + verify

```sh
# production UI (runs build:selfhosted, asserts the base, injects __ANDREY_BASE__, backs up)
py _deploy_spa.py                 # the real thing
py _deploy_spa.py --check         # preflight only: build + base assertions, no upload

# verification, no spend
py _step1_verify.py               # both builds' shapes + live hash agreement
py _verify_spa_live.py            # live: injection, asset MIME, relay health, lane route
```

## Rollback

```sh
# UI (production)
tar xzf /root/aim/backup_ui_scooterlane_20261013_153510.tar.gz -C /root/aim/app/web/static

# brain
cp -a /root/aim/app/web/passport_api.py.bak_20261013_150828 /root/aim/app/web/passport_api.py
rm -f /root/aim/app/mechanic/code_normalize.py /root/aim/app/mechanic/scooter_codes.py
systemctl restart ai-mechanic
```

## Known gaps (honest)

* The **build stamp** ("which commit is this host running?") is not implemented yet — today it takes
  a hash comparison by hand. Planned: `version.json` + a `<meta>` tag, checked by the verifiers.
* AI Studio's side of the acceptance suite has not been run since the lane shipped; the lane probe
  was run against production only.
* The brain has **no complete versioned home** yet (its repo holds the lane + 4 cabinet-round
  modules; the live service has 23+ modules).
