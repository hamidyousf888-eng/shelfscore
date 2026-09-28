import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { daysUntil, formatDate, money } from "@/lib/format";
import { FEATURES } from "@/lib/features";

export const Route = createFileRoute("/_authenticated/subscription")({
  component: SubscriptionPage,
});

type InvoiceRow = {
  id: string;
  number: string;
  amount_cents: number;
  currency: string;
  status: string;
  issued_at: string;
  due_at: string | null;
  provider: string;
};

function SubscriptionPage() {
  const tenant = useTenant();
  const companyId = tenant.company?.id ?? null;
  const sub = tenant.subscription;

  const invoices = useQuery({
    enabled: !!companyId,
    queryKey: ["invoices", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_invoices")
        .select("id, number, amount_cents, currency, status, issued_at, due_at, provider")
        .eq("company_id", companyId!)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InvoiceRow[];
    },
  });

  const columns: Column<InvoiceRow>[] = [
    { id: "number", header: "Invoice", cell: (r) => <span className="numeric">{r.number}</span>, exportValue: (r) => r.number },
    { id: "amount", header: "Amount", cell: (r) => <span className="numeric">{money(r.amount_cents, r.currency)}</span>, sortValue: (r) => r.amount_cents, exportValue: (r) => r.amount_cents / 100 },
    { id: "status", header: "Status", cell: (r) => <Badge variant="outline" className="capitalize">{r.status}</Badge>, exportValue: (r) => r.status },
    { id: "issued", header: "Issued", cell: (r) => formatDate(r.issued_at), sortValue: (r) => r.issued_at, exportValue: (r) => r.issued_at },
    { id: "due", header: "Due", cell: (r) => formatDate(r.due_at), exportValue: (r) => r.due_at ?? "" },
    { id: "provider", header: "Processor", cell: (r) => <span className="capitalize">{r.provider}</span>, exportValue: (r) => r.provider },
  ];

  if (!sub) return <Skeleton className="h-64 w-full" />;

  const remaining = daysUntil(sub.expires_at);
  const included = FEATURES.filter((f) => tenant.feature(f.key));

  return (
    <div>
      <PageHeader
        title="Subscription"
        description="Your plan, entitlements and billing history."
        breadcrumb={[{ label: "Account" }, { label: "Subscription" }]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-2xl font-semibold">{sub.plan?.name ?? "—"}</p>
            <p className="text-muted-foreground">{sub.plan?.description}</p>
            <div className="flex items-center justify-between pt-2">
              <span className="text-muted-foreground">Billing model</span>
              <span className="capitalize">{sub.billing_model.replace("_", " ")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Seats</span>
              <span className="numeric">{sub.seats}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Registers</span>
              <span className="numeric">{sub.register_count}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Badge className="capitalize">{sub.status}</Badge>
            <div className="flex items-center justify-between pt-2">
              <span className="text-muted-foreground">Trial ends</span>
              <span>{formatDate(sub.trial_ends_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Expires</span>
              <span>{formatDate(sub.expires_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Grace period</span>
              <span className="numeric">{sub.grace_days} days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Alert lead time</span>
              <span className="numeric">{sub.alert_lead_days} days</span>
            </div>
            {remaining !== null ? (
              <p className="text-muted-foreground pt-1 text-xs">
                {remaining >= 0 ? `${remaining} days remaining.` : `Expired ${Math.abs(remaining)} days ago.`}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entitlements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(["limit.stores", "limit.users", "limit.registers", "limit.products"] as const).map((k) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-muted-foreground capitalize">{k.replace("limit.", "")}</span>
                <span className="numeric">{tenant.limit(k) ?? "Unlimited"}</span>
              </div>
            ))}
            <div className="flex flex-wrap gap-1.5 pt-2">
              {included.map((f) => (
                <Badge key={f.key} variant="secondary" className="text-xs">
                  {f.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Billing</CardTitle>
          <p className="text-muted-foreground text-sm">
            Payments run through a pluggable billing adapter. While no payment processor credentials are configured this
            workspace uses the built-in mock processor — invoices are recorded but no money moves and no card data is ever
            stored here.
          </p>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={invoices.data ?? []}
            columns={columns}
            loading={invoices.isLoading}
            error={invoices.error ? (invoices.error as Error).message : null}
            exportName="invoices"
            emptyTitle="No invoices yet"
            emptyBody="Invoices appear once your first billing period closes."
          />
        </CardContent>
      </Card>
    </div>
  );
}
