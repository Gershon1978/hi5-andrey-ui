# Surface A — install the account-page block (OCMOD)

`andrey_cabinet_summary.ocmod.xml` puts the compact Andrey AI cabinet block on the ocStore account
page (`route=account/account`), per `CABINET_IMPLEMENTATION_BRIEF.md` §2.A.

**Status: validated, NOT installed.** Installing a modification is an admin action because it writes a
row into `oc_modification` **and regenerates the compiled tree** — the one operation on this shop that
can take the whole site down. It is therefore deliberately left as a click for the owner.

## What it does

- Injects one hidden `<div>` after `<div class="content-top-box">{{ content_top }}</div>` and reveals
  it only after a good answer. Nothing is shown to an unauthenticated visitor, and nothing changes on
  the page if the brain is down (401 / 500 / 2.5 s timeout all leave the page exactly as it was).
- Shows: available free repairs (with correct Russian plurals), the last repair job, the last order
  (date, item, store status), and the button **«Открыть кабинет AI-ремонт →»**.
- Writes every value with `createTextNode`, so order-item text from the store can never inject HTML.
- Uses only the live theme's own vocabulary (`us-content-title`) plus a scoped style block built on the
  brief's tokens (`#007AFF`, `#0B2545`); no external file, no jQuery dependency.

## One deliberate deviation from the brief's text (verified live 2026-10-15)

The brief says to fetch `/Andrey/api/cabinet/summary`. That path reaches the app **directly** (nginx
strips `/Andrey/` and proxies to `127.0.0.1:8140`), so it hits the `X-Andrey-Token` gate:

| path | response | which gate |
|---|---|---|
| `/Andrey/api/cabinet/summary` | `{"ok":false,"error":"unauthorized"}` | token gate — unbeatable from a browser, the token is a server secret |
| `/Andrey/relay/api/cabinet/summary` | `{"detail":"Нужен вход в аккаунт hi5.bike…","code":"identity_required"}` | identity gate — the relay injected the token, the route ran, only identity refused |

The file uses the **relay** path. (`/Andrey/api/health` answers 200 on both paths because health is
exempt from the token gate — that is why the direct path looks alive at a glance.)

## Install (owner, in the shop admin)

> **Readiness status (2026-10-15): rollback taken and PROVEN.** The compiled tree was backed up and a
> rehearsal restored it into `/tmp` and compared it three ways (file count, canonical fingerprint,
> per-file manifest) — all identical, so the archive is known-restorable *before* anyone clicks Refresh.
> What is still outstanding before install: a maintenance window with the store closed to new checkouts,
> and the post-install checklist below.

### The canonical fingerprint (use this method, not the older one)

```bash
CANON() { (cd "$1" && find . -type f -exec md5sum {} \; | sort -k2 | md5sum | cut -d' ' -f1); }
CANON /var/www/storage/modification
```

Running `find <absolute path> … | xargs md5sum | md5sum` gives a **different** number for an identical
tree, because the hash covers the path text too — the first rehearsal failed for exactly that reason
(live `82cbec33…` vs extract `8d195033…` on identical bytes). Use the version above, whose paths are
relative.

**Baseline recorded 2026-10-15, before install:**

| item | value |
|---|---|
| tree | `/var/www/storage/modification` (`DIR_STORAGE=/var/www/storage/`) |
| files / bytes | 390 / 4,564,267 |
| canonical fingerprint | **`d8d4f00efb05ffca0af30bcc523910da`** |
| (older, path-dependent) | `82cbec3336d080d7f49ffa2a4d7c1dbf` |
| archive | `/root/aim/backups/modification_20261015_233738.tar.gz` (486,600 B) |
| archive sha256 | `a9a823450a4818df32afe69be9952cbc8d0487b3b85c52a3b603e408f070e004` |
| manifest | `/root/aim/backups/modification_20261015_233738.manifest.txt` (390 lines, path+md5) |
| table dump | `/root/aim/backups/oc_modification_20261015_233738.sql` (5,242 B) |
| modifications now | 4 rows (ids 1,2,4,7) — **no Andrey row**, i.e. not installed |
| error.log to watch | `/var/www/storage/logs/error.log` (116,712 B at 2026-10-15 04:32) |

### The window

1. **Store baseline first** (recorded 2026-10-15): `/` 200, `?route=account/login` 200,
   `?route=account/account` **302** for an anonymous visitor. Re-check all three immediately before the
   install; if any differs, stop and investigate before changing anything.
2. Take a fresh backup anyway (things may have moved since): re-run `_ocmod_rollback_kit.py`, which
   re-proves the archive by extraction.
3. Admin → Extensions → Installer: upload `andrey_cabinet_summary.ocmod.xml`.
4. Admin → Extensions → Modifications: the row *"Andrey AI cabinet block (Surface A)"* appears →
   **Refresh** (this is the step that regenerates the tree).
5. Re-run the canonical fingerprint. Expect **more files** than 390 and a **changed** fingerprint, and
   re-run the store baseline: all three routes as in step 1, plus `error.log` unchanged (or explainable).
6. **The block, three ways:** logged-in customer (block shows, CTA works); logged-out visitor (ocStore
   redirects to login, block unreachable; a direct fetch of the relay path must be 401 = hidden);
   Andrey stopped (`systemctl stop ai-mechanic`) → account page renders normally and **no block**.
7. If the refresh breaks the shop, restore:

   ```bash
   tar xzf /root/aim/backups/modification_<ts>.tar.gz -C /var/www/storage/modification
   mysql u0932575_default < /root/aim/backups/oc_modification_<ts>.sql
   # then admin -> Modifications -> Refresh (to rebuild from the restored rows)
   ```


## Acceptance

- [ ] Modifications list shows the row **enabled**; Refresh completes without error.
- [ ] Logged-in account page shows the block with the last order's date, item and store status.
- [ ] Free-repair line is absent when there is no entitlement (brief: "if any").
- [ ] The button goes to `/Andrey/` and opens the cabinet.
- [ ] With `ai-mechanic` stopped, the account page renders normally and no block appears
      (`systemctl stop ai-mechanic`, reload, `systemctl start ai-mechanic`).
- [ ] `error.log` in `system/` gains nothing new.

## Rollback

Admin → Extensions → Modifications → delete the row → **Refresh**. Or restore the compiled tree from
the backup taken in step 1. Removing the row and refreshing cannot lose store data: the modification
only adds markup to one template.

## Known gap (not a defect in this file)

`last_job` is always `null` right now, so the repair-job line never renders. That is honest: nothing
yet keys a repair job to a `customer_id` — the CRM join is one of the open decisions on Argon's list
(`CABINET_IMPLEMENTATION_MAP_2026-10-15.md`). The endpoint is already shaped for it, and the block
already renders it the moment it appears.
