# REVIEW — «Ai Ремонт» product + «Услуги» category, live (2026-10-12)

Operational record for a live write on hi5.bike, as required by the items-live-batch playbook
(before→after, reasons, verification, rollback point). Owner sign-off: the owner selected
*"Insert it live now AND create a proper «Услуги» category, so A3 can hand the customer a storefront
checkout link."* No PII, no credentials in this file.

## Why

`CABINET_SPEC_V1.md` §18 item 3: the paid AI-repair handoff (§A3) creates an ocStore order for an
**`AI-ремонт` product — 150 ₽, non-shippable, `tax_class_id = 0`** — and ocStore owns that order.
The product did not exist, so the handoff had nothing to sell.

## Before → after

| | before | after |
|---|---|---|
| category «Услуги» | absent | **category_id 1119**, top-level, `status = 1`, `top = 0`, `noindex = 1`, layout 3, path `(1119,1119,0)` |
| product «Ai Ремонт» | absent (0 names start with `AI`) | **product_id 65882**, SKU `AI-REMONT`, model `AI-REMONT-150`, **150 ₽**, `shipping = 0`, `subtract = 0`, `tax_class_id = 0`, qty 1, weight 0, `status = 1`, image `catalog/products/ai-remont-150.png` |
| live catalogue size | 6313 | **6314** |
| MCP local catalogue | 6313 | 6314 (mirror kept identical) |

## How (scoped writes on explicit ids only)

Plan-by-default script `_svc_live.py`; 9 `INSERT`s via the bridge (`action=execute`):
`oc_category`, `oc_category_description`, `oc_category_to_store`, `oc_category_to_layout`,
`oc_category_path`, `oc_product`, `oc_product_description`, `oc_product_to_category`,
`oc_product_to_store`. All returned `affected_rows: 1`.

Deviations from the documented 4-table product recipe, each deliberate:

1. `shipping = 0` (recipe says 1) — §18 item 3 requires non-shippable.
2. `subtract = 0` (recipe says 1) — the fee must never decrement stock.
3. `status = 1` with an image — the A3 checkout link needs the product purchasable.

Cyrillic was written as `CONVERT(0x<utf8-hex> USING utf8mb4)` because the server/database default
charset is latin1 (playbook: "writing Cyrillic to live"). The image was uploaded with the MCP
`push_image` tool (SFTP); plain FTP returns 530 with the documented credentials, which are stale.

## Verification

* DB read-back: `HEX(name)` → `416920D0A0D0B5D0BCD0BED0BDD182` = «Ai Ремонт»; `D0A3D181D0BBD183D0B3D0B8` = «Услуги».
* `oc_product`: `shipping 0`, `subtract 0`, `tax_class_id 0`, `status 1`, `price 150.0000`. ✅
* Product page **HTTP 200**, category page (`&limit=500`, pagination-aware) **HTTP 200**, both carrying the name.
* Image `https://hi5.bike/image/catalog/products/ai-remont-150.png` → **HTTP 200, 13 919 B**.
* MCP `verify_scope(65882)` → **VERDICT: IDENTICAL** (0 field/image/category-link differences).
* MCP `maintenance_health_check` → **`ok: true`** (vqcache zero-byte 0, `category.php` md5 ok, maintenance 0, homepage 200); caches cleared afterwards.
* Known transient: the error log shows one `getimagesize(...ai-remont-150.png): No such file` at 16:14 — the seconds between the DB insert and the upload. Resolved; the file now serves 200.

## Rollback

```sql
DELETE FROM oc_category            WHERE category_id = 1119;
DELETE FROM oc_category_description WHERE category_id = 1119;
DELETE FROM oc_category_path       WHERE category_id = 1119;
DELETE FROM oc_category_to_store   WHERE category_id = 1119;
DELETE FROM oc_category_to_layout  WHERE category_id = 1119;
DELETE FROM oc_product             WHERE product_id = 65882;
DELETE FROM oc_product_description WHERE product_id = 65882;
DELETE FROM oc_product_to_category WHERE product_id = 65882;
DELETE FROM oc_product_to_store    WHERE product_id = 65882;
```
Then remove `image/catalog/products/ai-remont-150.png` and clear caches. The MCP also recorded
`tmp_ops_img` for the image step; MCP snapshots `snap_20261012_185834` / `…191521` / `…191522` exist.

