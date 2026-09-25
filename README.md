# ShelfSmart POS Core

Build a production-grade multi-tenant B2B SaaS called “ShelfSmart POS”, an enterprise retail POS + inventory + ERP + ecommerce operating system for grocery stores, foodstuff shops, pharmacies, general retailers, and franchises.

IMPORTANT: Do not build a static mockup or disconnected demo. Build a real full-stack application with working authentication, PostgreSQL database, tenant isolation, RBAC, CRUD, server-side business logic, audit trails, responsive UI, seeded demo data, and end-to-end workflows. Use Lovable’s native full-stack stack (TypeScript/React/Tailwind/shadcn + Supabase/Postgres where appropriate). If an external integration needs credentials, implement a clean provider/adapter interface, configuration screen, and development mock adapter rather than fake a successful integration.

PRODUCT / TENANCY
- Platform-level Super Admin manages all subscriber companies, plans, billing, feature entitlements, limits, expiry, and platform settings.
- Each company is a fully isolated tenant. A company can have multiple stores/branches, registers/devices, warehouses, departments and franchise locations.
- Support franchise hierarchy: parent company → franchise/group → store.
- Users have memberships and roles scoped to platform/company/store/department.
- No cross-tenant data leakage. Enforce authorization server-side and with database RLS/policies.
- Company settings: name, logo, contact details, timezone, currency, tax configuration, business hours, receipt settings, numbering sequences, branding.
- Responsive desktop/tablet/mobile UI; POS must be optimized for touch and keyboard.

ROLES / RBAC
Implement granular permissions and role-based access for:
Super Admin, Company Owner/Admin, Store Manager, Cashier, Purchasing Staff, Fulfillment/Warehouse Staff, Delivery Driver, Kitchen Staff, Marketing Staff, Accountant/Finance, Customer, Supplier Portal User.
Allow custom roles and permission overrides.
Sensitive actions require manager approval/PIN where configured: price overrides, voids, refunds, discounts beyond threshold, restricted-item overrides, cash variance, inventory adjustments, subscription/settings changes.

SAAS SUBSCRIPTIONS
- Public landing/pricing page.
- Self-service signup: choose plan → create company → first store → invite company admin → configure subscription.
- Super Admin “Invite Company” wizard: company info, first store, admin invite, plan, billing model, expiry date, grace period, alert settings.
- Configurable plans such as Starter / Professional / Enterprise, but do not hard-code the tiers.
- Support platform fee plus per-user pricing and/or per-register pricing, with each charge type independently configurable.
- Support optional paid modules/add-ons.
- Plan limits and entitlements: stores, users, registers, products, locations, online ordering, delivery, marketing, AI modules, white-label, etc.
- Subscription lifecycle: trial, active, past_due, expiring, expired, grace_period, suspended, cancelled.
- Expiry date must be visible to company admins.
- Expiry alerts: fixed template toggle and custom-message toggle. Provide default templates for expiring and expired subscriptions; allow configurable lead days, channels and grace period.
- Stripe or equivalent billing adapter; use mock billing adapter when credentials are unavailable. Never store raw card data.
- Subscription invoices, payment status, webhook/event handling and audit log.
- Super Admin dashboard for MRR/active tenants/subscriptions/expiry/usage/feature entitlements.

FEATURE TOGGLE SYSTEM
Build a robust feature-flag system with company, store and device/register scope, inheritance and explicit overrides.
Examples:
Self-checkout, AI loss prevention, online storefront, delivery routing, customer portal, supplier portal, loyalty, gift cards, house accounts, marketing, KDS, offline POS, accounting sync, third-party delivery, white-label, advanced forecasting, smart reorder, barcode label printing, shift scheduling, time attendance.
Core authentication, authorization, tenant isolation, basic POS, products and inventory cannot be disabled.
A disabled feature must be hidden from navigation AND blocked server-side. Plan entitlement must also be checked.

