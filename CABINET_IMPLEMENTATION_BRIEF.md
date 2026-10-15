# Hi5.bike / Andrey AI — User Cabinet: Implementation Brief

> **Provenance.** Pasted by the owner on 2026-10-15 as the authoritative implementation brief for the
> customer cabinet ("this is for the general knowledge base").
>
> **⚠ INCOMPLETE AS FILED:** the paste arrived with a gap — roughly 4,354 characters were missing
> between §3 (Bike Passport) and §8 (Data ownership), so most of §4–§7 (expected: repair jobs,
> parts/orders, entitlements, security/identity) is **not** in this file. Nothing has been invented to
> fill it. Ask the owner for the missing middle before treating this as the full brief.
>
> **Owner ruling recorded the same day (2026-10-15): "free repair. no tokens."** That resolves the
> spec's `A12` contradiction box in `CABINET_SPEC_V1.md` in favour of the free-repair reading: the
> entitlement is a **repair job, never money and never a token balance**.

## 1. Product objective

Build a personal cabinet connecting the Hi5.bike online bicycle-parts store with Andrey AI, the bicycle
diagnosis and repair assistant.

The cabinet must provide one coherent history of the user's bicycles, diagnostics, repair jobs,
recommended and purchased parts, orders, payments, returns and communication with the service.

**Critical architecture rule:** ocStore remains the source of truth for commerce. Andrey AI remains the
source of truth for AI diagnostics and repair management. The cabinet connects these systems; it must
not create duplicate orders or independently alter store transactions.

First inspect the existing repositories and components. Extend the existing application instead of
creating a parallel cabinet or replacing working functionality.

## 2. User interface and navigation

### A. Existing ocStore account page

Add a compact Andrey cabinet summary to `route=account/account`.

- Show the block only to authenticated users.
- Prefer an OCMOD modification rather than editing the theme directly.
- Render a lightweight placeholder and asynchronously fetch `/Andrey/api/cabinet/summary`.
- If the Andrey backend is unavailable, fail quietly without breaking the store account page.
- Show:
  - Available free repair entitlement, if any.
  - Last repair job: date, issue and status.
  - Last order: date, item and order status.
  - Button: **«Открыть кабинет AI-ремонт →»**.

The store account page is a summary, not a second full implementation of the cabinet.

### B. Full Andrey cabinet

Extend the existing `CabinetScreen.tsx`. Use its existing state and tab structure; do not introduce a
new router or state-management library just for this feature.

The main sections are:

1. **Мои велосипеды** — bicycles and their service-maintained passports.
2. **Мои ремонты** — diagnostics, repair jobs, recommendations and repair status.
3. **Запчасти и заказы** — viewed, recommended, selected, purchased, shipped, returned and installed parts.
4. **Платежи и документы** — actual amounts paid, refunds and relevant documents; no payment schedules.
5. **Сообщения** — communication with the service and repair-related AI chat.

Use straightforward navigation and clear statuses. Buttons should take the user to the relevant record
or action, rather than duplicating the same information across screens.

### C. Visual design

Use the established Andrey visual language:

- Primary blue: `#007AFF`.
- Navy: `#0B2545`.
- Red: `#E02020`, reserved for danger or destructive actions.
- White backgrounds, subtle grey surfaces and dividers.
- System sans-serif typography, rounded controls and restrained spacing.
- Responsive layout suitable for mobile and desktop.

Keep the interface minimal, legible and action-oriented.

## 3. Bike Passport

The Bike Passport is the central, persistent record for each bicycle.

The system maintains the passport. Users may view it but must not directly edit authoritative technical
specifications.

Display available information such as:

- Manufacturer, model, model year and trim.
- Identifying details and serial information where available.
- Frame and component specifications.
- Known drivetrain, brakes, wheels and other installed components.
- Diagnostics, previous repairs and component replacements.
- Human mechanic verification and unresolved compatibility concerns.

The passport must distinguish verified facts from inferred, uncertain or outdated information.

<!-- ⚠ GAP IN THE SOURCE PASTE: ~4,354 characters were missing here — expected to contain §4–§7
     (repair jobs, parts/orders, entitlements, security/identity). Deliberately not reproduced and
     not invented. -->

## 8. Data ownership and integration

Use explicit relationships between these entities:

- Customer.
- Bicycle / Bike Passport.
- Repair job or ticket.
- Media uploads and AI diagnostic results.
- Parts viewed, recommended, purchased, returned and installed.
- ocStore order, order items, payment and refund events.
- Entitlement grants and consumption.
- Human mechanic verification.
- Service visit and installation records.
- Messages and documents.

Do not store every free-text chat message as a permanent passport fact. Keep chat history associated
with the relevant repair job and promote information into the passport only through a defined process.

Use real order and repair identifiers to connect records. Avoid copying entire commerce records into a
second system when a stable reference is sufficient.

## 9. Implementation sequence

1. Inspect the existing repositories, `CabinetScreen.tsx`, account integration, authentication flow and
   backend routes.
2. Document the current architecture and identify existing functionality that must remain unchanged.
3. Implement the backend data model, authorization and read-only cabinet summary endpoint.
4. Add the logged-in-only ocStore account block using OCMOD.
5. Extend the existing full cabinet with bicycles, repairs, parts/orders, payments/documents and messages.
6. Integrate real ocStore data without duplicating orders or altering the checkout flow.
7. Implement auditable, idempotent repair entitlement grants and atomic consumption.
8. Add mechanic verification and shipment-blocking logic.
9. Test customer isolation, entitlement retries, concurrent consumption, refunds, missing backend
   responses and incomplete fitment evidence.
