IMPLEMENTATION MAP AND ARCHITECTURE REVIEW: AI REPAIR CUSTOMER CABINET
1. IMPLEMENTATION MAP
Target Path	Side	Action	Purpose & Scope of Changes
mechanic/ocstore.py	Server	Extend	Fix status mapping to spec §7.3 IDs; resolve customer email/phone from oc_customer to enable guest order merge; add grant query (paid orders ≥ 1000 ₽ without AI_PRODUCT_ID); add /api/cabinet/summary data generator.
mechanic/cabinet.py	Server	Extend	Add compact summary route handler GET /api/cabinet/summary; implement CAS consumption logic for entitlements; ensure strict identity checks; omit cost field globally.
main.py / routes.py	Server	Extend	Register /api/cabinet/summary, /api/cabinet/job/{id}, /api/cabinet/part/{id}, and /api/cabinet/ask in the server route registry and nginx relay allowlist.
system/andrey_cabinet_summary.ocmod.xml	Server / ocStore	New	OCMOD patch for OpenCart catalog/view/theme/*/template/account/account.twig (or .tpl). Injects summary placeholder and safe async JS fetching /Andrey/api/cabinet/summary. Fails silently on 401/500.
src/screens/CabinetScreen.tsx	UI	Extend	Replace monolithic mock view with a state-driven tab shell (5 sections), 3-card dashboard, unified history table with 4 filters, Repair Ticket modal/drill-down (blocks A–F), and sticky chat drawer.
src/types/cabinet.ts	UI	Extend	Synchronize shared types (HistoryRow, BikePassport, RepairTicket, TicketPart, CabinetStatus) with backend payload schema; eliminate all token/credit fields.
src/mock/cabinet.ts	UI	Extend	Provide deterministic Russian mock fixtures: 1 logged-in user, 1 passport, 1 paid ticket with multi-cause selector, 3 fitment states, 1 return row, no token vocabulary.
src/api.ts	UI	Extend	Add cabinetSummary(), cabinetTicket(jobId), cabinetAsk(q, jobId) behind existing isMock toggle; point live paths to relay endpoints.
src/styles.css	UI	Extend	Add design token classes for :root (radii card 32, bubble 28, pill 999; colors --brand: #007aff, --ink: #0b2545, --danger: #e02020, --wash: #ebf3ff). No hardcoded colors.
2. DATA MODEL
Entity / Table	DB Engine	Status	Primary Key / Index	ocStore Join Key	Role & Architectural Purpose
oc_customer	MySQL (u0932575_default)	Existing	customer_id (PK)	customer_id	Authoritative source of user identity, email, telephone, and registered profile.
oc_order / oc_order_product	MySQL (u0932575_default)	Existing	order_id (PK)	customer_id, email, telephone	Authoritative commercial record. Line items used to verify parts purchases and compute eligibility.
oc_session	MySQL (u0932575_default)	Existing	session_id (PK)	data->customer_id	Authoritative session truth. Identity bridge source for OCSESSID.
ai_repair_credit	SQLite (funnel_state.db)	Existing	credit_id (PK)	customer_id	Entitlement Ledger. Stores free repair entitlement grants and state (open / spent / revoked). Internal table name retained; UI displays only as "Бесплатный ремонт".
ai_repair_bike	SQLite (funnel_state.db)	New	bike_id (PK), idx customer_id	customer_id	Bike Passport Instance. Connects customer's specific bicycle to normalized model blueprint key and contains confirmed configuration attributes.
ai_repair_job	SQLite (funnel_state.db)	New	job_id (PK), idx customer_id	customer_id (optional order_id)	Repair Ticket. Holds diagnostic verdict, customer-selected issue, repair plan steps, and links to session media.
ai_repair_event	SQLite (funnel_state.db)	New	event_id (PK), idx job_id	N/A (joins to job_id)	Append-only Job Timeline. Records creation, re-diagnoses («Сделать это»), deposits, parts checks, and completions.
part_order	SQLite (funnel_state.db)	Existing	id (PK), idx sid	sku, product_id	Physical Verification & Deposit Machine. Reused as-is for tracking physical parts inspection (fit, mismatch, insufficient_evidence).
media	SQLite (funnel_state.db)	Existing	id (PK), idx sid	N/A (joins to session_id)	Media Retention. Holds submitted video/photo evidence. Never purged.
Tables Explicitly Omitted:

Do NOT create ai_repair_part: Use existing basket (for intent) and oc_order_product (for purchase truth) linked via product_id.

Do NOT create ai_repair_verification: Reused existing part_order verification fields (verified_at, verified_by, status, note).

Do NOT create a Workshop Service Visit table in SQLite: oc_crm_job remains in MySQL; visits are projected as read-only events when phone joins match securely.

3. OWNERSHIP AND BOUNDARIES
Entity	System of Record	Read Path	Mutation / Write Path	Duplicate Prevention & Integrity Rule
Identity & Authentication	ocStore MySQL	Andrey resolves OCSESSID via oc_session	Native ocStore login / auth forms	Cabinet is strictly read-only on auth. Zero auth endpoints inside the cabinet UI.
Commerce & Orders	ocStore MySQL	Andrey queries oc_order, oc_order_product	ocStore checkout via get_or_create_pay_url()	Andrey never inserts into oc_order. Linking is achieved via oc_order.comment = "andrey_session:<sid>".
Money, Receipts, VAT	ocStore / YooMoney	ocStore order statuses and totals	Native YooMoney callback module	Zero financial authoring, zero invoicing, zero VAT arithmetic in cabinet.
Free Repair Entitlements	Andrey AI SQLite (ai_repair_credit)	credits_open(customer_id)	Backend cron / webhook on paid orders	Schema enforcement: UNIQUE(customer_id, source_type, source_id). Prevents replay and duplicate grants.
Bike Passport	Andrey AI SQLite (ai_repair_bike)	GET /api/cabinet	Service / Mechanic validation pipeline	Customer has read-only view. Diagnostic findings never promote automatically to confirmed specs.
Diagnostics & Repair Jobs	Andrey AI SQLite (ai_repair_job)	GET /api/cabinet/job/{id}	Andrey diagnostic loop	Scoped strictly to session. Re-selecting cause appends to ai_repair_event without altering historical rows.
Guest → Account Merge	ocStore / Andrey seam	get_cabinet_data()	Profile resolution in ocstore.py	Queries oc_order where customer_id = 0 AND (email = %s OR telephone = %s). Never links orders across mismatched customer IDs.
4. SECURITY AND FAILURE MODES

Customer Isolation Guarantees:
Every query must execute with customer_id resolved from the active oc_session.data JSON payload. Header-based overrides (x-customer-id) are permanently expunged. Under no circumstances may SQL queries execute using client-supplied IDs. Internal margins (cost) are excluded from all query projections.

Relay Token Protection:
The brain enforces X-Andrey-Token on every /api/* call. Direct client access to the backend returns 401 Unauthorized. The Nginx relay injects this secret token server-side; it is never transmitted to the browser.

Surface A Degradation (ocStore Account Page):
The OCMOD script must execute asynchronously via fetch() with a 2.5-second timeout. If the Andrey backend responds with 401, 500, or a network timeout, the DOM container collapses silently (display: none). Store checkout and account management remain 100% operational.

Surface B Degradation (Cabinet Workspace):
Session expiry triggers an inline, tranquil prompt with a deep link to /index.php?route=account/login. If the diagnostic service is offline, existing cached orders and passports display normally with a retry button on interactive elements.

Entitlement Idempotency & Concurrency:

Grant: Unique composite index (customer_id, source_type, source_id) in ai_repair_credit. Reprocessing an identical order status update executes as a no-op.

Consume: Atomic Compare-And-Set (UPDATE ai_repair_credit SET state='spent', spent_session=%s, spent_at=%s WHERE credit_id = (SELECT credit_id FROM ai_repair_credit WHERE customer_id=%s AND state='open' LIMIT 1)). Guarded against UI double-clicks via the existing per-session ar/commit lease.

Fitment Gate & Physical Verification:
SKU and price remain null unless algorithmic match confidence is ≥ 80%. If incomplete, UI requests evidence (video → photo 1 → photo 2). Physical parts verification requires an authenticated human mechanic sign-off recorded in part_order. No timeout or AI heuristic may release an order from awaiting_verification.

5. PHASED PLAN
Phase 1: Defect Remediation & Identity Resolution

Outcome: Fix status mapping and attach guest orders in live backend.

Files Involved: mechanic/ocstore.py.

Acceptance Check: get_cabinet_data() returns status "Доставлено" (not "paid") for order_status_id = 3, and surfaces guest orders (customer_id = 0) matching the user's registered email/phone.

Phase 2: Surface A — ocStore Account Integration

Outcome: Deploy compact summary endpoint and OCMOD widget to store.

Files Involved: mechanic/cabinet.py, mechanic/ocstore.py, system/andrey_cabinet_summary.ocmod.xml.

Acceptance Check: Loading route=account/account as an authenticated user renders the Andrey block showing available free repairs, last job, and last order. Disabling the Andrey service hides the block without breaking the account page.

Phase 3: Core UI Tab Shell & Dashboard (Round 9 Delivery)

Outcome: Fully functional tabbed cabinet shell with mock/live parity.

Files Involved: src/screens/CabinetScreen.tsx, src/types/cabinet.ts, src/mock/cabinet.ts, src/styles.css.

Acceptance Check: Navigation across 5 tabs executes via useState without a router; summary cards reflect free repair pluralization («1 бесплатный ремонт», «3 бесплатных ремонта»); no money/token vocabulary exists in compiled bundle (npm run build).

Phase 4: History Table & Repair Ticket Deep View

Outcome: Unified 5-column history table with active filters and job drill-down blocks A–F.

Files Involved: src/screens/CabinetScreen.tsx, src/api.ts.

Acceptance Check: Filtering by "Покупки" highlights rows in --wash tint; clicking a "Ремонт" row opens Repair Ticket with all detected problems, step-by-step graphical plan, and mechanic verification badge.

Phase 5: Entitlement Engine (Idempotent Grant & Atomic Consume)

Outcome: Automated free repair granting on qualifying orders and atomic use during repair start.

Files Involved: mechanic/ocstore.py, mechanic/cabinet.py.

Acceptance Check: An order ≥ 1000 ₽ without AI_PRODUCT_ID creates exactly one ai_repair_credit row on status 17; repeated status hooks create zero duplicate rows; starting a repair spends exactly one row via CAS.

Phase 6: Bike Passport Persistence & Physical Verification Seam

Outcome: Persistent instance passports and workshop physical inspection gates.

Files Involved: mechanic/catalog.py, mechanic/ocstore.py, src/screens/CabinetScreen.tsx.

Acceptance Check: Confirmed bike specs load from ai_repair_bike; unresolved physical verification blocks dispatch and displays natural Russian status «Нужны дополнительные доказательства».

OPEN DECISIONS — MY RECOMMENDATION
(a) CRM Join Key (oc_crm_job only has client_phone)

Recommendation: Query by normalized E.164 client_phone ONLY IF the user has verified their phone number via SMS/auth in ocStore; otherwise, keep CRM jobs empty in the cabinet.

Reasoning: Joining unverified phone numbers risks leaking workshop job cards and physical addresses across customers sharing landlines or family mobile numbers.

Cost of getting it wrong: Severe PII and repair history disclosure between unrelated customers.

(b) Guest-Order Merge Path

Recommendation: Implement automated merge on read using exact match on (email = customer.email OR telephone = customer.telephone) AND customer_id = 0.

Reasoning: 89% of orders (187 of 209) are guest checkouts; without this read-level resolution, nearly all newly registered users see an empty cabinet.

Cost of getting it wrong: Complete product failure for 89% of historical store customers who register post-purchase.

(c) Bike Ownership Semantics

Recommendation: Allow multiple identical models per customer distinguished by nickname and bike_id; permit ownership transfer only via explicit serial number / frame hash claim by a new authenticated owner, which archives the previous owner's passport as historical.

Reasoning: Cyclists frequently own identical frames with different setups (e.g., training vs. race wheelsets) and buy/sell pre-owned bikes.

Cost of getting it wrong: Inability for households to manage similar bikes, or leaking private historical service notes to a secondary buyer.

(d) Ticket ↔ Order Boundary

Recommendation: Keep ai_repair_job as an independent entity in Andrey AI that references order_id as an optional attribute; do NOT convert the repair ticket into an oc_order.

Reasoning: Brief §1 and Spec §0 mandate that ocStore owns commerce while Andrey owns repair lifecycles; a diagnostic ticket involves media, re-selection, and multi-step mechanic validation that OpenCart schemas cannot model cleanly.

Cost of getting it wrong: Corrupted ecommerce checkout flows and inventory desynchronization in ocStore.

(e) Identity Key for Anonymous Diagnosis

Recommendation: Use a high-entropy device session token (andrey_s SQLite cookie) during anonymous diagnosis, and prompt for phone/login only upon checkout or ticket save.

Reasoning: Spec §4 and Appendix A establish andrey_s (TTL 1800s) as the active funnel session; requiring a phone number upfront introduces drop-off before diagnostic value is shown.

Cost of getting it wrong: Excessive user drop-off at the top of the funnel if forced to identify prior to initial diagnosis.

Conflict Resolution: Brief vs. Spec V1

Conflict: Brief §2.A defines Surface A summary endpoint as /Andrey/api/cabinet/summary, whereas Spec V1 §12.1 specifies GET /api/cabinet/summary.

Resolution: Implement backend route as GET /api/cabinet/summary and configure the Nginx relay to rewrite /Andrey/api/cabinet/summary to /api/cabinet/summary. Both surfaces resolve transparently without violating path standards.