CORE POS
Create a fast cashier workspace with:
- Product search, category grid, favorites/quick keys.
- Barcode/QR/code scanning with device camera; fallback to manual entry.
- Support UPC/EAN/GTIN and arbitrary configurable code types.
- USB/Bluetooth keyboard-wedge scanners where browser/device permits.
- Scan product into cart.
- Scan barcode while creating/editing a product.
- Price lookup mode that can inspect price/stock/location without disturbing the active transaction.
- Cart, fractional quantities, weighed products, configurable UOM.
- Unit conversion: g/kg, ml/l, each/pack/case and custom units. Example: sell 1 kg from a 50 kg bulk batch and correctly deduct inventory.
- FEFO batch deduction: nearest non-expired expiry first; fallback FIFO where no expiry exists. Warn for near-expiry and expired stock; allow sale only according to configurable warning/manager-approval policy.
- Product variants, modifiers, bundles.
- Discounts, price overrides, promotions, coupon/promo codes.
- BOGO, bundle offers, free-item offers, quantity-tier pricing, percentage/fixed discounts, date-range promotions, category/product/customer/store targeting, stacking rules, priority and usage limits.
- Loyalty points, gift cards, store credit.
- House accounts/tabs and customer-specific credit terms.
- Payment methods: cash, card, mobile payment, bank transfer, gift card, store credit, house account, payment link and split tender.
- Customer invoices, payment links and receipts.
- Receipt printing and digital receipt sharing via email/SMS/WhatsApp provider adapters where configured.
- Hold/pause/resume carts.
- Void, refund, return and exchange workflows.
- Manager approvals for configured sensitive operations.
- End-of-transaction atomicity: sale, payments, stock deductions, batch allocations, loyalty, gift-card/store-credit movements must remain consistent.
- Idempotent checkout to prevent duplicate sales.

SELF-CHECKOUT
Optional per company/store/device.
Provide customer-facing checkout mode, scan/add/remove, payment, receipt, restricted-item verification and staff assistance workflow.
Do not claim camera-based loss prevention is implemented unless an actual vision integration exists.

AI LOSS PREVENTION
Optional module. Start with explainable rule/anomaly detection using transaction data: excessive voids, unusual refunds, price overrides, suspicious discount patterns, basket anomalies, weight/quantity mismatches, repeated failed scans, etc.
Architect an adapter for future computer-vision/camera integrations. Clearly label scores as alerts/indicators, not proof of theft.

INVENTORY / PRODUCT MASTER
- Products, SKUs, barcodes, QR codes, variants, categories, brands, tags, descriptions, images.
- Cost, selling price, margin, tax category, supplier, preferred supplier, reorder point, safety stock, lead time.
- Multiple batches/lots per product, each with batch/lot number, expiry date, received date, supplier, cost, quantity received, available quantity, warehouse/location and status.
- Quarantine/recall status.
- Multiple shelf locations per SKU.
- Warehouse → zone → aisle → rack → shelf → bin hierarchy.
- “Find item” view showing exact store/warehouse/shelf/bin locations.
- Bulk stock and bulk conversion.
- Stock reservations for online orders.
- Stock adjustments, cycle counts, transfers, stocktakes and approvals.
- Low stock, out-of-stock, overstock, expiring soon, expired and recall alerts.
- Inventory valuation, aging and movement history.
- Import/export and bulk product editing.

WASTE / SHRINKAGE
Log spoilage, damage, theft, breakage, expiry and other reason codes.
Capture product, batch, quantity, cost/value, location, employee, reason, notes and attachments.
Approval workflow where configured.
Audit every adjustment.
Reports by store/product/category/reason/employee/time.

