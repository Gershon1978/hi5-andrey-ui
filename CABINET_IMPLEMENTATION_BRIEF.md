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