10. Deploy to isolated staging first. Verify existing store functionality before any production rollout.

## 10. Acceptance criteria

The work is complete when:

- The store account page continues to function if Andrey is unavailable.
- Only authenticated customers see their own cabinet data.
- Bike Passports are view-only and preserve verified versus uncertain information.
- Repairs, diagnostics, parts and orders are linked without confusing recommendations with purchases.
- Actual order and refund records come from ocStore.
- A qualifying event grants exactly one free repair entitlement, even if processed repeatedly.
- An entitlement cannot be consumed twice.
- Unresolved component compatibility blocks shipment.
- Physical service work can be associated with the relevant bicycle and repair record.
- The interface works on mobile and desktop.
- Existing login, checkout and order history remain functional.

**First deliverable:** inspect the existing code and return a concise implementation map: files to
extend, backend endpoints and tables required, data ownership boundaries, security concerns and a
phased change plan. Do not begin a broad rewrite before that review.

> **The owner's most important nuance:** the cabinet is not merely a dashboard. It is the user's
> persistent service history, and the Bike Passport is the bridge between AI diagnosis, real purchases
> and work performed by a human mechanic. Preserve that relationship while keeping ocStore as the
> authority for commerce.

---

## Appendix A — §§4–§7 as reconstructed by the owner (2026-10-15)

> **Provenance, stated plainly.** The original paste lost ~4,354 characters between §3 and §8. On
> 2026-10-15 the owner recovered the *section headings* from an earlier discussion and supplied the
> following **consolidated replacement**, explicitly not a verbatim recovery of the lost text. It is the
> working specification for implementation phases 3–6 (see `CABINET_DECISIONS_2026-10-15.md`).
> Anything in it that conflicts with `CABINET_SPEC_V1.md` or `CABINET_DECISIONS_2026-10-15.md` loses.

### §4. My Repairs — Repair Jobs and Diagnosis History

The cabinet must provide a persistent, chronological history of the user's repair jobs, linked to the
relevant bicycle. Each repair record should support:

- Bike ID and repair ticket ID.
- Date, reported symptoms, and repair status.
- Uploaded videos, audio, and photos.
- AI findings, evidence, diagnosis, possible causes, and recommended next steps.
- Repair instructions, conversation history, and parts recommended.
- Related store orders, mechanic notes, human verification, and final repair outcome where known.
- Physical workshop repairs and installed/replaced components when the service records them.

Distinguish AI diagnosis, human verification, and confirmed completed repair. An AI recommendation does
not prove a component was replaced or a repair was completed. Users may view their own records and
communicate about a repair. Authoritative Bike Passport specifications remain service-controlled.

### §5. Parts and Orders

Commerce remains owned by ocStore. Read actual orders, order items, payment status, refunds, and returns
from the store's real records. **Never create duplicate orders or manually insert `oc_order` records to
populate the cabinet.** The cabinet should distinguish these events: viewed · recommended by AI · offered
to the customer · purchased · returned or refunded · confirmed as installed. **A recommendation is not a
purchase; a purchase is not proof of installation.** Link parts to a bicycle and repair ticket where the
relationship is known. Preserve the source order and product identifiers.

Before dispatching a part requiring fitment verification, record the human mechanic's decision, reviewer,
date, evidence, unresolved concerns, and dispatch clearance. **Unresolved compatibility concerns must
block dispatch until resolved. AI advice alone is not human approval.**

### §6. Free Repair Entitlements, Payments and Documents

The current business rule: each qualifying purchase or eligible physical-store service visit grants
exactly **one free repair job**. The UI must not describe this as money, a ruble balance, or a monetary
credit. Use labels such as **«Доступен 1 бесплатный ремонт»**, **«Использован»**, **«Нет доступных
бесплатных ремонтов»**.

Implement entitlement grants and consumption as auditable backend events:

- Each qualifying source event grants no more than one entitlement.
- Duplicate event processing must not grant duplicates.
- Consuming an entitlement must be atomic and linked to a specific repair ticket.
- Concurrent requests must not consume the same entitlement twice.
- Reversals must be recorded explicitly; do not silently delete history.
- A reversed source event may revoke an unused entitlement according to the defined business rules.

Document the actual eligibility conditions and source events. **Do not invent a grant when a purchase or
physical service visit has not been confirmed.** Display real order/payment information, amounts paid,
refunds, returns, and available receipts or documents where those records exist. Keep commerce records in
ocStore and repair-entitlement records in Andrey. The repair-scoped AI conversation is not separately
charged.

### §7. Identity, Authorization and Data Security

The authenticated ocStore customer is the identity source for the personal cabinet.

- Reuse the authenticated store session when the backend can verify it safely.
- Otherwise use a signed, single-use handoff token with a maximum lifetime of 120 seconds.
- Remove any authorization path that trusts a browser-supplied `x-customer-id`.
- Enforce ownership and authorization on every server request, not just in the UI.
- Anonymous diagnosis may continue using the existing `andrey_s` session; login must not be required
  before the free diagnostic result.
- Require authenticated identity for personal cabinet access and account-linked persistent actions.
- Never expose another customer's bikes, videos, repair tickets, CRM jobs, addresses, orders, or messages.
- Do not join CRM records by an unverified phone number.
- Treat database failures as errors or unknown results, never as proof of payment or authorization.
- Keep staging and production data and credentials isolated.

The cabinet must fail safely and quietly if the Andrey backend is unavailable. Existing store login,
checkout, and order history must continue to work independently.