PURCHASING / SUPPLIERS
- Supplier master with contacts, payment terms, lead times, tax details and communication history.
- Supplier portal with controlled access.
- Purchase orders, approval, receiving, partial receiving and batch creation.
- Supplier quotations.
- Compare multiple supplier rates side-by-side.
- Preferred supplier and supplier score/history.
- Reorder suggestions based on stock, sales velocity, lead time and safety stock.
- Vendor returns for damaged/expired/recall goods, return status and supplier credit memo.
- Supplier statements and credits.
- Communication history.
- Recall management and affected-batch tracking.

WAREHOUSES / TRANSFERS
- Multiple warehouses/locations.
- Inter-store and warehouse transfers.
- Transfer request → approval → picking → shipping → receiving.
- In-transit inventory.
- Cycle counts.
- Location mapping and stock lookup.
- Full audit trail.

PROMOTIONS / PRICING
Create a rules engine supporting:
percentage discount, fixed discount, BOGO, bundle, free item, quantity tiers, mix-and-match, date/time range, category/product/store/customer-segment targeting, promo codes/coupons, minimum spend, maximum discount, usage limits, customer limits, stacking/exclusion rules and priority.
Price history must record every price change with who/when/why, old/new value and source.

CUSTOMERS / CRM
- Customer profiles, contacts, addresses, purchase history, favorite items, loyalty, gift cards, store credit, house account, credit limit, payment terms, invoices and balances.
- Consent/preferences for marketing.
- Customer history page.
- Customer portal with profile, order history, loyalty balance, active order/delivery status and payment links.
- Customer segmentation for marketing.

LOYALTY / GIFT CARDS / CREDIT
- Configurable loyalty earn/redeem rules, tiers, expiry, bonuses and manual adjustments with audit.
- Gift card issue, activate, reload, redeem, block, balance and expiry.
- Store credit issuance/refunds and balance history.
- House accounts with credit limit, invoices, partial payments, due dates, statements, aging and overdue alerts.
- Configurable weekly/monthly/pay-later customer payment terms.

ONLINE STOREFRONT / ORDERS
- Customer-facing storefront tied to store inventory.
- Product catalog, search, categories, pricing, promotions and promo codes.
- Cart and checkout.
- Pickup/BOPIS and delivery.
- Order lifecycle: pending → confirmed → preparing → ready → picked up/out for delivery → delivered/cancelled/refunded.
- Real-time order status.
- Inventory reservation/allocation.
- Customer notifications through provider adapters.
- Payment link support.
- Customer portal.
- Digital promotional brochures/content sharing.

DELIVERY
- In-house delivery management with driver assignment.
- Route planning interface and provider adapter for turn-by-turn routing.
- Delivery zones, fees and time windows.
- Driver mobile-friendly view.
- Proof of delivery, notes, status and timestamps.
- Third-party delivery provider adapter and synchronization.
- Delivery analytics.

KITCHEN DISPLAY / FULFILLMENT
Optional KDS for prepared-food operations.
- Real-time incoming orders.
- Station routing.
- Priority/status timers.
- Preparing/ready/completed workflow.
- Item modifiers and notes.
- Screen-specific queues.

STAFF / SHIFTS / ATTENDANCE
- Employee profiles and role assignments.
- Scheduling.
- Shift creation, assignment and shift trading/request workflow.
- Clock in/out and breaks.
- Register assignment.
- Opening float.
- Cash drops.
- Blind cash counts.
- Closing drawer count.
- Tips.
- Variance calculation.
- Manager approval/dispute workflow.
- Shift summary and end-of-day close.
- Staff performance: sales, transactions, average ticket, items/transaction, speed, void/refund/error/override rates.

RESTRICTED ITEMS
Create configurable restrictions per product/category/store/jurisdiction:
- age verification
- quantity limits
- time restrictions
- ID verification
- prescription/license/document requirement
- manager approval
Do not claim legal compliance for pharmacy/alcohol/tobacco/etc. Instead provide configurable rules and clearly mark jurisdiction-specific configuration.

