import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { money } from "@/lib/format";
import { FEATURES } from "@/lib/features";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  component: AdminPlans,
});

function AdminPlans() {
  const tenant = useTenant();

  const plans = useQuery({
    enabled: tenant.isSuperAdmin,
    queryKey: ["admin", "plans", "full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, name, slug, description, currency, base_price_cents, per_user_price_cents, per_register_price_cents, trial_days, is_public, is_active, plan_features(feature_key, enabled, limit_value)")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!tenant.isSuperAdmin) {
    return (
      <div>
        <PageHeader title="Plans" />
        <p className="text-muted-foreground text-sm">This area is limited to platform administrators.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Plans & entitlements"
        description="Plans are data, not code: pricing, limits and included modules are stored per plan."
        breadcrumb={[{ label: "Platform" }, { label: "Plans" }]}
      />

      {plans.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {(plans.data ?? []).map((p) => {
            const pf = (p.plan_features ?? []) as { feature_key: string; enabled: boolean; limit_value: number | null }[];
            const limit = (k: string) => pf.find((f) => f.feature_key === k)?.limit_value ?? "—";
            return (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{p.name}</span>
                    <Badge variant={p.is_active ? "secondary" : "outline"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">{p.description}</p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <ul className="text-muted-foreground space-y-1">
                    <li>Platform fee {money(p.base_price_cents, p.currency)}</li>
                    <li>Per user {money(p.per_user_price_cents, p.currency)}</li>
                    <li>Per register {money(p.per_register_price_cents, p.currency)}</li>
                    <li>{p.trial_days}-day trial</li>
                  </ul>
                  <div className="grid grid-cols-2 gap-1 rounded-md border p-3 text-xs">
                    <span>Stores</span><span className="numeric text-right">{limit("limit.stores")}</span>
                    <span>Users</span><span className="numeric text-right">{limit("limit.users")}</span>
                    <span>Registers</span><span className="numeric text-right">{limit("limit.registers")}</span>
                    <span>Products</span><span className="numeric text-right">{limit("limit.products")}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {FEATURES.filter((f) => pf.some((x) => x.feature_key === f.key && x.enabled)).map((f) => (
                      <Badge key={f.key} variant="secondary" className="text-xs">
                        {f.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
