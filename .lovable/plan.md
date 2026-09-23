# ShelfSmart POS — build plan

An enterprise multi-tenant retail operating system: point of sale, inventory with batches and expiry, purchasing, online ordering, delivery, staff, finance, reporting, and a platform admin area for subscriptions.

This is far too large for one pass. I'll build it in phases, keeping the app fully usable after each one. Every phase connects screens to real server logic and a real database — no mock screens.

## Assumptions (tell me if any are wrong)
- Backend uses Lovable Cloud (database, logins, file storage, server code). I'll turn it on first.
- Payments, email/SMS/WhatsApp, routing, and accounting start as working mock adapters with a settings screen; real providers plug in once you supply credentials.
- Currency, tax rules, and receipt formats are configurable per company; no country-specific legal claims.
- "AI loss prevention" ships as explainable rule-based alerts; camera vision is an adapter stub only.
- Demo tenant is seeded with realistic data and demo logins for each role.

## Phase 1 — Foundation (this phase)
- Enable Cloud; set up logins, company/store/register tenancy, franchise groups, memberships, roles and permissions.
- Database isolation so no company can ever read another's data, enforced in the database itself.
- Design system: dense enterprise look, light/dark, collapsible sidebar, command palette, notification center, breadcrumbs, reusable data table with filters/sort/pagination/export.
- Public landing + pricing, self-service signup (plan → company → first store → admin), login.
- Super Admin area: companies, plans, subscriptions, feature flags, usage, billing, invite-company wizard with plan, expiry, grace period and alert settings.
- Company settings: branding, contacts, timezone, currency, tax defaults, business hours, receipt settings, numbering.
- Feature-flag engine (company → store → device inheritance + overrides) with server-side checks and plan entitlement checks.
- Audit log of sensitive actions.

## Phase 2 — Catalog & inventory
Products, variants, codes/barcodes, categories, brands, taxes, price lists and price history; warehouses with zone/aisle/rack/shelf/bin; batches with expiry and status; FEFO allocation engine; stock locations, movements, reservations, adjustments, cycle counts, transfers; find-item lookup; CSV import/export; low-stock and expiry alerts.

## Phase 3 — Point of sale
Cashier workspace (touch + keyboard), camera and wedge scanning, price-lookup mode, fractional and weighed items, unit conversion, variants/modifiers/bundles, central promotion rules engine, loyalty, gift cards, store credit, house accounts, split tender, held carts, voids/refunds/returns/exchanges, manager approvals and PINs, atomic idempotent checkout, receipts (print + digital share), cash shifts and drawer counts, self-checkout mode.

## Phase 4 — Purchasing & supply
Suppliers and portal, quotations with side-by-side rate comparison, purchase orders, receiving into batches, vendor returns, credits, statements, reorder suggestions, recalls and affected-batch tracing, waste/shrinkage logging with approvals.

## Phase 5 — Customers & commerce
CRM, segments, consents, customer portal, online storefront tied to store stock, cart/checkout, pickup and delivery, reservations that prevent overselling, order lifecycle and status, delivery zones/fees/driver assignment/route screen/proof of delivery, kitchen display.

## Phase 6 — Workforce, finance, marketing
Employees, scheduling, shift trades, attendance, register assignment, tips, variance and approvals, staff performance; expenses, tax reports, reconciliation, profitability; campaigns, coupons, brochures, consent-respecting sends.

## Phase 7 — Reporting & forecasting
Dashboard cards and charts, the full report catalogue, sales forecasts with confidence ranges and forecast-vs-actual, smart reorder and margin insights as optional modules.

## Phase 8 — Platform hardening
Billing adapter and invoices, subscription lifecycle and expiry alerts, webhooks with signing and retries, public API docs, hardware adapters, offline POS (installable app, local cache, queued sales, conflict handling), white-label branding.

## Phase 9 — Quality
Automated tests for isolation, permissions, FEFO, units, promotions, taxes, checkout atomicity, refunds, reservations, entitlements, expiry alerts, offline sync; end-to-end smoke flows; accessibility, performance, docs and environment sample file.

## Technical notes
- TanStack Start + React + Tailwind + shadcn; Postgres via Lovable Cloud with row-level security on every tenant table and explicit grants.
- All business logic in server functions; feature flags and entitlements re-checked server-side; client checks are UX only.
- Money/quantities stored as exact numeric; UUID keys; created/updated/by audit columns everywhere.
- Server-side pagination and indexes on company, store, product, barcode, order and date columns.

## What you get at the end of Phase 1
A working signup and login, a real company with stores and staff, the admin console for plans and subscriptions, feature toggles, and the app shell every later screen plugs into.