FINANCE / EXPENSES / TAX
- Sales summaries, gross/net sales, discounts, taxes, COGS, gross profit, net profit.
- Payment reconciliation.
- Expenses: utilities, rent, maintenance, overhead and custom categories.
- Tax configuration by product/category/store/region, inclusive/exclusive pricing.
- Tax reports.
- Expense reports and profitability.
- Accounting integration adapter.
- Multi-currency-ready data model.

REPORTING / ANALYTICS
Dashboard cards/charts for:
today sales, transaction count, average ticket, gross profit, low stock, expiring batches, outstanding customer balances, open orders, 7-day sales trend, top products by revenue.
Reports:
financial, sales, product, category, inventory valuation, inventory aging, stock movement, waste/shrinkage, purchasing, suppliers, customer/loyalty, promotions, tax, expenses, staff performance, shift/cash, delivery, online orders, price history, audit.
Forecasting:
- product-level and revenue-level sales forecasts
- configurable history window
- trend/seasonality support
- confidence ranges
- forecast vs actual tracking
- clearly label forecasts as estimates
- optional AI explanation/insight layer, never a hard dependency for core reporting.
Add smart reorder suggestions and margin insights as optional modules.

MARKETING
- Customer segments.
- Email/SMS campaigns using provider adapters.
- Coupons.
- Scheduled campaigns.
- Campaign performance: sent, delivered, opens, clicks, redemptions where provider supports it.
- Promotional brochures/digital flyers.
- Store/product/customer targeting.
- Consent enforcement and unsubscribe handling.

ADMIN / DEVICES / HARDWARE
- Device/register management.
- Name devices, assign store/register, status, last seen, active user.
- Feature toggles per device.
- Scanner/printer/cash-drawer/payment-terminal adapter architecture.
- Receipt printer support through configurable adapter.
- Barcode label printing module.
- Hardware is optional; core app must remain usable without hardware.

OFFLINE POS
Implement as an optional feature toggle but architect POS for resilient offline operation:
- PWA/service worker.
- IndexedDB/local cache for catalog/pricing/necessary customer data.
- Queue offline sales and sync when connection returns.
- Idempotency keys.
- Conflict handling.
- Clear online/offline/sync status.
- Never silently lose transactions.
- Restrict operations that genuinely require server connectivity.

SECURITY / COMPLIANCE
- Supabase Auth or equivalent secure authentication.
- MFA-ready architecture.
- RBAC and least privilege.
- Tenant isolation and RLS.
- Server-side authorization; never trust client-side role checks.
- Audit sensitive actions.
- Secure secrets/environment variables.
- Never store raw card numbers/CVV; use payment provider tokenization/hosted fields.
- Rate limiting and validation for sensitive endpoints.
- Consent and privacy controls.
- Configurable data retention/export/deletion workflows.
- Pharmacy/restricted-item workflows are configurable and not a legal-compliance certification.

DATA MODEL
Design a normalized relational schema with UUID primary keys and consistent audit fields. Core entities should include at minimum:
users, memberships, roles, permissions, companies, franchise_groups, stores, departments, registers, devices, subscriptions, plans, plan_features, usage_meters, feature_flags, customers, customer_addresses, customer_consents, loyalty_accounts, loyalty_transactions, gift_cards, gift_card_transactions, store_credits, house_accounts, account_invoices, account_payments, products, product_variants, product_codes, categories, brands, taxes, price_lists, price_history, promotions, promotion_rules, promotion_redemptions, warehouses, warehouse_zones, warehouse_locations, inventory, inventory_batches, inventory_movements, stock_reservations, stock_counts, stock_count_items, transfers, transfer_items, purchase_orders, purchase_order_items, suppliers, supplier_quotes, supplier_quote_items, supplier_returns, supplier_credits, sales, sale_items, sale_payments, sale_batches, refunds, refund_items, held_carts, online_orders, order_items, delivery_orders, delivery_routes, drivers, proof_of_delivery, kitchen_orders, kitchen_items, employees, shifts, attendance, cash_movements, expenses, marketing_campaigns, campaign_recipients, notifications, audit_logs, webhook_events, integration_configs.
Every tenant-owned record must have tenant/company scope; store/location scope where relevant; created_at, updated_at and created_by/updated_by where appropriate. Use soft deletion only where appropriate.

