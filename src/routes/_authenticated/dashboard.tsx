import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, MonitorSmartphone, Store, ToggleRight, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FEATURES } from "@/lib/features";
import { daysUntil, formatDate, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const tenant = useTenant();
  const navigate = useNavigate();
  const companyId = tenant.company?.id ?? null;

  useEffect(() => {
    if (!tenant.loading && !tenant.company && !tenant.isSuperAdmin) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [tenant.loading, tenant.company, tenant.isSuperAdmin, navigate]);

  const counts = useQuery({
    enabled: !!companyId,
    queryKey: ["dashboard", "counts", companyId],
    queryFn: async () => {
      const [stores, registers, staff, audit] = await Promise.all([
        supabase.from("stores").select("id", { count: "exact", head: true }).eq("company_id", companyId!),
        supabase.from("registers").select("id", { count: "exact", head: true }).eq("company_id", companyId!),
        supabase.from("memberships").select("id", { count: "exact", head: true }).eq("company_id", companyId!).eq("status", "active"),
        supabase
          .from("audit_logs")
          .select("id, action, entity_type, actor_email, created_at")
          .eq("company_id", companyId!)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      return {
        stores: stores.count ?? 0,
        registers: registers.count ?? 0,
        staff: staff.count ?? 0,
        audit: audit.data ?? [],
      };
    },
  });

  if (!tenant.company) {
    if (tenant.isSuperAdmin) {
      return (
        <div>
          <PageHeader title="Platform administrator" description="You are signed in as a platform administrator." />
          <Card>
            <CardContent className="flex flex-wrap gap-3 pt-6">
              <Button asChild>
                <Link to="/super-admin">Open platform overview</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/admin/companies">Manage companies</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/onboarding">Create my own company</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return <Skeleton className="h-64 w-full" />;
  }

  const enabledFeatures = FEATURES.filter((f) => tenant.feature(f.key));
  const expiry = daysUntil(tenant.subscription?.expires_at);

  const cards = [
    { label: "Stores", value: counts.data?.stores ?? 0, limit: tenant.limit("limit.stores"), icon: Store, to: "/stores" },
    { label: "Registers", value: counts.data?.registers ?? 0, limit: tenant.limit("limit.registers"), icon: MonitorSmartphone, to: "/devices" },
    { label: "Team members", value: counts.data?.staff ?? 0, limit: tenant.limit("limit.users"), icon: Users, to: "/staff" },
    { label: "Modules on", value: enabledFeatures.length, limit: FEATURES.length, icon: ToggleRight, to: "/settings" },
  ] as const;

  return (
    <div>
      <PageHeader
        title={tenant.company.name}
        description={`Signed in as ${tenant.roleName ?? "member"} · ${tenant.company.currency} · ${tenant.company.timezone}`}
        actions={
          <Button asChild variant="outline">
            <Link to="/subscription">
              <CreditCard className="size-4" /> Subscription
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="hover:border-primary/40 h-full transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">{c.label}</CardTitle>
                <c.icon className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                {counts.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="numeric text-3xl font-semibold">
                    {c.value}
                    {c.limit ? <span className="text-muted-foreground text-base font-normal"> / {c.limit}</span> : null}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {counts.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (counts.data?.audit ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">No recorded activity yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {(counts.data?.audit ?? []).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="font-medium">{a.action}</span>
                    <span className="text-muted-foreground text-xs">
                      {a.actor_email ?? "system"} · {formatDateTime(a.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{tenant.subscription?.plan?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={tenant.subscription?.status === "active" ? "default" : "secondary"} className="capitalize">
                {tenant.subscription?.status ?? "none"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Expires</span>
              <span>{formatDate(tenant.subscription?.expires_at)}</span>
            </div>
            {expiry !== null ? (
              <p className="text-muted-foreground text-xs">
                {expiry >= 0 ? `${expiry} days remaining` : `Expired ${Math.abs(expiry)} days ago`} · {tenant.subscription?.grace_days}-day grace
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Enabled modules</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {enabledFeatures.length === 0 ? (
            <p className="text-muted-foreground text-sm">No optional modules are switched on for this plan yet.</p>
          ) : (
            enabledFeatures.map((f) => (
              <Badge key={f.key} variant="secondary">
                {f.name}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