## Open items

* The product image is a **generated placeholder** (plain navy tile) — replace with a real one.
* `top = 0`: «Услуги» is **not** in the storefront menu. Flip with one `UPDATE` if it should be.
* `noindex = 1` follows the convention of all 91 pre-existing categories.
## Part 2 — «Услуги» built from the CRM price list (2026-10-12)

**Why.** The locked rule says the 150 ₽ AI fee credits toward *parts or workshop work* — so the
workshop's work had to exist as purchasable items before that credit could ever be redeemed.
`CABINET_SPEC_V1.md` §A3 also needs a storefront checkout path.

**Source of truth.** `oc_crm_service` — the workshop's own price list: **23 active services**
(`code`, `name`, `grp`, `price_base`, `price_diff`, `sort`). Nothing was invented: names are copied
**server-side** (so Cyrillic never round-trips through a client charset), SKUs are the CRM codes,
and the price range `price_base – price_diff` goes into the description verbatim.

**Before → after**

| | before | after |
|---|---|---|
| «Услуги» (1119) products | 1 (the AI fee) | **24** — the AI fee + 23 services |
| live catalogue | 6314 | **6337** (local mirror identical) |
| new ids | — | **65883 … 65905** |
| every service | — | `shipping=0`, `subtract=0`, `tax_class_id=0`, qty 1, `status=1` |

**Groups covered:** Простая (7 × 300–500 ₽) · Обычная (8 × 600–1000 ₽) · Экспертная (6 × 1000–2000 ₽) ·
Сборка (детский 1500 ₽ / взрослый 2500 ₽).

**Verified**
* `_svc_build.py` self-check → `category 1119 now holds 24 product(s)`, `flag anomalies: none`, and all
  24 names decode as correct UTF-8 (read back with `HEX()`).
* MCP `verify_scope(category="Услуги")` → **VERDICT: IDENTICAL** (24 live / 24 local, 0 mismatches).
* Rendered category page: title «Услуги», **24 cards**, 23 placeholder images **0 broken / 23 loaded**.
* Image `uslugi-placeholder.png` → HTTP 200 (16 272 B); descriptions normalised to whole rubles
  (`UPDATE ... affected_rows: 23`); caches cleared; `maintenance_health_check` → `ok: true`.

**Rollback**
```sql
DELETE FROM oc_product             WHERE product_id BETWEEN 65883 AND 65905;
DELETE FROM oc_product_description WHERE product_id BETWEEN 65883 AND 65905;
DELETE FROM oc_product_to_category WHERE product_id BETWEEN 65883 AND 65905;
DELETE FROM oc_product_to_store    WHERE product_id BETWEEN 65883 AND 65905;
```
Then remove `image/catalog/products/uslugi-placeholder.png` and clear caches.

**Open items for this category**
* **Images are one shared placeholder** — 23 services point at `uslugi-placeholder.png`. Replace per
  service with real workshop photos (the playbook's rule 1: never overwrite a live file; upload a new name).
* **Two price authorities now exist** — the CRM holds the authoritative service prices and ocStore
  mirrors them. A CRM price change does **not** propagate; a small sync (CRM → ocStore) is needed, or the
  drift will be silent. This is the one architectural debt this build introduces.
* **Groups** — the CRM's `grp` (Простая / Обычная / Экспертная / Сборка) is only in the description;
  sub-categories would need 4 more categories (7 statements each) and are not created.
* **Menu** — «Услуги» is still `top=0` (not in the storefront menu). One `UPDATE` flips it.