CRITICAL BUSINESS RULES
1. FEFO allocation must be deterministic, transactional and auditable.
2. Fractional UOM conversion must preserve precision and correctly decrement source stock.
3. Promotion calculations must be centralized in one server-side rules engine so POS and ecommerce produce identical totals.
4. Taxes must be centralized and auditable.
5. Checkout must atomically create the sale, payment records, inventory movements and batch allocations.
6. Refund/return must reverse or adjust the correct inventory and financial records.
7. Online order stock reservations must prevent overselling.
8. Sensitive mutations must generate audit entries.
9. All webhook processing must be idempotent.
10. Subscription entitlements must be checked server-side.
11. Feature flags must not bypass authorization or plan limits.
12. Use transactions/locks where inventory or cash consistency requires them.

UX / UI
Create a polished modern enterprise UI, not a generic template.
- Clean navigation with collapsible sidebar.
- Global search / command palette.
- Notification center.
- Breadcrumbs.
- Consistent tables with filters, sorting, column controls, pagination and export.
- Drawers/modals for fast CRUD.
- Empty/loading/error states.
- Toasts and confirmation dialogs.
- Large POS touch targets.
- Keyboard shortcuts for common cashier actions.
- Responsive layouts.
- Light/dark theme support.
- WCAG 2.2 AA-oriented accessibility.
- Localization-ready for currency, timezone, date/number formats and translations.
- Avoid excessive gradients/marketing styling inside the business app.

PRIMARY ROUTES / SCREENS
Create working routes for:
/
/dashboard
/pos
/price-lookup
/orders
/online-orders
/storefront
/products
/inventory
/inventory/batches
/warehouses
/stock-locations
/cycle-counts
/store-transfers
/waste-log
/vendor-returns
/purchase-orders
/suppliers
/supplier-portal
/promotions
/customers
/customer-history
/customer-portal
/loyalty
/gift-cards
/house-accounts
/delivery-routes
/kitchen-display
/staff
/scheduling
/attendance
/shifts
/shift-summary
/staff-performance
/expenses
/financial-reports
/forecasting
/marketing-campaigns
/devices
/hardware-management
/tax-settings
/restricted-items
/price-history
/audit-log
/settings
/subscription
/super-admin
/admin/companies
/admin/plans
/admin/subscriptions
/admin/feature-flags
/admin/usage
/admin/billing

Add sensible aliases/redirects if similar route names are needed.

NOTIFICATIONS
Build an in-app notification center for:
low stock, out of stock, expiring batches, expired batches, recalls, pending approvals, cash variance, subscription expiry, failed payments, online orders, delivery status, supplier events, campaign events.
Email/SMS/WhatsApp notifications use provider adapters and respect consent/settings.

OPEN API / WEBHOOKS
Create a documented integration layer for:
sales, orders, products, inventory, customers, suppliers, subscriptions, delivery, accounting and notifications.
Support outbound webhooks for major events with signing/secrets and retry/idempotency.

IMPORT / EXPORT
Provide CSV import/export for products, customers, suppliers and opening inventory, with validation, preview and error reporting.

SEED / DEMO DATA
Seed a realistic demo tenant with:
multiple stores, warehouse locations, hundreds of products/categories, multiple batches with different expiry dates, suppliers, customers, staff, promotions, sales, online orders, expenses and audit records.
Create demo users for Super Admin, Company Admin, Manager, Cashier, Purchasing, Fulfillment, Driver, Customer and Supplier Portal.
Do not use demo data as a substitute for real database functionality.

