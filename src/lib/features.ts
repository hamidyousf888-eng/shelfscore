/**
 * Feature catalogue for ShelfSmart POS.
 *
 * Core features can never be disabled. Every optional feature is resolved as:
 *   plan entitlement AND effective flag (register override > store override > company default)
 * Resolution happens on the server as well as the client; the client copy is UX only.
 */

export type FeatureKey =
  | "self_checkout"
  | "ai_loss_prevention"
  | "online_store"
  | "delivery"
  | "customer_portal"
  | "supplier_portal"
  | "loyalty"
  | "gift_cards"
  | "house_accounts"
  | "marketing"
  | "kds"
  | "offline_pos"
  | "accounting_sync"
  | "third_party_delivery"
  | "white_label"
  | "advanced_forecasting"
  | "smart_reorder"
  | "barcode_labels"
  | "shift_scheduling"
  | "time_attendance";

export type FeatureDefinition = {
  key: FeatureKey;
  name: string;
  description: string;
  group: "Commerce" | "Operations" | "Intelligence" | "Platform";
  defaultEnabled: boolean;
};

export const FEATURES: FeatureDefinition[] = [
  { key: "online_store", name: "Online storefront", description: "Customer-facing catalog, cart and checkout tied to store stock.", group: "Commerce", defaultEnabled: false },
  { key: "delivery", name: "Delivery management", description: "Zones, fees, driver assignment, routes and proof of delivery.", group: "Commerce", defaultEnabled: false },
  { key: "customer_portal", name: "Customer portal", description: "Order history, loyalty balance and payment links for shoppers.", group: "Commerce", defaultEnabled: true },
  { key: "supplier_portal", name: "Supplier portal", description: "Controlled supplier access to orders, quotes and returns.", group: "Commerce", defaultEnabled: false },
  { key: "loyalty", name: "Loyalty programme", description: "Earn and redeem rules, tiers and manual point adjustments.", group: "Commerce", defaultEnabled: true },
  { key: "gift_cards", name: "Gift cards", description: "Issue, reload, redeem and block gift cards.", group: "Commerce", defaultEnabled: false },
  { key: "house_accounts", name: "House accounts", description: "Customer tabs, credit limits, statements and aging.", group: "Commerce", defaultEnabled: false },
  { key: "self_checkout", name: "Self-checkout", description: "Customer-operated lane with staff assistance workflow.", group: "Operations", defaultEnabled: false },
  { key: "kds", name: "Kitchen display", description: "Station routing and prep queues for prepared food.", group: "Operations", defaultEnabled: false },
  { key: "offline_pos", name: "Offline POS", description: "Queue sales locally and sync when the connection returns.", group: "Operations", defaultEnabled: false },
  { key: "barcode_labels", name: "Barcode label printing", description: "Shelf and product label layouts and printing.", group: "Operations", defaultEnabled: true },
  { key: "shift_scheduling", name: "Shift scheduling", description: "Rosters, shift assignment and trade requests.", group: "Operations", defaultEnabled: false },
  { key: "time_attendance", name: "Time & attendance", description: "Clock in/out, breaks and timesheet approval.", group: "Operations", defaultEnabled: false },
  { key: "marketing", name: "Marketing campaigns", description: "Segments, email/SMS campaigns and coupons.", group: "Intelligence", defaultEnabled: false },
  { key: "ai_loss_prevention", name: "Loss prevention alerts", description: "Explainable rule and anomaly indicators from transaction data.", group: "Intelligence", defaultEnabled: false },
  { key: "advanced_forecasting", name: "Advanced forecasting", description: "Trend and seasonality forecasts with confidence ranges.", group: "Intelligence", defaultEnabled: false },
  { key: "smart_reorder", name: "Smart reorder", description: "Suggested purchase quantities from velocity and lead time.", group: "Intelligence", defaultEnabled: false },
  { key: "accounting_sync", name: "Accounting sync", description: "Push sales, taxes and expenses to an accounting provider.", group: "Platform", defaultEnabled: false },
  { key: "third_party_delivery", name: "Third-party delivery", description: "Sync orders with external delivery marketplaces.", group: "Platform", defaultEnabled: false },
  { key: "white_label", name: "White-label branding", description: "Tenant logo, colors, custom domain and branded receipts.", group: "Platform", defaultEnabled: false },
];

/** Never disableable, regardless of plan or flags. */
export const CORE_CAPABILITIES = [
  "authentication",
  "authorization",
  "tenant_isolation",
  "pos_basic",
  "products",
  "inventory",
] as const;

export const LIMIT_KEYS = ["limit.stores", "limit.users", "limit.registers", "limit.products"] as const;
export type LimitKey = (typeof LIMIT_KEYS)[number];

export type FlagRow = {
  feature_key: string;
  enabled: boolean;
  store_id: string | null;
  register_id: string | null;
};

export type PlanFeatureRow = { feature_key: string; enabled: boolean; limit_value: number | null };

/** Effective feature state: plan entitlement AND the most specific flag override. */
export function resolveFeature(
  key: string,
  planFeatures: PlanFeatureRow[],
  flags: FlagRow[],
  scope: { storeId?: string | null; registerId?: string | null } = {},
): boolean {
  const entitled = planFeatures.find((p) => p.feature_key === key)?.enabled ?? false;
  if (!entitled) return false;

  const byRegister = scope.registerId
    ? flags.find((f) => f.feature_key === key && f.register_id === scope.registerId)
    : undefined;
  if (byRegister) return byRegister.enabled;

  const byStore = scope.storeId
    ? flags.find((f) => f.feature_key === key && f.store_id === scope.storeId && !f.register_id)
    : undefined;
  if (byStore) return byStore.enabled;

  const byCompany = flags.find((f) => f.feature_key === key && !f.store_id && !f.register_id);
  if (byCompany) return byCompany.enabled;

  return FEATURES.find((f) => f.key === key)?.defaultEnabled ?? false;
}

export function planLimit(planFeatures: PlanFeatureRow[], key: LimitKey): number | null {
  const row = planFeatures.find((p) => p.feature_key === key);
  return row?.limit_value ?? null;
}
