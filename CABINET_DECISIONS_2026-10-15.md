# CABINET DECISIONS — owner rulings, 2026-10-15

> **Provenance.** Stated by the owner on 2026-10-15 in answer to the live evidence in
> `CABINET_PHASE22_2026-10-15.md` and to Argon's five open items in
> `CABINET_IMPLEMENTATION_MAP_2026-10-15.md`. The implementation must be reconciled against these, and
> where this file and an older draft disagree, **this file wins**.

**Guiding principle, in the owner's words:** keep the shop stable, protect customer data, and implement
the cabinet in stages rather than building every missing feature at once.

## 1. The five open items — final rulings

### (a) CRM join key — APPROVED (restriction kept)
Keep `jobs: []` until the customer's identity can be reliably verified against the phone number on the
CRM job. **Do not join by an unverified phone number alone.** When phone verification exists, use
normalized E.164 numbers and enforce customer-level authorization server-side. A shared family phone or
landline must not expose another person's repair records or address.

*Status here:* the cabinet already returns `jobs: []`; nothing joins CRM. **Compliant with no change.**
This is also why `last_job` is `null` — an honest empty rather than a guessed join.

### (b) Guest-order merge — KEPT as implemented
Match guest orders (`customer_id = 0`) on email or normalized digits-only telephone, **scoped to the
authenticated customer's own stored details**. Do not broaden the match to non-guest orders, and do not
accept arbitrary user-supplied contact details. **Owner asked for regression tests covering ambiguous
matches and customers who share a telephone number** — see `hi5-andrey-server/tests/test_guest_match_safety.py`.

### (c) Bike ownership — APPROVED to design; transfer DEFERRED
Design the passport around a **unique `bike_id` linked to a customer**, not merely manufacturer/model.
Allow multiple bikes of the same model, each with its own nickname and configuration. **Build the
ownership model and its access controls before populating any real passport data.** Ownership transfer is
a separate, audited workflow: a serial number or frame hash is a *claim identifier*, **not** sufficient
proof of ownership by itself — require a verification process, revoke the former owner's access to
private current records, and preserve historical service records **without exposing private notes or
personal data to the new owner**.

### (d) Repair ticket vs order — KEPT separate
`ai_repair_job` belongs to Andrey; `oc_order` belongs to ocStore. Link them by optional references and
explicit relationships; **never** convert a repair ticket into a commerce order. A repair may have no
purchase, one related order, or several related orders across its lifecycle.

*Status here:* already the architecture; `tickets: []` today and nothing converts a ticket. Compliant.

### (e) Anonymous diagnosis — KEPT as implemented
Anonymous users complete the diagnostic funnel on the existing `andrey_s` session. **No login or phone
verification before the free diagnostic result.** Require authenticated identity for the personal
cabinet, for saving a persistent repair ticket to an account, and for account-linked purchases. Session
tokens must stay high-entropy, expire as designed, and **must not be usable to read another customer's
cabinet**.

*Status here:* already the case — identity binds only at the cabinet read (A10).

## 2. Implementation order (owner's)

1. Install and verify the compact account-page block. ← **approved, see §4 below**
2. Keep CRM jobs unavailable until verified phone identity is supported.
3. Implement the persistent Bike Passport model, unique bike IDs, ownership controls and authorization tests.
4. Implement repair tickets and diagnosis history, keeping tickets independent of orders.
5. Add parts/order relationships and mechanic fitment verification.
6. Add the free-repair entitlement ledger, with idempotent grants and atomic consumption.
7. Add messages, documents and the remaining cabinet views.

> The owner's note: *"That gives you a working entry point without pretending that bikes, repair tickets,
> or CRM history already exist when their current payloads are empty."*

## 3. Reconstructed §§4–§7

The original paste lost ~4,354 characters between §3 and §8. The owner supplied a **consolidated
reconstruction** (explicitly not a verbatim recovery); it is filed as the brief's Appendix A and is the
working specification for phases 3–6. Its binding points:

- **§4 My Repairs** — a chronological, bike-linked repair history: media, AI findings vs human
  verification vs confirmed completion (an AI recommendation proves neither a replacement nor a
  completed repair); parts recommended; related orders; mechanic notes. Users read their own records;
  authoritative passport specs stay service-controlled.
- **§5 Parts and orders** — commerce stays in ocStore: read real orders/items/payments/refunds/returns,
  never insert `oc_order` rows. Distinguish viewed / recommended / offered / purchased / returned /
  confirmed-installed. **A recommendation is not a purchase; a purchase is not proof of installation.**
  Fitment-requiring parts need a recorded human mechanic decision (reviewer, date, evidence, unresolved
  concerns, clearance); unresolved compatibility blocks dispatch; AI advice is not human approval.
- **§6 Entitlements, payments, documents** — **one free repair job per qualifying purchase or eligible
  physical-store service visit.** Never describe it as money, a ruble balance or a credit. Prescribed
  labels: **«Доступен 1 бесплатный ремонт» · «Использован» · «Нет доступных бесплатных ремонтов».**
  Grants/consumption are auditable backend events: ≤1 grant per source event, duplicates impossible,
  **atomic consumption** linked to a repair ticket, no double consumption under concurrency, reversals
  recorded explicitly (never silently deleted), a reversed source may revoke an **unused** entitlement.
  Real amounts/refunds/documents display from store records; commerce data in ocStore, entitlement data
  in Andrey. The repair-scoped AI conversation is **not separately charged**.
- **§7 Identity and security** — the authenticated ocStore customer is the identity source. Reuse the
  store session when it can be verified safely, else a **signed single-use handoff token, ≤120 s**.
  **Remove any path that trusts a browser-supplied `x-customer-id`** (already deleted here — the A10
  bridge is the only source). Enforce authorization server-side on every request. Anonymous diagnosis
  stays open; cabinet access and account-linked persistence require identity. Never expose another
  customer's bikes, videos, tickets, CRM jobs, addresses, orders or messages. **Do not join CRM by an
  unverified phone number. Treat database failures as errors or unknown, never as proof of payment or
  authorization** (exactly the Phase 2.2 payment-check ruling). Keep staging and production data and
  credentials isolated. The cabinet fails safely and quietly; store login, checkout and order history
  keep working independently.

## 4. OCMOD maintenance window — APPROVED

The owner approved the controlled installation using the verified rollback and baseline. **The production
ocStore admin click must be made by the person operating the shop** — it cannot be done from this
conversation. Pre-refresh: confirm the archive + manifest are accessible, and preserve the recorded
pre-install fingerprint **`d8d4f00efb05ffca0af30bcc523910da`**. Post-refresh: verify the new
fingerprint and the block, then run the storefront / login / checkout / order-history / failure-mode
checks. On storefront or checkout regression, run the tested rollback immediately. **A successful refresh
is not proof the deployment is healthy.** Runbook: `ocmod/INSTALL.md`.

## 5. Label alignment required by §6

| where | now | per §6 |
|---|---|---|
| count = 1 | «Доступен 1 бесплатный ремонт» | ✔ already correct |
| count 2–4 | «Доступно N бесплатных ремонта» | ✔ correct |
| count ≥ 5 | «Доступно N бесплатных ремонтов» | ✔ correct |
| count = 0 | «Бесплатных ремонтов нет» | **«Нет доступных бесплатных ремонтов»** |
| spent entitlement | no surface yet | **«Использован»** — belongs to the entitlement ledger (order step 6); deliberately not invented on a screen that has no spent-state data |