TESTING
Add automated tests for:
- tenant isolation/RLS
- RBAC
- FEFO
- UOM conversions
- promotions and stacking
- taxes
- checkout atomicity
- refunds
- stock reservations
- subscription entitlements
- expiry alerts
- offline sync/idempotency
- key order lifecycle
Add E2E smoke coverage for login → POS sale → inventory update → report, and online order → fulfillment → delivery/pickup.
Fix runtime/build/type errors before considering a phase complete.

IMPLEMENTATION STRATEGY
Build in dependency order while keeping the app usable after every phase:
Phase 1: foundation, auth, tenant model, RBAC, database, design system, Super Admin.
Phase 2: products, categories, prices, taxes, warehouses, inventory, batches, FEFO, locations.
Phase 3: POS, checkout, payments, receipts, returns, promotions, loyalty, gift cards, cash shifts.
Phase 4: purchasing, suppliers, transfers, waste, recalls, cycle counts.
Phase 5: customers, online storefront, online orders, pickup, delivery, customer portal.
Phase 6: staff scheduling/attendance, KDS, marketing, expenses, finance.
Phase 7: reporting, forecasting, analytics, AI modules.
Phase 8: billing, plan enforcement, integrations, hardware adapters, offline mode, white-label.
Phase 9: hardening, tests, accessibility, performance, security, documentation and deployment.

Do not stop after creating screens. Each phase must connect UI → server logic → database and include proper loading/error/empty states.

OPTIONAL PREMIUM / FUTURE-READY MODULES
Architect cleanly for:
- white-label branding/custom domain
- advanced AI forecasting
- smart reorder
- AI loss prevention/camera adapter
- AI natural-language analytics assistant
- accounting integrations
- payment terminal integrations
- third-party delivery providers
- advanced loyalty tiers
- recipe/BOM and food-cost management
- multi-country tax packs
- advanced franchise royalty/reporting
These should be feature-flagged and not break the core system.

WHITE-LABEL
Optional paid module: tenant logo, colors, favicon, custom domain, storefront branding, receipt/email branding and custom company name. Platform Super Admin retains control.

PERFORMANCE
Use server-side pagination/filtering for large tables, indexed database columns for tenant/store/product/barcode/order/date lookups, lazy-load large modules, avoid N+1 queries, debounce search, and optimize POS for fast repeated transactions.

DOCUMENTATION
Create a README plus architecture documentation covering:
setup, environment variables, database migrations, auth/RBAC, tenant isolation, feature flags, billing, integrations, offline sync, testing, seed accounts, deployment and operational considerations.
Provide .env.example without real secrets.

DEFINITION OF DONE
The project is only considered complete when:
- A Super Admin can create/invite a company, assign a plan and expiry.
- A company admin can create stores/users/registers and configure feature toggles.
- A cashier can scan/search products, sell fractional quantities, apply valid promotions, take payment, print/share a receipt and have inventory deducted from the correct FEFO batch.
- Managers can approve restricted/sensitive actions.
- Inventory supports batches, expiry, warehouse/shelf locations, transfers, cycle counts, waste and recalls.
- Purchasing supports suppliers, quotations, rate comparison, purchase orders, receiving and returns.
- Customers can use the storefront, place pickup/delivery orders and see order status.
- Staff can work shifts and cash reconciliation.
- Reports reflect actual database transactions.
- Subscription limits/expiry/alerts work.
- Audit logs capture sensitive actions.
- Optional modules can be enabled/disabled cleanly.
- No major page is a fake placeholder, dead button, or hardcoded-only demo.
- Build/type/runtime errors are resolved.

When requirements are ambiguous, make sensible enterprise-grade defaults, keep behavior configurable, and document the assumption. Do not repeatedly ask me to restate requirements. Build the application now, prioritizing a solid foundation and real end-to-end functionality over superficial visual completeness.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a7ee095f-884b-4de7-bdb3-24b72ea1c683).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
