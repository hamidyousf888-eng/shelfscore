import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveFeature, planLimit, type FlagRow, type PlanFeatureRow, type LimitKey } from "@/lib/features";

const ACTIVE_COMPANY_KEY = "shelfsmart.activeCompany";
const ACTIVE_STORE_KEY = "shelfsmart.activeStore";

export type TenantCompany = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  logo_url: string | null;
  status: string;
};

export type TenantStore = { id: string; name: string; code: string; is_active: boolean };

type TenantValue = {
  loading: boolean;
  userId: string | null;
  email: string | null;
  fullName: string | null;
  isSuperAdmin: boolean;
  companies: TenantCompany[];
  company: TenantCompany | null;
  stores: TenantStore[];
  storeId: string | null;
  setStoreId: (id: string | null) => void;
  setCompanyId: (id: string) => void;
  roleKey: string | null;
  roleName: string | null;
  permissions: string[];
  can: (permission: string) => boolean;
  planFeatures: PlanFeatureRow[];
  flags: FlagRow[];
  feature: (key: string) => boolean;
  limit: (key: LimitKey) => number | null;
  subscription: Subscription | null;
  refresh: () => void;
};

export type Subscription = {
  id: string;
  status: string;
  billing_model: string;
  seats: number;
  register_count: number;
  currency: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  expires_at: string | null;
  grace_days: number;
  alert_lead_days: number;
  fixed_alert_enabled: boolean;
  custom_alert_enabled: boolean;
  custom_alert_message: string | null;
  plan: { id: string; name: string; slug: string; base_price_cents: number; per_user_price_cents: number; per_register_price_cents: number } | null;
};

const TenantContext = createContext<TenantValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [companyId, setCompanyIdState] = useState<string | null>(null);
  const [storeId, setStoreIdState] = useState<string | null>(null);

  useEffect(() => {
    setCompanyIdState(localStorage.getItem(ACTIVE_COMPANY_KEY));
    setStoreIdState(localStorage.getItem(ACTIVE_STORE_KEY));
  }, []);

  const session = useQuery({
    queryKey: ["tenant", "session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name, is_super_admin")
        .eq("id", user.id)
        .maybeSingle();
      return {
        userId: user.id,
        email: user.email ?? null,
        fullName: profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? null,
        isSuperAdmin: profile?.is_super_admin ?? false,
      };
    },
  });

  const userId = session.data?.userId ?? null;

  const memberships = useQuery({
    enabled: !!userId,
    queryKey: ["tenant", "memberships", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("id, company_id, store_id, status, roles(id, key, name), companies(id, name, slug, currency, timezone, logo_url, status)")
        .eq("user_id", userId!)
        .eq("status", "active");
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeMembership = useMemo(() => {
    const rows = memberships.data ?? [];
    if (!rows.length) return null;
    return rows.find((r) => r.company_id === companyId) ?? rows[0];
  }, [memberships.data, companyId]);

  const activeCompanyId = activeMembership?.company_id ?? null;

  const permissionsQuery = useQuery({
    enabled: !!activeMembership,
    queryKey: ["tenant", "permissions", activeMembership?.id],
    queryFn: async () => {
      const roleId = (activeMembership as { roles?: { id: string } | null } | null)?.roles?.id;
      if (!roleId) return [];
      const { data, error } = await supabase.from("role_permissions").select("permission_key").eq("role_id", roleId);
      if (error) throw error;
      return (data ?? []).map((r) => r.permission_key);
    },
  });

  const context = useQuery({
    enabled: !!activeCompanyId,
    queryKey: ["tenant", "context", activeCompanyId],
    queryFn: async () => {
      const [storesRes, subRes, flagsRes] = await Promise.all([
        supabase.from("stores").select("id, name, code, is_active").eq("company_id", activeCompanyId!).order("name"),
        supabase
          .from("subscriptions")
          .select(
            "id, status, billing_model, seats, register_count, currency, trial_ends_at, current_period_end, expires_at, grace_days, alert_lead_days, fixed_alert_enabled, custom_alert_enabled, custom_alert_message, plan:plans(id, name, slug, base_price_cents, per_user_price_cents, per_register_price_cents)",
          )
          .eq("company_id", activeCompanyId!)
          .maybeSingle(),
        supabase
          .from("feature_flags")
          .select("feature_key, enabled, store_id, register_id")
          .eq("company_id", activeCompanyId!),
      ]);

      let planFeatures: PlanFeatureRow[] = [];
      const planId = (subRes.data as { plan?: { id: string } | null } | null)?.plan?.id;
      if (planId) {
        const { data } = await supabase
          .from("plan_features")
          .select("feature_key, enabled, limit_value")
          .eq("plan_id", planId);
        planFeatures = (data ?? []) as PlanFeatureRow[];
      }

      return {
        stores: (storesRes.data ?? []) as TenantStore[],
        subscription: (subRes.data ?? null) as Subscription | null,
        flags: (flagsRes.data ?? []) as FlagRow[],
        planFeatures,
      };
    },
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        queryClient.invalidateQueries({ queryKey: ["tenant"] });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const company = (activeMembership as { companies?: TenantCompany | null } | null)?.companies ?? null;
  const role = (activeMembership as { roles?: { key: string; name: string } | null } | null)?.roles ?? null;
  const permissions = permissionsQuery.data ?? [];
  const planFeatures = context.data?.planFeatures ?? [];
  const flags = context.data?.flags ?? [];

  const value: TenantValue = {
    loading: session.isLoading || memberships.isLoading || (!!activeCompanyId && context.isLoading),
    userId,
    email: session.data?.email ?? null,
    fullName: session.data?.fullName ?? null,
    isSuperAdmin: session.data?.isSuperAdmin ?? false,
    companies: (memberships.data ?? [])
      .map((m) => (m as { companies?: TenantCompany | null }).companies)
      .filter(Boolean) as TenantCompany[],
    company,
    stores: context.data?.stores ?? [],
    storeId,
    setStoreId: (id) => {
      setStoreIdState(id);
      if (id) localStorage.setItem(ACTIVE_STORE_KEY, id);
      else localStorage.removeItem(ACTIVE_STORE_KEY);
    },
    setCompanyId: (id) => {
      setCompanyIdState(id);
      localStorage.setItem(ACTIVE_COMPANY_KEY, id);
      setStoreIdState(null);
      localStorage.removeItem(ACTIVE_STORE_KEY);
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
    },
    roleKey: role?.key ?? (session.data?.isSuperAdmin ? "super_admin" : null),
    roleName: role?.name ?? (session.data?.isSuperAdmin ? "Super Admin" : null),
    permissions,
    can: (permission) =>
      (session.data?.isSuperAdmin ?? false) || permissions.includes("*") || permissions.includes(permission),
    planFeatures,
    flags,
    feature: (key) => resolveFeature(key, planFeatures, flags, { storeId }),
    limit: (key) => planLimit(planFeatures, key),
    subscription: context.data?.subscription ?? null,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["tenant"] }),
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used inside TenantProvider");
  return ctx;
}
