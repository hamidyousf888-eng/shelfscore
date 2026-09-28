import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, CreditCard, Gauge, Layers, ToggleRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/super-admin")({
  component: SuperAdminPage,
});

function SuperAdminPage() {
  const tenant = useTenant();

  const stats = useQuery({
    enabled: tenant.isSuperAdmin,
    queryKey: ["platform", "stats"],
    queryFn: async () => {
      const [companies, subs, plans] = await Promise.all([
        supabase.from("companies").select("id, name, status, created_at").order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("id, status, seats, register_count, expires_at, company_id, plans(name, base_price_cents, per_user_price_cents, per_register_price_cents, currency)"),
        supabase.from("plans").select("id").eq("is_active", true),
      ]);
      if (companies.error) throw companies.error;
      if (subs.error) throw subs.error;

      type SubRow = {
        status: string;
        seats: number;
        register_count: number;
        expires_at: string | null;
        company_id: string;
        plans: { name: string; base_price_cents: number; per_user_price_cents: number; per_register_price_cents: number; currency: string } | null;
      };
      const rows = (subs.data ?? []) as unknown as SubRow[];
      const mrr = rows
        .filter((s) => ["active", "trialing", "past_due"].includes(s.status))
        .reduce(
          (sum, s) =>
            sum +
            (s.plans?.base_price_cents ?? 0) +
            (s.plans?.per_user_price_cents ?? 0) * s.seats +
            (s.plans?.per_register_price_cents ?? 0) * s.register_count,
          0,
        );
      const soon = rows.filter((s) => s.expires_at && new Date(s.expires_at).getTime() - Date.now() < 14 * 864e5).length;
      return {
        companies: companies.data ?? [],
        subs: rows,
        planCount: plans.data?.length ?? 0,
        mrr,
        active: rows.filter((s) => s.status === "active").length,
        trialing: rows.filter((s) => s.status === "trialing").length,
        soon,
      };
    },
  });

  if (!tenant.isSuperAdmin) {
    return (
      <div>
        <PageHeader title="Platform administration" />
        <p className="text-muted-foreground text-sm">This area is limited to platform administrators.</p>
      </div>
    );
  }

  const cards = [
    { label: "Monthly recurring revenue", value: stats.data ? money(stats.data.mrr) : "—", icon: CreditCard },
    { label: "Active subscriptions", value: stats.data?.active ?? 0, icon: Layers },
    { label: "Trialing", value: stats.data?.trialing ?? 0, icon: Gauge },
    { label: "Expiring in 14 days", value: stats.data?.soon ?? 0, icon: ToggleRight },
  ];

  return (
    <div>
      <PageHeader
        title="Platform overview"
        description="Subscriber companies, revenue and plan usage across the whole platform."
        breadcrumb={[{ label: "Platform" }, { label: "Overview" }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">{c.label}</CardTitle>
              <c.icon className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              {stats.isLoading ? <Skeleton className="h-8 w-20" /> : <p className="numeric text-3xl font-semibold">{c.value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Newest companies</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (stats.data?.companies ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">No companies yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {(stats.data?.companies ?? []).slice(0, 8).map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="capitalize">
                        {c.status}
                      </Badge>
                      {formatDate(c.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jump to</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {[
              { to: "/admin/companies", label: "Companies & invitations", icon: Building2 },
              { to: "/admin/plans", label: "Plans & entitlements", icon: Layers },
              { to: "/admin/subscriptions", label: "Subscriptions & expiry", icon: CreditCard },
              { to: "/admin/feature-flags", label: "Feature flags", icon: ToggleRight },
              { to: "/admin/usage", label: "Usage meters", icon: Gauge },
              { to: "/admin/billing", label: "Billing & invoices", icon: CreditCard },
            ].map((l) => (
              <Link key={l.to} to={l.to as never} className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-2">
                <l.icon className="text-muted-foreground size-4" />
                {l.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
