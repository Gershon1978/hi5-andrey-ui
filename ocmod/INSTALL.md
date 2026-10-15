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

1. **Back up the two things that matter** — the modifications table and the compiled tree:

   ```bash
   mysqldump u0932575_default oc_modification > /root/oc_modification_before.sql
   find /var/www/storage/modification -type f | sort | xargs md5sum | md5sum   # fingerprint
   find /var/www/storage/modification -type f | wc -l                          # 390 on 2026-10-15
   ```

   Baseline before install: **390 files, 5.5 MB, fingerprint `82cbec3336d080d7f49ffa2a4d7c1dbf`.**

2. Admin → **Extensions → Installer**: upload `andrey_cabinet_summary.ocmod.xml`.
3. Admin → **Extensions → Modifications**: the row *"Andrey AI cabinet block (Surface A)"* appears →
   press **Refresh** (the blue button). This is the step that regenerates the compiled tree.
4. Re-run the fingerprint. Expect **more files** than 390 (the account template now has a compiled
   entry), the fingerprint to change, and **zero** zero-byte files in `vqcache`.
5. Open `https://hi5.bike/index.php?route=account/account` **logged in**. The block appears above the
   account info, showing the order history already on the page underneath.
6. Log out and open the account route: ocStore redirects to login, so the block is unreachable —
   and even if it were fetched directly, it stays hidden on 401.

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
